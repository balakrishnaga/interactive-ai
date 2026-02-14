import { NextResponse } from 'next/server';
import { clearAllVectors } from '@/lib/rag';

export async function POST() {
    try {
        const deletedCount = await clearAllVectors();
        return NextResponse.json({
            message: "All vectors cleared successfully",
            deletedCount
        });
    } catch (error: any) {
        console.error("Clear vectors error:", error);
        return NextResponse.json({ error: "Failed to clear vectors" }, { status: 500 });
    }
}
