import logging
import os

from dotenv import load_dotenv
from huggingface_hub import AsyncInferenceClient  # type: ignore

load_dotenv()

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.model_id = os.getenv("HF_MODEL", "meta-llama/Llama-3.2-3B-Instruct")
        self.api_key = os.getenv("HF_API_KEY")

        if not self.api_key:
            logger.warning("HF_API_KEY is not set")

        self.client = AsyncInferenceClient(
            model=self.model_id,
            token=self.api_key,
        )
        logger.info("LLM client created (model=%s)", self.model_id)

    async def chat(self, messages):
        """
        Processes a list of messages and returns the assistant's response.
        Messages is a list of dicts with 'role' and 'content'.
        """
        logger.info("chat called")
        logger.debug("chat message_count=%d", len(messages))
        try:
            completion = await self.client.chat.completions.create(
                messages=messages,
                max_tokens=512,
                temperature=0.7,
            )
        except Exception as e:
            logger.error("chat completion failed: %s", e)
            raise
        return completion.choices[0].message.content


llm_service = LLMService()
