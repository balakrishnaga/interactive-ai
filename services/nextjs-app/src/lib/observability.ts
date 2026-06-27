export interface ChunkMetadata {
  filename: string;
  pageIndex: number;
  chunkIndex: number;
}

export interface RetrievedChunk {
  text: string;
  metadata: ChunkMetadata;
  vector_score: number;
  rerank_score?: number;
}

export interface ObservabilityMetrics {
  recall: number;
  precision: number;
  groundedness: number;
  faithfulness: number;
}

export interface ObservabilityTrace {
  query: string;
  query_embedding?: number[];
  top_k: number;
  reranker_used: boolean;
  initial_chunks: RetrievedChunk[];
  reranked_chunks: RetrievedChunk[];
  metrics: ObservabilityMetrics | null;
  retrieval_error?: string;
  evaluation_error?: string;
}

export interface RetrievePayload {
  query: string;
  top_k: number;
  rerank: boolean;
}

export interface EvaluatePayload {
  query: string;
  response: string;
  chunks: RetrievedChunk[];
}
