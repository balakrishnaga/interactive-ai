from pydantic import BaseModel
from typing import List, Optional
from app.schemas.retrieve import RetrievedChunk


class EvaluateRequest(BaseModel):
    query: str
    response: str
    chunks: List[RetrievedChunk]
    reference_answer: Optional[str] = None


class EvaluateResponse(BaseModel):
    # Retriever metrics
    context_precision: float = 0.0
    context_recall: float = 0.0
    context_relevancy: float = 0.0
    contextual_relevancy: float = 0.0
    hit_rate: float = 0.0
    mean_reciprocal_rank: float = 0.0

    # Generation metrics
    faithfulness: float = 0.0
    answer_relevancy: float = 0.0
    answer_correctness: float = 0.0
    rouge_1: float = 0.0
    rouge_2: float = 0.0
    rouge_l: float = 0.0
    bleu: float = 0.0
    bertscore: float = 0.0

    # End-to-end / advanced metrics
    groundedness: float = 0.0
    hallucination_rate: float = 0.0
    response_coherence: float = 0.0

    # Canonical aliases kept for callers expecting the original names
    recall: float = 0.0
    precision: float = 0.0
