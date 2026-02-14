import { NextResponse } from 'next/server';
import { processPdfRemote, storeChunks } from '@/lib/rag';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (file.type !== 'application/pdf') {
            return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
        }

        // 1. Process PDF into chunks remotely (includes embedding)
        const chunks = await processPdfRemote(file);

        // 2. Store in MongoDB
        await storeChunks(chunks);

        return NextResponse.json({
            message: "File processed and indexed successfully",
            filename: file.name,
            chunks: chunks.length
        });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({
            error: "Failed to process PDF",
            details: error.message
        }, { status: 500 });
    }
}
