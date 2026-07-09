import os
import re
from typing import List, Any
from app.services.evaluator import evaluator_service
from app.schemas.guardrails import GuardrailScores, GuardrailResult


# Off-topic / prompt-injection / meta / real-time patterns. Word-bounded
# and matched case-insensitively in QueryRelevanceGuardrail.
_OFF_TOPIC_PATTERNS = (
    # Meta questions about the assistant
    "who are you",
    "what can you do",
    "how do you work",
    "what are you",
    "are you conscious",
    "who made you",
    "what is your name",
    "your name",
    "your creator",
    "who created you",
    "who built you",
    # Creative / generative requests unrelated to documents
    "write a poem",
    "write a story",
    "tell me a joke",
    "write code",
    "code a",
    "generate a",
    "create a",
    # Prompt injection markers
    "ignore previous instructions",
    "forget",
    "system prompt",
    "you are now",
    "DAN",
    "jailbreak",
    "ignore all prior",
    "bypass",
    "disregard",
    "pretend you are",
    "act as",
    "new instructions",
    "override",
    "leak",
    "show me your prompt",
    # Malicious / harmful requests
    "how to make",
    "how to build a bomb",
    "how to hack",
    "illegal",
    "buy drugs",
    "credit card number",
    # Real-time / general knowledge
    "current news",
    "latest news",
    "today news",
    "latest stock price",
    "weather today",
    "what's the weather",
    "who is the president",
    "who was the president",
    "capital of",
    # Pure greetings
    "hello",
    "hi there",
    "good morning",
    "good evening",
    "how are you",
)


def _chunk_preferred_score(chunk: dict) -> float:
    """Return the chunk's rerank_score if present, else its vector_score."""
    rerank = chunk.get("rerank_score")
    if rerank is not None:
        return float(rerank)
    return float(chunk.get("vector_score", 0.0))


class QueryRelevanceGuardrail:
    def __init__(self):
        self.min_vector_score = float(os.environ.get("GUARDRAIL_MIN_VECTOR_SCORE", 0.65))
        self.min_context_relevancy = float(os.environ.get("GUARDRAIL_MIN_CONTEXT_RELEVANCY", 0.15))
        # New configurable thresholds
        self.min_query_length = int(os.environ.get("GUARDRAIL_MIN_QUERY_LENGTH", 3))
        self.max_query_length = int(os.environ.get("GUARDRAIL_MAX_QUERY_LENGTH", 500))
        self.min_avg_score = float(os.environ.get("GUARDRAIL_MIN_AVG_SCORE", 0.55))
        self.min_chunks_above_threshold = int(
            os.environ.get("GUARDRAIL_MIN_CHUNKS_ABOVE_THRESHOLD", 1)
        )
        self.min_chunk_score = float(os.environ.get("GUARDRAIL_MIN_CHUNK_SCORE", 0.5))
        self.min_semantic_similarity = float(os.environ.get("GUARDRAIL_MIN_SEMANTIC_SIMILARITY", 0.30))

        # Regex for off-topic queries. Patterns are escaped so future additions
        # that happen to contain regex metacharacters are matched literally.
        self.off_topic_pattern = re.compile(
            r"\b(?:" + "|".join(re.escape(p) for p in _OFF_TOPIC_PATTERNS) + r")\b",
            re.IGNORECASE,
        )

    def check(self, query: str, chunks: List[dict]) -> GuardrailResult:
        # Always compute retrieval metrics so they are populated even when the
        # query is rejected by an earlier check.
        max_vector_score = max(
            (chunk.get("vector_score", 0.0) for chunk in chunks), default=0.0
        )
        preferred_scores = [_chunk_preferred_score(c) for c in chunks]
        top_preferred = sorted(preferred_scores, reverse=True)[:3]
        avg_top_score = sum(top_preferred) / len(top_preferred) if top_preferred else 0.0
        chunks_above_threshold = sum(
            1 for s in preferred_scores if s >= self.min_chunk_score
        )
        context_relevancy = evaluator_service.compute_context_relevancy(query, chunks)
        semantic_similarity = max(
            (chunk.get("semantic_similarity", 0.0) for chunk in chunks), default=0.0
        )
        has_semantic_similarity = any("semantic_similarity" in chunk for chunk in chunks)

        scores = GuardrailScores(
            max_vector_score=max_vector_score,
            avg_top_score=avg_top_score,
            chunks_above_threshold=chunks_above_threshold,
            context_relevancy=context_relevancy,
            semantic_similarity=semantic_similarity,
        )

        # 1. Query sanitisation
        stripped_query = (query or "").strip()
        if not stripped_query:
            return GuardrailResult(
                allowed=False,
                reason="Query is empty or only whitespace.",
                scores=scores,
            )
        if len(stripped_query) < self.min_query_length:
            return GuardrailResult(
                allowed=False,
                reason=(
                    f"Query length {len(stripped_query)} is below minimum "
                    f"{self.min_query_length} characters."
                ),
                scores=scores,
            )
        if len(stripped_query) > self.max_query_length:
            return GuardrailResult(
                allowed=False,
                reason=(
                    f"Query length {len(stripped_query)} exceeds maximum "
                    f"{self.max_query_length} characters."
                ),
                scores=scores,
            )

        # 2. Off-topic / prompt-injection regex
        if self.off_topic_pattern.search(stripped_query):
            return GuardrailResult(
                allowed=False,
                reason="Query is off-topic or potentially malicious.",
                scores=scores,
            )

        # 3. Retrieval-quality checks (max → avg → count)
        if max_vector_score < self.min_vector_score:
            reason = (
                f"Maximum vector score {max_vector_score:.4f} is below "
                f"threshold {self.min_vector_score}."
            )
        elif avg_top_score < self.min_avg_score:
            reason = (
                f"Average top score {avg_top_score:.4f} is below "
                f"threshold {self.min_avg_score}."
            )
        elif chunks_above_threshold < self.min_chunks_above_threshold:
            reason = (
                f"Chunks above score threshold ({chunks_above_threshold}) is "
                f"below required {self.min_chunks_above_threshold}."
            )
        elif context_relevancy < self.min_context_relevancy:
            reason = (
                f"Context relevancy {context_relevancy:.4f} is below "
                f"threshold {self.min_context_relevancy}."
            )
        elif (
            has_semantic_similarity
            and semantic_similarity < self.min_semantic_similarity
        ):
            reason = (
                f"Query is not semantically similar to document context. "
                f"Similarity {semantic_similarity:.4f} is below threshold "
                f"{self.min_semantic_similarity}."
            )
        else:
            reason = None

        return GuardrailResult(
            allowed=reason is None,
            reason=reason,
            scores=scores,
        )

    def check_without_chunks(self, query: str) -> GuardrailResult:
        """Performs only query sanitisation and off-topic regex checks."""
        scores = GuardrailScores()
        stripped_query = (query or "").strip()
        if not stripped_query:
            return GuardrailResult(
                allowed=False,
                reason="Query is empty or only whitespace.",
                scores=scores,
            )
        if len(stripped_query) < self.min_query_length:
            return GuardrailResult(
                allowed=False,
                reason=(
                    f"Query length {len(stripped_query)} is below minimum "
                    f"{self.min_query_length} characters."
                ),
                scores=scores,
            )
        if len(stripped_query) > self.max_query_length:
            return GuardrailResult(
                allowed=False,
                reason=(
                    f"Query length {len(stripped_query)} exceeds maximum "
                    f"{self.max_query_length} characters."
                ),
                scores=scores,
            )

        if self.off_topic_pattern.search(stripped_query):
            return GuardrailResult(
                allowed=False,
                reason="Query is off-topic or potentially malicious.",
                scores=scores,
            )

        return GuardrailResult(allowed=True, reason=None, scores=scores)


class ResponseGuardrail:
    def __init__(self):
        self.min_groundedness = float(os.environ.get("GUARDRAIL_MIN_GROUNDEDNESS", 0.5))
        self.min_faithfulness = float(os.environ.get("GUARDRAIL_MIN_FAITHFULNESS", 0.5))

    async def check(
        self, query: str, response: str, chunks: List[dict], llm: Any
    ) -> GuardrailResult:
        groundedness = await evaluator_service.compute_groundedness(
            query, response, chunks, llm
        )
        faithfulness = await evaluator_service.compute_faithfulness(
            query, response, chunks, llm
        )

        allowed = groundedness >= self.min_groundedness and faithfulness >= self.min_faithfulness

        reason = None
        if not allowed:
            if groundedness < self.min_groundedness:
                reason = (
                    f"Groundedness {groundedness:.4f} is below threshold "
                    f"{self.min_groundedness}."
                )
            elif faithfulness < self.min_faithfulness:
                reason = (
                    f"Faithfulness {faithfulness:.4f} is below threshold "
                    f"{self.min_faithfulness}."
                )

        return GuardrailResult(
            allowed=allowed,
            reason=reason,
            scores=GuardrailScores(
                groundedness=groundedness,
                faithfulness=faithfulness,
            ),
        )


query_relevance_guardrail = QueryRelevanceGuardrail()
response_guardrail = ResponseGuardrail()
