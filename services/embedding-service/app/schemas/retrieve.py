from pydantic import BaseModel
from typing import List, Optional


class ChunkMetadata(BaseModel):
    filename: str
    pageIndex: int
    chunkIndex: int


class RetrievedChunk(BaseModel):
    text: str
    metadata: ChunkMetadata
    vector_score: float
    rerank_score: Optional[float] = None


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
