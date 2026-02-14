import { NextResponse } from 'next/server';
import { listDocuments } from '@/lib/rag';

export async function GET() {
    try {
        const documents = await listDocuments();
        return NextResponse.json({ documents });
    } catch (error: any) {
        console.error("List documents error:", error);
        return NextResponse.json({ error: "Failed to list documents" }, { status: 500 });
    }
}
