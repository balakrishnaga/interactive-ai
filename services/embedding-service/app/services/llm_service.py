import logging
import os

from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.model_id = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
        self.api_key = os.getenv("GROQ_API_KEY")

        if not self.api_key:
            logger.warning("GROQ_API_KEY is not set")

        self.client = AsyncGroq(api_key=self.api_key)
        logger.info("LLM client created (model=%s)", self.model_id)

    async def chat(self, messages):
        logger.info("chat called")
        logger.debug("chat message_count=%d", len(messages))
        try:
            completion = await self.client.chat.completions.create(
                model=self.model_id,
                messages=messages,
                max_tokens=512,
                temperature=0.7,
            )
        except Exception as e:
            logger.error("chat completion failed: %s", e)
            raise
        return completion.choices[0].message.content


llm_service = LLMService()
