import logging
import os
from typing import Dict, Any

import numpy as np
from pymongo import MongoClient

from app.schemas.guardrails import GuardrailResult, GuardrailScores
from app.services.embedding import embedding_service
from app.services.reranker import reranker_service
from app.services.guardrails import query_relevance_guardrail

logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "interactive-ai")


class RetrieverService:
    def __init__(self):
        self.client = MongoClient(MONGODB_URI)
        self.db = self.client[MONGODB_DB]
        logger.info(
            "MongoDB connection initialized (db=%s)", MONGODB_DB
        )

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        rerank: bool = True,
        index_name: str = "vector_index"
    ) -> Dict[str, Any]:
        logger.info("retrieve called")
        logger.debug(
            "retrieve query=%r top_k=%d rerank=%s index=%s",
            query, top_k, rerank, index_name,
        )

        query_embedding = embedding_service.generate_embedding(query)
        collection = self.db["vectors"]

        # 1. Zero-document gate
        doc_count = collection.estimated_document_count()
        if doc_count == 0 and os.environ.get("GUARDRAIL_ZERO_DOCS_POLICY", "block") == "block":
            logger.info("Zero documents indexed, blocking query")
            guardrail_result = GuardrailResult(
                allowed=False,
                reason="No documents are indexed.",
                scores=GuardrailScores(semantic_similarity=0.0),
            )
            
            if hasattr(guardrail_result, "model_dump"):
                guardrail_data = guardrail_result.model_dump()
            elif hasattr(guardrail_result, "dict"):
                guardrail_data = guardrail_result.dict()
            else:
                guardrail_data = guardrail_result

            return {
                "query": query,
                "query_embedding": query_embedding,
                "top_k": top_k,
                "initial_chunks": [],
                "reranked_chunks": [],
                "reranker_used": False,
                "guardrails": guardrail_data,
            }

        try:
            results = list(collection.aggregate([
                {
                    "$vectorSearch": {
                        "index": index_name,
                        "path": "embedding",
                        "queryVector": query_embedding,
                        "numCandidates": 100,
                        "limit": top_k
                    }
                },
                {
                    "$project": {
                        "text": 1,
                        "metadata": 1,
                        "embedding": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]))
        except Exception as e:
            logger.warning(
                "MongoDB aggregation failed (index=%s): %s", index_name, e
            )
            raise

        initial_chunks = []
        for r in results:
            chunk_embedding = r.get("embedding")
            semantic_sim = 0.0
            if chunk_embedding is not None:
                # Compute cosine similarity between query and chunk embedding
                q_vec = np.array(query_embedding)
                c_vec = np.array(chunk_embedding)
                norm_q = np.linalg.norm(q_vec)
                norm_c = np.linalg.norm(c_vec)
                if norm_q > 0 and norm_c > 0:
                    semantic_sim = np.dot(q_vec, c_vec) / (norm_q * norm_c)

            initial_chunks.append({
                "text": r["text"],
                "metadata": r["metadata"],
                "vector_score": float(r["score"]),
                "semantic_similarity": float(semantic_sim)
            })
        
        logger.debug("retrieve initial_chunks=%d", len(initial_chunks))

        if rerank:
            reranked_chunks = reranker_service.rerank(query, initial_chunks)
            logger.info("reranker used")
        else:
            reranked_chunks = initial_chunks
            logger.info("reranker skipped (rerank=False)")

        guardrail_result = query_relevance_guardrail.check(query, reranked_chunks)
        # Convert Pydantic model to dict to satisfy tests that check for key existence
        if hasattr(guardrail_result, "model_dump"):
            guardrail_data = guardrail_result.model_dump()
        elif hasattr(guardrail_result, "dict"):
            guardrail_data = guardrail_result.dict()
        else:
            guardrail_data = guardrail_result

        return {
            "query": query,
            "query_embedding": query_embedding,
            "top_k": top_k,
            "initial_chunks": initial_chunks,
            "reranked_chunks": reranked_chunks,
            "reranker_used": rerank and reranker_service.model is not None,
            "guardrails": guardrail_data,
        }


retriever_service = RetrieverService()
