import { OpenAILLM } from "./openai";
import { GroqLLM } from "./groq";
import { HuggingFaceLLM } from "./huggingface";
import { LLM } from "./types";

export function getLLM(): LLM {
    const provider = process.env.NEXT_PUBLIC_LLM_PROVIDER;

    switch (provider) {
        case "openai":
            return new OpenAILLM();
        case "groq":
            return new GroqLLM();
        case "huggingface":
            return new HuggingFaceLLM();
        default:
            throw new Error("Invalid LLM Provider");
    }
}