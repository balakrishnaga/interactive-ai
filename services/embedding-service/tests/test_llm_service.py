from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.llm_service import LLMService


def _build_mock_client(content: str = "hi back"):
    """Build a mock AsyncGroq client whose .chat.completions.create is an awaitable."""
    client = MagicMock()
    completion = MagicMock()
    completion.choices = [MagicMock()]
    completion.choices[0].message.content = content

    create_mock = AsyncMock(return_value=completion)
    client.chat.completions.create = create_mock
    return client, create_mock, completion


@pytest.mark.asyncio
async def test_chat_uses_async_groq_chat_completions(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-token")
    monkeypatch.setenv("GROQ_MODEL", "meta-llama/Llama-3.1-8B-Instruct")

    client, create_mock, _completion = _build_mock_client("assistant reply")

    with patch(
        "app.services.llm_service.AsyncGroq", return_value=client
    ) as client_cls:
        llm_service = LLMService()
        result = await llm_service.chat([{"role": "user", "content": "hello"}])

    # AsyncGroq was constructed once with the right api_key
    client_cls.assert_called_once_with(api_key="test-token")

    # chat.completions.create was awaited with the expected kwargs
    create_mock.assert_awaited_once()
    call_kwargs = create_mock.call_args.kwargs
    assert call_kwargs["model"] == "meta-llama/Llama-3.1-8B-Instruct"
    assert call_kwargs["messages"] == [{"role": "user", "content": "hello"}]
    assert call_kwargs["max_tokens"] == 512
    assert call_kwargs["temperature"] == 0.7

    # Returned the assistant content string
    assert result == "assistant reply"


@pytest.mark.asyncio
async def test_chat_passes_through_multiple_messages(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-token")
    monkeypatch.setenv("GROQ_MODEL", "meta-llama/Llama-3.1-8B-Instruct")

    client, create_mock, _ = _build_mock_client("ok")
    messages = [
        {"role": "system", "content": "be helpful"},
        {"role": "user", "content": "hi"},
    ]

    with patch("app.services.llm_service.AsyncGroq", return_value=client):
        llm_service = LLMService()
        await llm_service.chat(messages)

    create_mock.assert_awaited_once()
    assert create_mock.call_args.kwargs["messages"] == messages


def test_api_key_warning_logged_when_missing(monkeypatch, caplog):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
    caplog.set_level("WARNING", logger="app.services.llm_service")

    with patch("app.services.llm_service.AsyncGroq"):
        LLMService()

    warning_records = [r for r in caplog.records if r.levelname == "WARNING"]
    assert any("GROQ_API_KEY is not set" in r.getMessage() for r in warning_records), (
        "Expected a WARNING log containing 'GROQ_API_KEY is not set'; got: "
        + repr([(r.levelname, r.getMessage()) for r in caplog.records])
    )


@pytest.mark.asyncio
async def test_chat_error_logged_and_reraised(monkeypatch, caplog):
    monkeypatch.setenv("GROQ_API_KEY", "test-token")
    monkeypatch.setenv("GROQ_MODEL", "meta-llama/Llama-3.1-8B-Instruct")

    client = MagicMock()
    client.chat.completions.create = AsyncMock(side_effect=RuntimeError("boom"))

    with patch("app.services.llm_service.AsyncGroq", return_value=client):
        llm_service = LLMService()

        with caplog.at_level("ERROR", logger="app.services.llm_service"):
            with pytest.raises(RuntimeError, match="boom"):
                await llm_service.chat([{"role": "user", "content": "hello"}])

    error_records = [r for r in caplog.records if r.levelname == "ERROR"]
    assert error_records, (
        "Expected an ERROR log for chat completion failure; got: "
        + repr([(r.levelname, r.getMessage()) for r in caplog.records])
    )
    assert any("chat completion failed: boom" in r.getMessage() for r in error_records), (
        "Expected an ERROR log containing 'chat completion failed: boom'; got: "
        + repr([r.getMessage() for r in error_records])
    )
