import { LLM, Message } from "./types";

export class HuggingFaceLLM implements LLM {
    async chat(messages: Message[]): Promise<Message> {
        const prompt = messages
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
            .join("\n") + "\nAssistant:";

        const res = await fetch(
            `https://api-inference.huggingface.co/models/${process.env.HF_MODEL}`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.HF_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        const data = await res.json();
        return data[0]?.generated_text || "No response";
    }
}