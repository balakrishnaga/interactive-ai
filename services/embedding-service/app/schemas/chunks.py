from pydantic import BaseModel
from typing import Optional


class ChunkMetadata(BaseModel):
    filename: str
    pageIndex: int
    chunkIndex: int


class RetrievedChunk(BaseModel):
    text: str
    metadata: ChunkMetadata
    vector_score: float
    rerank_score: Optional[float] = None
