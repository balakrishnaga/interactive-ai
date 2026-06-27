import os
from typing import Dict, Any
from pymongo import MongoClient
from app.services.embedding import embedding_service
from app.services.reranker import reranker_service

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "interactive-ai")


class RetrieverService:
    def __init__(self):
        self.client = MongoClient(MONGODB_URI)
        self.db = self.client[MONGODB_DB]

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        rerank: bool = True,
        index_name: str = "vector_index"
    ) -> Dict[str, Any]:
        query_embedding = embedding_service.generate_embedding(query)
        collection = self.db["vectors"]

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

        initial_chunks = [
            {
                "text": r["text"],
                "metadata": r["metadata"],
                "vector_score": float(r["score"])
            }
            for r in results
        ]

        reranked_chunks = (
            reranker_service.rerank(query, initial_chunks)
            if rerank else initial_chunks
        )

        return {
            "query": query,
            "query_embedding": query_embedding,
            "top_k": top_k,
            "initial_chunks": initial_chunks,
            "reranked_chunks": reranked_chunks,
            "reranker_used": rerank and reranker_service.model is not None
        }


retriever_service = RetrieverService()
