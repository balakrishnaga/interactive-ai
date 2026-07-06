import os
from dotenv import load_dotenv
from huggingface_hub import AsyncInferenceClient  # type: ignore

load_dotenv()


class LLMService:
    def __init__(self):
        self.model_id = os.getenv("HF_MODEL", "meta-llama/Llama-3.2-3B-Instruct")
        self.api_key = os.getenv("HF_API_KEY")

        if not self.api_key:
            print("Warning: HF_API_KEY is not set.")

        self.client = AsyncInferenceClient(
            model=self.model_id,
            token=self.api_key,
        )

    async def chat(self, messages):
        """
        Processes a list of messages and returns the assistant's response.
        Messages is a list of dicts with 'role' and 'content'.
        """
        completion = await self.client.chat.completions.create(
            messages=messages,
            max_tokens=512,
            temperature=0.7,
        )
        return completion.choices[0].message.content


llm_service = LLMService()
