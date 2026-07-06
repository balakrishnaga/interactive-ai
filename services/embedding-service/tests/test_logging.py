"""Tests verifying logging behavior across the embedding service.

These tests use pytest's ``caplog`` fixture to assert that the application
emits expected log records without making real network calls or external
dependencies.
"""

import logging
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.main import app
from app.services.document_processor import DocumentProcessor
from app.services.evaluator import evaluator_service
from app.services.llm_service import LLMService


client = TestClient(app)


class _FakeDocument:
    """Stand-in for a LangChain Document with the attributes process_pdf reads."""

    def __init__(self, page_content: str, page: int = 0) -> None:
        self.page_content = page_content
        self.metadata = {"page": page}


class _RaisingLLM:
    """Fake LLM whose ``chat`` always raises."""

    async def chat(self, messages):
        raise RuntimeError("simulated LLM failure")


class _FakeScoringLLM:
    """Fake LLM returning valid JSON scores for evaluator prompts."""

    async def chat(self, messages):
        text = messages[0]["content"]
        if "contradiction" in text:
            return '{"contradiction": false}'
        if "supported" in text and "Context:" in text:
            return '{"supported": 2, "unsupported": 1}'
        if "correctness" in text:
            return '{"score": 8}'
        if "coherence" in text:
            return '{"score": 7}'
        if "relevancy" in text.lower() or "relevant" in text.lower():
            return '{"score": 9}'
        return '{"score": 5}'


def test_health_check_logs_info(caplog):
    """GET /health should emit an INFO log containing 'Health check'."""
    caplog.set_level(logging.DEBUG)
    response = client.get("/health")

    assert response.status_code == 200
    info_records = [
        r for r in caplog.records
        if r.levelno == logging.INFO and "Health check" in r.getMessage()
    ]
    assert info_records, (
        "Expected an INFO log containing 'Health check'; got: "
        + repr([(r.levelname, r.getMessage()) for r in caplog.records])
    )


def test_llm_service_warns_missing_api_key(monkeypatch, caplog):
    """LLMService should log a WARNING when HF_API_KEY is not set."""
    monkeypatch.delenv("HF_API_KEY", raising=False)
    caplog.set_level(logging.DEBUG)

    LLMService()

    warning_records = [
        r for r in caplog.records
        if r.levelno == logging.WARNING and "HF_API_KEY" in r.getMessage()
    ]
    assert warning_records, (
        "Expected a WARNING log mentioning HF_API_KEY; got: "
        + repr([(r.levelname, r.getMessage()) for r in caplog.records])
    )


@pytest.mark.asyncio
async def test_evaluator_logs_exception_on_llm_failure(caplog):
    """Evaluator LLM-judge methods should log a WARNING with exc_info when the LLM raises."""
    caplog.set_level(logging.DEBUG)

    await evaluator_service.evaluate("q", "r", [], _RaisingLLM())

    warning_records = [
        r for r in caplog.records
        if r.levelno == logging.WARNING and r.exc_info is not None
    ]
    assert warning_records, (
        "Expected a WARNING log with exc_info; got: "
        + repr([(r.levelname, r.getMessage(), r.exc_info) for r in caplog.records])
    )
    # The log message should reference an LLM-call failure on a judge method.
    assert any("LLM call failed" in r.getMessage() for r in warning_records), (
        "Expected a WARNING message containing 'LLM call failed'; got: "
        + repr([r.getMessage() for r in warning_records])
    )


@pytest.mark.asyncio
async def test_evaluator_evaluate_logs_entry_and_completion(caplog):
    """evaluator.evaluate should log INFO 'evaluate called' and 'evaluate completed'."""
    caplog.set_level(logging.DEBUG)

    await evaluator_service.evaluate("q", "r", [], _FakeScoringLLM())

    info_messages = [r.getMessage() for r in caplog.records if r.levelno == logging.INFO]
    assert any("evaluate called" in m for m in info_messages), (
        "Expected an INFO log containing 'evaluate called'; got: " + repr(info_messages)
    )
    assert any("evaluate completed" in m for m in info_messages), (
        "Expected an INFO log containing 'evaluate completed'; got: " + repr(info_messages)
    )


def test_process_pdf_logs_chunks_produced(caplog):
    """process_pdf should emit an INFO log containing the produced chunk count."""
    caplog.set_level(logging.DEBUG)

    fake_chunks = [
        _FakeDocument("chunk 1 content", page=0),
        _FakeDocument("chunk 2 content", page=0),
        _FakeDocument("chunk 3 content", page=1),
    ]
    expected_count = len(fake_chunks)

    with patch("app.services.document_processor.PyPDFLoader") as MockLoader, \
            patch.object(
                RecursiveCharacterTextSplitter,
                "split_documents",
                return_value=fake_chunks,
            ):
        MockLoader.return_value.load.return_value = []
        processor = DocumentProcessor()
        result = processor.process_pdf(b"fake bytes", "test.pdf")

    assert len(result) == expected_count

    info_records = [
        r for r in caplog.records
        if r.levelno == logging.INFO
        and "chunks" in r.getMessage().lower()
        and str(expected_count) in r.getMessage()
    ]
    assert info_records, (
        "Expected an INFO log containing the chunk count; got: "
        + repr([(r.levelname, r.getMessage()) for r in caplog.records])
    )
