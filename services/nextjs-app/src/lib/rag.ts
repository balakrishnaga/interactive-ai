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
 * Process PDF remotely using the embedding service (LangChain based)
 */
export async function processPdfRemote(file: File): Promise<DocumentChunk[]> {
    const serviceUrl = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8000";

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${serviceUrl}/process-pdf`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.chunks as DocumentChunk[];
    } catch (error: any) {
        console.error("Remote Processing Error:", error);
        throw new Error(`Failed to process PDF remotely: ${error.message}`);
    }
}

/**
 * Store chunks in MongoDB vector collection (chunks already have embeddings)
 */
export async function storeChunks(chunks: DocumentChunk[]) {
    const db = await getDb();
    const collection = db.collection('vectors');

    const docs = chunks.map((chunk) => ({
        ...chunk,
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

/**
 * Delete all vectors from the collection
 */
export async function clearAllVectors() {
    const db = await getDb();
    const collection = db.collection('vectors');

    const result = await collection.deleteMany({});
    return result.deletedCount;
}
