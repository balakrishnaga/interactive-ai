from pydantic import BaseModel
from typing import List, Optional
from app.schemas.chunks import RetrievedChunk


class GuardrailScores(BaseModel):
    max_vector_score: float = 0.0
    avg_top_score: float = 0.0
    chunks_above_threshold: int = 0
    context_relevancy: float = 0.0
    semantic_similarity: Optional[float] = None
    groundedness: Optional[float] = None
    faithfulness: Optional[float] = None


class GuardrailResult(BaseModel):
    allowed: bool
    reason: Optional[str] = None
    scores: GuardrailScores


class GuardrailsCheckRequest(BaseModel):
    query: str
    response: Optional[str] = None
    chunks: List[RetrievedChunk] = []


class GuardrailsQueryRequest(BaseModel):
    query: str
