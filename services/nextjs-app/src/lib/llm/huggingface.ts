import { LLM, Message } from "./types";

export class HuggingFaceLLM implements LLM {
    async chat(messages: Message[]): Promise<Message> {
        const serviceUrl = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8000";

        try {
            // Map "bot" role to "assistant" for the backend if needed, 
            // though the backend currently handles "user", "assistant", and "system".
            const backendMessages = messages.map(m => ({
                role: m.role === "bot" ? "assistant" : m.role,
                content: m.content
            }));

            const res = await fetch(`${serviceUrl}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: backendMessages }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            return {
                role: "bot",
                content: data.response || "No response"
            };
        } catch (error: any) {
            console.error("Local LLM Service Error:", error);
            throw new Error(`Failed to call local LLM service: ${error.message}`);
        }
    }
}