import logging
from typing import List, Dict, Any, Optional

from sentence_transformers import CrossEncoder

logger = logging.getLogger(__name__)


class RerankerService:
    def __init__(self, model_name: str = "BAAI/bge-reranker-base"):
        self.model_name = model_name
        self.model: Optional[CrossEncoder] = None

    def _ensure_model(self) -> bool:
        """Lazily load the CrossEncoder model on first use.

        Returns True if the model is ready, False if it failed to load.
        """
        if self.model is not None:
            return True
        try:
            self.model = CrossEncoder(self.model_name)
        except Exception as e:
            logger.warning(
                "Failed to load reranker %s: %s", self.model_name, e
            )
            self.model = None
            return False
        return True

    def rerank(
        self, query: str, chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        if not chunks:
            return chunks
        if any("text" not in chunk for chunk in chunks):
            raise ValueError("All chunks must contain a 'text' key")
        if not self._ensure_model():
            return chunks
        assert self.model is not None
        pairs = [(query, chunk["text"]) for chunk in chunks]
        scores = self.model.predict(pairs, batch_size=8)
        if len(scores) != len(chunks):
            raise RuntimeError(
                f"Score count mismatch: expected {len(chunks)}, "
                f"got {len(scores)}"
            )
        scored = [
            {**chunk, "rerank_score": float(score)}
            for chunk, score in zip(chunks, scores)
        ]
        return sorted(scored, key=lambda x: x["rerank_score"], reverse=True)


reranker_service = RerankerService()
