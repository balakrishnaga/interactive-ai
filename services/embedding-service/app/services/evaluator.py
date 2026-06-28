import asyncio
import json
import re
from typing import List, Dict, Any, Optional

try:
    from rouge_score import rouge_scorer as _rouge_scorer
except ImportError:  # pragma: no cover - declared in requirements.txt
    _rouge_scorer = None

try:
    from nltk.translate.bleu_score import (
        SmoothingFunction as _SmoothingFunction,
        sentence_bleu as _sentence_bleu,
    )
except ImportError:  # pragma: no cover - declared in requirements.txt
    _SmoothingFunction = None
    _sentence_bleu = None

try:
    import bert_score as _bert_score
except ImportError:  # pragma: no cover - declared in requirements.txt
    _bert_score = None


class EvaluatorService:
    """Computes RAG quality metrics for retrieved chunks and generated responses."""

    _TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")

    def _tokenize(self, text: str) -> set:
        if not text:
            return set()
        return set(self._TOKEN_RE.findall(text.lower()))

    def compute_recall(self, query: str, chunks: List[Dict[str, Any]]) -> float:
        """Fraction of query terms/concepts covered by retrieved chunks."""
        query_terms = self._tokenize(query)
        if not query_terms:
            return 0.0
        chunk_terms = set()
        for chunk in chunks or []:
            chunk_terms.update(self._tokenize(chunk.get("text", "")))
        if not chunk_terms:
            return 0.0
        matched = query_terms & chunk_terms
        return len(matched) / len(query_terms)

    def compute_precision(self, query: str, chunks: List[Dict[str, Any]]) -> float:
        """Average relevance score of retrieved chunks."""
        if not chunks:
            return 0.0
        scores = []
        for chunk in chunks:
            if "rerank_score" in chunk:
                scores.append(float(chunk["rerank_score"]))
            elif "vector_score" in chunk:
                scores.append(float(chunk["vector_score"]))
        if not scores:
            return 0.0
        return sum(scores) / len(scores)

    def compute_context_relevancy(
        self, query: str, chunks: List[Dict[str, Any]]
    ) -> float:
        """Average fraction of query terms found in each chunk (token-overlap proxy)."""
        query_terms = self._tokenize(query)
        if not query_terms:
            return 0.0
        if not chunks:
            return 0.0
        per_chunk_scores: List[float] = []
        for chunk in chunks:
            chunk_terms = self._tokenize(chunk.get("text", ""))
            if not chunk_terms:
                per_chunk_scores.append(0.0)
                continue
            matched = query_terms & chunk_terms
            per_chunk_scores.append(len(matched) / len(query_terms))
        return sum(per_chunk_scores) / len(per_chunk_scores)

    @staticmethod
    def compute_hit_rate(chunks: List[Dict[str, Any]]) -> float:
        """1.0 if any chunks were retrieved, else 0.0."""
        return 1.0 if chunks else 0.0

    @staticmethod
    def _extract_json_object(text: str) -> str:
        """Pull the first balanced JSON object from a possibly noisy LLM response."""
        if text is None:
            return ""
        s = text.strip()
        # Strip markdown code fences, then brace-balance to find the first
        # complete JSON object (handles `}` inside string values).
        fence = re.search(r"```(?:json)?\s*(.*?)\s*```", s, re.DOTALL)
        candidate = fence.group(1) if fence else s
        # Locate the first '{' and walk the string tracking nesting depth,
        # while respecting JSON string literals and escape sequences.
        start = candidate.find("{")
        if start == -1:
            return candidate
        depth = 0
        in_string = False
        escape = False
        for i in range(start, len(candidate)):
            ch = candidate[i]
            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
            else:
                if ch == '"':
                    in_string = True
                elif ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        return candidate[start:i + 1]
        return candidate[start:]

    async def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Try json.loads first, then fall back to regex extraction."""
        if text is None:
            return {}
        raw = self._extract_json_object(text)
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            pass

        # Fallback: regex for supported/unsupported ints
        supported_match = re.search(r'"supported"\s*:\s*(\d+)', text)
        unsupported_match = re.search(r'"unsupported"\s*:\s*(\d+)', text)
        contradiction_match = re.search(
            r'"contradiction"\s*:\s*(true|false)', text, re.IGNORECASE
        )

        result: Dict[str, Any] = {}
        if supported_match:
            result["supported"] = int(supported_match.group(1))
        if unsupported_match:
            result["unsupported"] = int(unsupported_match.group(1))
        if contradiction_match:
            result["contradiction"] = contradiction_match.group(1).lower() == "true"
        return result

    async def _parse_score_response(self, text: str) -> int:
        """Parse a `{"score": <int>}` response and return the int (0-10), else 0."""
        if text is None:
            return 0
        raw = self._extract_json_object(text)
        try:
            data = json.loads(raw)
            score = data.get("score")
            if score is None:
                return 0
            return max(0, min(10, int(score)))
        except (json.JSONDecodeError, ValueError, TypeError):
            pass

        # Fallback: regex on the raw text
        match = re.search(r'"score"\s*:\s*(-?\d+)', text)
        if match:
            try:
                return max(0, min(10, int(match.group(1))))
            except (TypeError, ValueError):
                return 0
        return 0

    @staticmethod
    def _build_context(chunks: List[Dict[str, Any]]) -> str:
        """Join retrieved chunk texts with a '---' separator for LLM prompts."""
        return "\n---\n".join(chunk.get("text", "") for chunk in (chunks or []))

    async def compute_groundedness(
        self,
        query: str,
        response: str,
        chunks: List[Dict[str, Any]],
        llm: Any,
    ) -> float:
        """Fraction of response claims supported by chunks (LLM judge)."""
        context = self._build_context(chunks)
        prompt = (
            "You are evaluating whether the claims in an assistant response "
            "are supported by the provided context chunks.\n\n"
            f"Context:\n{context}\n\n"
            f"Query: {query}\n\n"
            f"Response: {response}\n\n"
            "For each distinct claim in the response, decide whether it is "
            "supported by the context. Return ONLY a JSON object with two "
            "integer fields: 'supported' (count of supported claims) and "
            "'unsupported' (count of unsupported claims).\n"
            "Example: {\"supported\": 3, \"unsupported\": 1}"
        )
        try:
            raw = await llm.chat([{"role": "user", "content": prompt}])
            data = await self._parse_json_response(raw)
        except Exception:
            return 0.0

        supported = int(data.get("supported", 0) or 0)
        unsupported = int(data.get("unsupported", 0) or 0)
        total = supported + unsupported
        if total == 0:
            return 0.0
        return supported / total

    async def compute_faithfulness(
        self,
        query: str,
        response: str,
        chunks: List[Dict[str, Any]],
        llm: Any,
    ) -> float:
        """1 if response does not contradict chunks, 0 if it does (LLM judge)."""
        context = self._build_context(chunks)
        prompt = (
            "You are evaluating whether an assistant response contradicts the "
            "provided context chunks.\n\n"
            f"Context:\n{context}\n\n"
            f"Query: {query}\n\n"
            f"Response: {response}\n\n"
            "Determine whether the response contains any factual statement "
            "that directly contradicts the context. Return ONLY a JSON object "
            "with a single boolean field 'contradiction' (true if there is a "
            "contradiction, false otherwise).\n"
            "Example: {\"contradiction\": false}"
        )
        try:
            raw = await llm.chat([{"role": "user", "content": prompt}])
            data = await self._parse_json_response(raw)
        except Exception:
            return 0.0

        contradiction = data.get("contradiction")
        if contradiction is None:
            # String-level fallback detection
            lowered = (raw or "").lower()
            true_marker = '"contradiction": true'
            true_marker_compact = '"contradiction":true'
            false_marker = '"contradiction": false'
            false_marker_compact = '"contradiction":false'
            if true_marker in lowered or true_marker_compact in lowered:
                contradiction = True
            elif (
                "no contradiction" in lowered
                or false_marker in lowered
                or false_marker_compact in lowered
            ):
                contradiction = False
            else:
                return 0.0
        return 0.0 if contradiction else 1.0

    async def compute_answer_relevancy(
        self,
        query: str,
        response: str,
        llm: Any,
    ) -> float:
        """LLM-as-judge: how relevant the response is to the query (0-1)."""
        prompt = (
            "You are evaluating how relevant an assistant response is to a "
            "user query. A response is relevant if it addresses the query, "
            "even if it is incomplete or partially correct.\n\n"
            f"Query: {query}\n\n"
            f"Response: {response}\n\n"
            "Score the relevancy from 0 to 10 where 0 means completely "
            "irrelevant (off-topic) and 10 means fully addresses the query. "
            "Return ONLY a JSON object with a single integer field 'score'.\n"
            "Example: {\"score\": 7}"
        )
        try:
            raw = await llm.chat([{"role": "user", "content": prompt}])
            score = await self._parse_score_response(raw)
        except Exception:
            return 0.0
        return score / 10.0

    def compute_mrr(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
    ) -> float:
        """Mean Reciprocal Rank proxy via token-overlap relevance.

        A chunk is considered relevant if its tokens intersect with the query
        tokens. Returns 1/rank of the first relevant chunk, or 0.0 if none.
        """
        query_terms = self._tokenize(query)
        if not query_terms:
            return 0.0
        for index, chunk in enumerate(chunks or [], start=1):
            chunk_terms = self._tokenize(chunk.get("text", ""))
            if query_terms & chunk_terms:
                return 1.0 / index
        return 0.0

    async def compute_answer_correctness(
        self,
        query: str,
        response: str,
        reference_answer: Optional[str],
        llm: Any,
    ) -> float:
        """LLM-as-judge correctness vs reference answer (0-1)."""
        if not reference_answer:
            return 0.0
        prompt = (
            "You are evaluating whether an assistant response correctly answers "
            "a user query compared to a reference answer.\n\n"
            f"Query: {query}\n\n"
            f"Reference Answer: {reference_answer}\n\n"
            f"Assistant Response: {response}\n\n"
            "Score the correctness from 0 to 10, where 0 means completely "
            "incorrect or unrelated and 10 means factually and semantically "
            "equivalent to the reference answer.\n"
            "Return ONLY a JSON object with a single integer field 'score'.\n"
            "Example: {\"score\": 8}"
        )
        try:
            raw = await llm.chat([{"role": "user", "content": prompt}])
            score = await self._parse_score_response(raw)
        except Exception:
            return 0.0
        return score / 10.0

    def compute_rouge_scores(
        self,
        response: str,
        reference_answer: Optional[str],
    ) -> Dict[str, float]:
        """Compute ROUGE-1/2/L F-measure vs reference answer."""
        empty = {"rouge_1": 0.0, "rouge_2": 0.0, "rouge_l": 0.0}
        if not reference_answer:
            return empty
        if _rouge_scorer is None:
            return empty
        try:
            scorer = _rouge_scorer.RougeScorer(
                ["rouge1", "rouge2", "rougeL"], use_stemmer=True
            )
            scores = scorer.score(reference_answer, response or "")
            return {
                "rouge_1": float(scores["rouge1"].fmeasure),
                "rouge_2": float(scores["rouge2"].fmeasure),
                "rouge_l": float(scores["rougeL"].fmeasure),
            }
        except Exception:
            return empty

    def compute_bleu(
        self,
        response: str,
        reference_answer: Optional[str],
    ) -> float:
        """Compute sentence-level BLEU vs reference answer."""
        if not reference_answer:
            return 0.0
        if _sentence_bleu is None or _SmoothingFunction is None:
            return 0.0
        try:
            reference_tokens = self._TOKEN_RE.findall(reference_answer.lower())
            response_tokens = self._TOKEN_RE.findall((response or "").lower())
            if not reference_tokens or not response_tokens:
                return 0.0
            smoothing = _SmoothingFunction().method1
            return float(
                _sentence_bleu(
                    [reference_tokens],
                    response_tokens,
                    smoothing_function=smoothing,
                )
            )
        except Exception:
            return 0.0

    def compute_bertscore(
        self,
        response: str,
        reference_answer: Optional[str],
    ) -> float:
        """Compute BERTScore F1 vs reference answer; fallback to 0.0 on error."""
        if not reference_answer:
            return 0.0
        if _bert_score is None:
            return 0.0
        try:
            _, _, f1 = _bert_score.score(
                [response or ""],
                [reference_answer],
                lang="en",
                verbose=False,
            )
            return float(f1[0])
        except Exception:
            return 0.0

    @staticmethod
    def compute_hallucination_rate(groundedness: float) -> float:
        """Return 1 - groundedness."""
        return 1.0 - groundedness

    async def compute_response_coherence(
        self,
        query: str,
        response: str,
        llm: Any,
    ) -> float:
        """LLM-as-judge coherence/readability score (0-1)."""
        prompt = (
            "You are evaluating the coherence and readability of an assistant "
            "response.\n\n"
            f"Query: {query}\n\n"
            f"Assistant Response: {response}\n\n"
            "Score the response from 0 to 10, where 0 means incoherent, "
            "unreadable, or logically broken and 10 means fluent, "
            "well-structured, and easy to read.\n"
            "Return ONLY a JSON object with a single integer field 'score'.\n"
            "Example: {\"score\": 8}"
        )
        try:
            raw = await llm.chat([{"role": "user", "content": prompt}])
            score = await self._parse_score_response(raw)
        except Exception:
            return 0.0
        return score / 10.0

    async def evaluate(
        self,
        query: str,
        response: str,
        chunks: List[Dict[str, Any]],
        llm: Any,
        reference_answer: Optional[str] = None,
    ) -> Dict[str, float]:
        """Returns dict with retriever, generator, and end-to-end metric keys."""
        # 1. Synchronous retriever metrics.
        context_precision = self.compute_precision(query, chunks)
        context_recall = self.compute_recall(query, chunks)
        context_relevancy = self.compute_context_relevancy(query, chunks)
        hit_rate = self.compute_hit_rate(chunks)
        mean_reciprocal_rank = self.compute_mrr(query, chunks)

        # 2. Reference-based metrics off the event loop (CPU-bound).
        rouge_scores = await asyncio.to_thread(
            self.compute_rouge_scores, response, reference_answer
        )
        bleu = await asyncio.to_thread(
            self.compute_bleu, response, reference_answer
        )
        bertscore = await asyncio.to_thread(
            self.compute_bertscore, response, reference_answer
        )

        # 3. All independent LLM calls concurrently.
        (
            groundedness,
            faithfulness,
            answer_relevancy,
            answer_correctness,
            response_coherence,
        ) = await asyncio.gather(
            self.compute_groundedness(query, response, chunks, llm),
            self.compute_faithfulness(query, response, chunks, llm),
            self.compute_answer_relevancy(query, response, llm),
            self.compute_answer_correctness(query, response, reference_answer, llm),
            self.compute_response_coherence(query, response, llm),
        )

        return {
            # retriever metrics
            "context_precision": context_precision,
            "context_recall": context_recall,
            "context_relevancy": context_relevancy,
            "contextual_relevancy": context_relevancy,
            "hit_rate": hit_rate,
            "mean_reciprocal_rank": mean_reciprocal_rank,
            # generator metrics
            "faithfulness": faithfulness,
            "answer_relevancy": answer_relevancy,
            "answer_correctness": answer_correctness,
            "rouge_1": rouge_scores["rouge_1"],
            "rouge_2": rouge_scores["rouge_2"],
            "rouge_l": rouge_scores["rouge_l"],
            "bleu": bleu,
            "bertscore": bertscore,
            # end-to-end / advanced metrics
            "groundedness": groundedness,
            "hallucination_rate": 1.0 - groundedness,
            "response_coherence": response_coherence,
            # canonical names expected by the API schema
            "recall": context_recall,
            "precision": context_precision,
        }


evaluator_service = EvaluatorService()
