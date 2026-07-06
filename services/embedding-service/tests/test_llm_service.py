from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.llm_service import LLMService


def _build_mock_client(content: str = "hi back"):
    """Build a mock AsyncInferenceClient whose .chat.completions.create returns an awaitable."""
    client = MagicMock()
    completion = MagicMock()
    completion.choices = [MagicMock()]
    completion.choices[0].message.content = content

    create_mock = AsyncMock(return_value=completion)
    client.chat.completions.create = create_mock
    return client, create_mock, completion


@pytest.mark.asyncio
async def test_chat_uses_async_inference_client_chat_completions(monkeypatch):
    monkeypatch.setenv("HF_API_KEY", "test-token")
    monkeypatch.setenv("HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct")

    client, create_mock, _completion = _build_mock_client("assistant reply")

    with patch("app.services.llm_service.AsyncInferenceClient", return_value=client) as client_cls:
        llm_service = LLMService()
        result = await llm_service.chat([{"role": "user", "content": "hello"}])

    # AsyncInferenceClient was constructed with the right model and token
    client_cls.assert_called_once()
    call_kwargs = client_cls.call_args.kwargs
    assert call_kwargs["model"] == "meta-llama/Llama-3.1-8B-Instruct"
    assert call_kwargs["token"] == "test-token"

    # chat.completions.create was awaited with the user messages and our params
    create_mock.assert_awaited_once()
    call_kwargs = create_mock.call_args.kwargs
    assert call_kwargs["messages"] == [{"role": "user", "content": "hello"}]
    assert call_kwargs["max_tokens"] == 512
    assert call_kwargs["temperature"] == 0.7

    # Returned the assistant content string
    assert result == "assistant reply"


@pytest.mark.asyncio
async def test_chat_passes_through_multiple_messages(monkeypatch):
    monkeypatch.setenv("HF_API_KEY", "k")
    monkeypatch.setenv("HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct")

    client, create_mock, _ = _build_mock_client("ok")
    messages = [
        {"role": "system", "content": "be helpful"},
        {"role": "user", "content": "hi"},
    ]

    with patch("app.services.llm_service.AsyncInferenceClient", return_value=client):
        llm_service = LLMService()
        await llm_service.chat(messages)

    create_mock.assert_awaited_once()
    assert create_mock.call_args.kwargs["messages"] == messages
