import logging
import os
from typing import Dict, Any

from pymongo import MongoClient

from app.services.embedding import embedding_service
from app.services.reranker import reranker_service

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
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]))
        except Exception as e:
            logger.warning(
                "MongoDB aggregation failed (index=%s): %s", index_name, e
            )
            raise

        initial_chunks = [
            {
                "text": r["text"],
                "metadata": r["metadata"],
                "vector_score": float(r["score"])
            }
            for r in results
        ]
        logger.debug("retrieve initial_chunks=%d", len(initial_chunks))

        if rerank:
            reranked_chunks = reranker_service.rerank(query, initial_chunks)
            logger.info("reranker used")
        else:
            reranked_chunks = initial_chunks
            logger.info("reranker skipped (rerank=False)")

        return {
            "query": query,
            "query_embedding": query_embedding,
            "top_k": top_k,
            "initial_chunks": initial_chunks,
            "reranked_chunks": reranked_chunks,
            "reranker_used": rerank and reranker_service.model is not None,
        }


retriever_service = RetrieverService()
