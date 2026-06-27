from pydantic import BaseModel
from typing import List
from app.schemas.retrieve import RetrievedChunk


class EvaluateRequest(BaseModel):
    query: str
    response: str
    chunks: List[RetrievedChunk]


class EvaluateResponse(BaseModel):
    recall: float
    precision: float
    groundedness: float
    faithfulness: float
