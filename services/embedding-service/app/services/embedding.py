from sentence_transformers import SentenceTransformer

class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer("BAAI/bge-small-en-v1.5")

    def generate_embedding(self, text: str | list[str]):
        return self.model.encode(text).tolist()

embedding_service = EmbeddingService()
