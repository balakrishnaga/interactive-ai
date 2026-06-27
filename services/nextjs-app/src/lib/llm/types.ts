import type { ObservabilityTrace } from "@/lib/observability";

export interface Message {
    role: "user" | "bot";
    content: string;
    sources?: Array<{
        filename: string;
        pageIndex: number;
    }>;
    observability?: ObservabilityTrace | null;
}

export interface LLM {
    chat(messages: Message[]): Promise<Message>;
}
