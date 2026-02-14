export interface Message {
    role: "user" | "bot";
    content: string;
    sources?: Array<{
        filename: string;
        pageIndex: number;
    }>;
}

export interface LLM {
    chat(messages: Message[]): Promise<Message>;
}