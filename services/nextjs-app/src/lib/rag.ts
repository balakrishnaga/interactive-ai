import { getDb } from './db';

export interface DocumentChunk {
    text: string;
    metadata: {
        filename: string;
        pageIndex: number;
        chunkIndex: number;
    };
    embedding?: number[];
}

/**
 * Generate embeddings using internal embedding service
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    const serviceUrl = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8000";

    try {
        const response = await fetch(`${serviceUrl}/embed-batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ texts }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.embeddings as number[][];
    } catch (error: any) {
        console.error("Embedding Service Error:", error);
        throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
}

/**
 * Extract text from PDF and split into chunks
 */
export async function processPdf(buffer: Buffer, filename: string): Promise<DocumentChunk[]> {
    // PDF parsing libraries (like pdfjs-dist used by pdf-parse) sometimes expect
    // browser-only globals like DOMMatrix. We polyfill it here for the Node environment.
    if (typeof (global as any).DOMMatrix === 'undefined') {
        (global as any).DOMMatrix = class DOMMatrix {
            m11 = 1; m12 = 0; m13 = 0; m14 = 0;
            m21 = 0; m22 = 1; m23 = 0; m24 = 0;
            m31 = 0; m32 = 0; m33 = 1; m34 = 0;
            m41 = 0; m42 = 0; m43 = 0; m44 = 1;
            constructor() { }
        };
    }

    // Dynamically require to avoid build-time errors with browser polyfills
    // Version 2.4.5 of pdf-parse uses a class constructor
    // Using eval('require') bypasses Turbopack's static analysis for the worker loader
    // and correctly identifies the main entry point which contains the PDFParse class.
    const pdfParse = eval('require')('pdf-parse');
    const { PDFParse } = pdfParse;
    const parser = new PDFParse({ data: buffer });

    // Get text page by page if possible
    // Note: Standard pdf-parse handles multiple pages in the 'text' property
    // but we want to split them to get the correct page index.
    // Some versions of pdf-parse don't easily expose pages, so we'll check common patterns.

    const data = await parser.getText();
    // Default fallback if we can't get page-by-page: split by common page break character \f
    const pages = data.text.split('\f');

    const chunks: DocumentChunk[] = [];
    const chunkSize = 1000;
    const overlap = 200;

    pages.forEach((pageText: string, pageIdx: number) => {
        const cleanPageText = pageText.trim();
        if (cleanPageText.length < 10) return;

        for (let i = 0; i < cleanPageText.length; i += chunkSize - overlap) {
            const chunkText = cleanPageText.slice(i, i + chunkSize);
            if (chunkText.trim().length < 50) continue;

            chunks.push({
                text: chunkText,
                metadata: {
                    filename,
                    pageIndex: pageIdx + 1, // 1-based index
                    chunkIndex: chunks.length
                }
            });
        }
    });

    return chunks;
}

/**
 * Store chunks in MongoDB vector collection
 */
export async function storeChunks(chunks: DocumentChunk[]) {
    const db = await getDb();
    const collection = db.collection('vectors');

    // Batch generate embeddings
    const texts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddings(texts);

    const docs = chunks.map((chunk, i) => ({
        ...chunk,
        embedding: embeddings[i],
        createdAt: new Date()
    }));

    await collection.insertMany(docs);
}

/**
 * Perform vector search
 */
export async function vectorSearch(query: string, limit: number = 3) {
    const db = await getDb();
    const collection = db.collection('vectors');

    const [queryEmbedding] = await generateEmbeddings([query]);

    // Note: This requires a Search Index named "vector_index" on the "vectors" collection
    // with "embedding" field as type "vector"
    const results = await collection.aggregate([
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": queryEmbedding,
                "numCandidates": 100,
                "limit": limit
            }
        },
        {
            "$project": {
                "text": 1,
                "metadata": 1,
                "score": { "$meta": "vectorSearchScore" }
            }
        }
    ]).toArray();

    return results;
}

/**
 * List all unique documents (filenames) in the vector store
 */
export async function listDocuments() {
    const db = await getDb();
    const collection = db.collection('vectors');

    // Get unique filenames from metadata
    const documents = await collection.distinct('metadata.filename');

    // You could also get more info like chunk count or upload date here if needed
    // For now, just returning the list of names
    return documents;
}

/**
 * Delete a document and its embeddings from the vector store
 */
export async function deleteDocument(filename: string) {
    const db = await getDb();
    const collection = db.collection('vectors');

    const result = await collection.deleteMany({ 'metadata.filename': filename });
    return result.deletedCount;
}
