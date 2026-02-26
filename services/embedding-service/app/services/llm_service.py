import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEndpoint

load_dotenv()
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

class LLMService:
    def __init__(self):
        self.model_id = os.getenv("HF_MODEL", "meta-llama/Llama-3.2-3B-Instruct")
        self.api_key = os.getenv("HF_API_KEY")
        
        if not self.api_key:
            print("Warning: HF_API_KEY is not set.")

        self.llm = HuggingFaceEndpoint(
            repo_id=self.model_id,
            huggingfacehub_api_token=self.api_key,
            temperature=0.7,
            max_new_tokens=512,
        )

    async def chat(self, messages):
        """
        Processes a list of messages and returns the assistant's response.
        Messages is a list of dicts with 'role' and 'content'.
        """
        # Convert to LangChain message format
        lc_messages = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content")
            if role == "user":
                lc_messages.append(HumanMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            elif role == "system":
                lc_messages.append(SystemMessage(content=content))

        # HuggingFaceEndpoint expects a prompt string usually, 
        # but langchain_huggingface might handle message lists if configured correctly
        # For simple inference, we might need to format it as a prompt string
        
        # Simple formatting for instruction models
        prompt = ""
        for msg in lc_messages:
            if isinstance(msg, HumanMessage):
                prompt += f"User: {msg.content}\n"
            elif isinstance(msg, AIMessage):
                prompt += f"Assistant: {msg.content}\n"
            elif isinstance(msg, SystemMessage):
                prompt += f"System: {msg.content}\n"
        
        prompt += "Assistant:"

        response = await self.llm.ainvoke(prompt)
        return response

llm_service = LLMService()
