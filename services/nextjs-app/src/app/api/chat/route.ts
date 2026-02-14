import { NextResponse } from "next/server";
import { getLLM } from "@/lib/llm";
import { vectorSearch } from "@/lib/rag";

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1].content;

        // 1. Perform Vector Search to get context
        let context = "";
        let sources: any[] = [];

        try {
            const searchResults = await vectorSearch(lastMessage);
            if (searchResults.length > 0) {
                context = "\n\nContext from uploaded documents:\n" +
                    searchResults.map(r => `[From ${r.metadata.filename}, Page ${r.metadata.pageIndex}]: ${r.text}`).join("\n---\n");

                sources = searchResults.map(r => ({
                    filename: r.metadata.filename,
                    pageIndex: r.metadata.pageIndex
                }));
            }
        } catch (vError) {
            console.error("Vector search failed (likely index not setup):", vError);
            // Non-blocking, continue without RAG context
        }

        // 2. Augment the last user message with context if available
        const augmentedMessages = [...messages];
        if (context) {
            augmentedMessages[augmentedMessages.length - 1].content =
                `Use the following context to answer the user question if relevant. If the answer is not in the context, answer based on your general knowledge but mention if you are using general knowledge.\n\nContext: ${context}\n\nQuestion: ${lastMessage}`;
        }

        const llm = getLLM();
        const response = await llm.chat(augmentedMessages);

        return NextResponse.json({ response, sources });
    } catch (error: any) {
        console.error("Chat API error:", error);
        return NextResponse.json({ error: "Interal Server Error" }, { status: 500 });
    }
}