import { NextResponse } from 'next/server';
import { deleteDocument } from '@/lib/rag';

export async function POST(req: Request) {
    try {
        const { filename } = await req.json();

        if (!filename) {
            return NextResponse.json({ error: "Filename is required" }, { status: 400 });
        }

        const deletedCount = await deleteDocument(filename);

        return NextResponse.json({
            message: `Document '${filename}' deleted successfully`,
            deletedCount
        });
    } catch (error: any) {
        console.error("Delete document error:", error);
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
}
