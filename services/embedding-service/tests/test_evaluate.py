import pytest
from app.services.evaluator import evaluator_service
from app.schemas.evaluate import EvaluateResponse


class FakeLLM:
    async def chat(self, messages):
        text = messages[0]["content"]
        if "supported" in text and "Context:\n\n\nQuery:" in text:
            return '{"supported": 0, "unsupported": 0}'
        if "supported" in text:
            return '{"supported": 2, "unsupported": 1}'
        if "correctness" in text:
            return '{"score": 8}'
        if "coherence" in text:
            return '{"score": 7}'
        if "relevancy" in text.lower() or "relevant" in text.lower():
            return '{"score": 9}'
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
        FakeLLM(),
        reference_answer="You can refund within 30 days."
    )
    assert 0 <= metrics["recall"] <= 1
    assert metrics["precision"] == pytest.approx(0.95, rel=1e-3)
    assert metrics["groundedness"] == pytest.approx(2/3, rel=1e-3)
    assert metrics["faithfulness"] == 1.0
    assert metrics["mean_reciprocal_rank"] == 1.0
    assert metrics["answer_correctness"] == 0.8
    assert metrics["response_coherence"] == 0.7
    assert metrics["hallucination_rate"] == pytest.approx(1/3, rel=1e-3)
    assert metrics["rouge_1"] == pytest.approx(0.8333333333333334, rel=1e-3)
    assert metrics["rouge_2"] == pytest.approx(0.6, rel=1e-3)
    assert metrics["rouge_l"] == pytest.approx(0.8333333333333334, rel=1e-3)
    assert metrics["bleu"] == pytest.approx(0.25406637407730737, rel=1e-3)
    assert metrics["bertscore"] == pytest.approx(0.9906801581382751, rel=1e-2)
    assert metrics["answer_relevancy"] == pytest.approx(0.9, rel=1e-3)
    assert metrics["context_relevancy"] == pytest.approx(0.5, rel=1e-3)
    assert metrics["hit_rate"] == 1.0


@pytest.mark.asyncio
async def test_evaluate_empty_chunks():
    metrics = await evaluator_service.evaluate("q", "r", [], FakeLLM())
    assert metrics["recall"] == 0.0
    assert metrics["precision"] == 0.0
    assert metrics["groundedness"] == 0.0
    assert metrics["faithfulness"] == 1.0
    assert metrics["mean_reciprocal_rank"] == 0.0
    assert metrics["context_precision"] == 0.0
    assert metrics["context_recall"] == 0.0
    assert metrics["context_relevancy"] == 0.0
    assert metrics["hit_rate"] == 0.0
    assert metrics["answer_correctness"] == 0.0
    assert metrics["rouge_1"] == 0.0
    assert metrics["rouge_2"] == 0.0
    assert metrics["rouge_l"] == 0.0
    assert metrics["bleu"] == 0.0
    assert metrics["bertscore"] == 0.0


@pytest.mark.asyncio
async def test_evaluate_without_reference_answer():
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
        FakeLLM(),
        reference_answer=None
    )
    assert metrics["answer_correctness"] == 0.0
    assert metrics["rouge_1"] == 0.0
    assert metrics["rouge_2"] == 0.0
    assert metrics["rouge_l"] == 0.0
    assert metrics["bleu"] == 0.0
    assert metrics["bertscore"] == 0.0


def test_evaluate_response_defaults():
    response = EvaluateResponse()
    for field_name, field_info in EvaluateResponse.model_fields.items():
        assert getattr(response, field_name) == 0.0
