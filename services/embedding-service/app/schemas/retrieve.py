from pydantic import BaseModel
from typing import List, Optional
from app.schemas.guardrails import GuardrailResult
from app.schemas.chunks import RetrievedChunk


class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5
    rerank: bool = True


class RetrieveResponse(BaseModel):
    query: str
    query_embedding: List[float]
    top_k: int
    initial_chunks: List[RetrievedChunk]
    reranked_chunks: List[RetrievedChunk]
    reranker_used: bool
    guardrails: GuardrailResult
