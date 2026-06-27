from unittest.mock import MagicMock, patch

import pytest

from app.services.reranker import RerankerService


@pytest.fixture
def service():
    return RerankerService()


def test_rerank_empty_chunks(service):
    assert service.rerank("q", []) == []


def test_rerank_missing_text_key(service):
    with patch.object(service, "model", MagicMock()):
        with pytest.raises(ValueError):
            service.rerank("q", [{"metadata": {}}])


def test_rerank_normal(service):
    service.model = MagicMock()
    service.model.predict.return_value = [0.5, 0.9]
    chunks = [
        {
            "text": "b",
            "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 0},
            "vector_score": 0.8,
        },
        {
            "text": "a",
            "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 1},
            "vector_score": 0.9,
        },
    ]
    result = service.rerank("q", chunks)
    assert result[0]["text"] == "a"
    assert result[0]["rerank_score"] == 0.9
    assert result[1]["text"] == "b"
    assert result[1]["rerank_score"] == 0.5
    assert all("rerank_score" in c for c in result)


def test_rerank_model_load_failure_returns_unchanged(service):
    chunks = [
        {"text": "a", "metadata": {}},
        {"text": "b", "metadata": {}},
    ]
    with patch.object(service, "_ensure_model", return_value=False):
        result = service.rerank("q", chunks)
    assert result == chunks
    assert all("rerank_score" not in c for c in result)


def test_rerank_score_count_mismatch_raises(service):
    service.model = MagicMock()
    service.model.predict.return_value = [0.5]
    chunks = [
        {"text": "a", "metadata": {}},
        {"text": "b", "metadata": {}},
    ]
    with pytest.raises(RuntimeError):
        service.rerank("q", chunks)
