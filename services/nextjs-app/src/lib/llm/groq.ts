import { LLM, Message } from "./types";

export class GroqLLM implements LLM {
    async chat(messages: Message[]): Promise<Message> {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: process.env.GROQ_MODEL,
                messages: messages.map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content })),
            }),
        });

        const data = await res.json();
        return data.choices?.[0]?.message?.content || "No response from Groq";
    }
}