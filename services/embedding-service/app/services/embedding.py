import logging

from sentence_transformers import SentenceTransformer  # type: ignore

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer("BAAI/bge-small-en-v1.5")
        logger.info("Embedding model loaded: %s", "BAAI/bge-small-en-v1.5")

    def generate_embedding(self, text: str | list[str]):
        logger.info("generate_embedding called")
        if isinstance(text, str):
            logger.debug("input type=str length=%d", len(text))
        elif isinstance(text, list):
            logger.debug("input type=list length=%d", len(text))
        else:
            logger.debug("input type=%s", type(text).__name__)
        return self.model.encode(text).tolist()


embedding_service = EmbeddingService()
