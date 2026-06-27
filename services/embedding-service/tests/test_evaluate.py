import pytest
from app.services.evaluator import evaluator_service


class FakeLLM:
    async def chat(self, messages):
        text = messages[0]["content"]
        # Groundedness prompt + empty context: no claims can be supported.
        if "supported" in text and "Context:\n\n\nQuery:" in text:
            return '{"supported": 0, "unsupported": 0}'
        if "supported" in text:
            return '{"supported": 2, "unsupported": 1}'
        return '{"contradiction": false}'


@pytest.mark.asyncio
async def test_evaluate():
    chunks = [
        {
            "text": "Refund within 30 days.",
            "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 0},
            "vector_score": 0.9,
            "rerank_score": 0.95
        }
    ]
    metrics = await evaluator_service.evaluate(
        "refund policy?",
        "You can refund in 30 days.",
        chunks,
        FakeLLM()
    )
    assert 0 <= metrics["recall"] <= 1
    assert metrics["precision"] == pytest.approx(0.95, rel=1e-3)
    assert metrics["groundedness"] == pytest.approx(2/3, rel=1e-3)
    assert metrics["faithfulness"] == 1.0


@pytest.mark.asyncio
async def test_evaluate_empty_chunks():
    metrics = await evaluator_service.evaluate("q", "r", [], FakeLLM())
    assert metrics["recall"] == 0.0
    assert metrics["precision"] == 0.0
    assert metrics["groundedness"] == 0.0
    assert metrics["faithfulness"] == 1.0
