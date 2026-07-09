import pytest
from unittest.mock import patch, MagicMock
from app.services.retriever import RetrieverService


@pytest.fixture
def retriever():
    return RetrieverService()


def test_retrieve_without_rerank(retriever):
    mock_collection = MagicMock()
    mock_collection.aggregate.return_value = [
        {
            "text": "chunk one",
            "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 0},
            "score": 0.9
        }
    ]
    retriever.db = {"vectors": mock_collection}

    with patch("app.services.retriever.embedding_service") as mock_emb, \
         patch("app.services.retriever.reranker_service") as mock_rerank:
        mock_emb.generate_embedding.return_value = [0.1] * 384
        mock_rerank.rerank.return_value = []
        mock_rerank.model = None

        result = retriever.retrieve("query", top_k=1, rerank=False)

    assert result["query"] == "query"
    assert result["top_k"] == 1
    assert len(result["initial_chunks"]) == 1
    assert result["reranker_used"] is False
    assert "guardrails" in result
    assert "allowed" in result["guardrails"]


def test_retrieve_empty_results(retriever):
    mock_collection = MagicMock()
    mock_collection.aggregate.return_value = []
    retriever.db = {"vectors": mock_collection}

    with patch("app.services.retriever.embedding_service") as mock_emb, \
         patch("app.services.retriever.reranker_service") as mock_rerank:
        mock_emb.generate_embedding.return_value = [0.1] * 384
        mock_rerank.rerank.return_value = []
        mock_rerank.model = None

        result = retriever.retrieve("query", top_k=5, rerank=True)

    assert result["initial_chunks"] == []
    assert result["reranked_chunks"] == []
    assert result["reranker_used"] is False
