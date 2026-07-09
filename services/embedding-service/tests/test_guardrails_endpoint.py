from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.services.llm_service import llm_service

client = TestClient(app)


def test_guardrails_check_query_relevance_allowed():
    # Mock query relevance check to allow
    # We can't easily mock query_relevance_guardrail inside the endpoint because it's an instance
    # But we can control the input and the environment variables if needed, or just use the logic.
    # The logic for allowed is: max_vector_score >= 0.65, avg_top_score >= 0.55,
    # chunks_above_threshold >= 1, context_relevancy >= 0.15, and not off_topic.
    # We provide chunks with high vector_score and text that matches query.

    payload = {
        "query": "What is the project status?",
        "chunks": [
            {
                "text": "The project status is green and on track.",
                "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 0},
                "vector_score": 0.9,
                "rerank_score": 0.9,
                "semantic_similarity": 0.9
            }
        ]
    }

    response = client.post("/guardrails/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "allowed" in data
    # Given the mock data, it should be allowed (vector_score 0.9 > 0.65, overlap is high)
    assert data["allowed"] is True



def test_guardrails_check_query_relevance_blocked_off_topic():
    payload = {
        "query": "Tell me a joke",
        "chunks": [
            {
                "text": "The project status is green and on track.",
                "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 0},
                "vector_score": 0.9,
                "rerank_score": 0.9,
                "semantic_similarity": 0.9
            }
        ]
    }

    response = client.post("/guardrails/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert "off-topic" in data["reason"].lower()



def test_guardrails_check_response_allowed():
    # Mock llm_service.chat to return a successful groundedness and faithfulness response
    # compute_groundedness expects: {"supported": X, "unsupported": Y}
    # compute_faithfulness expects: {"contradiction": false}

    with patch.object(llm_service, 'chat', new_callable=AsyncMock) as mock_chat:
        # We need two calls: one for groundedness, one for faithfulness
        mock_chat.side_effect = [
            '{"supported": 2, "unsupported": 0}',  # groundedness = 1.0
            '{"contradiction": false}'  # faithfulness = 1.0
        ]

        payload = {
            "query": "What is the project status?",
            "response": "The project status is green.",
            "chunks": [
                {
                    "text": "The project status is green and on track.",
                    "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 0},
                    "vector_score": 0.9,
                    "rerank_score": 0.9,
                    "semantic_similarity": 0.9
                }
            ]
        }

        response = client.post("/guardrails/check", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] is True
        assert data["scores"]["groundedness"] == 1.0
        assert data["scores"]["faithfulness"] == 1.0



def test_guardrails_check_response_blocked():
    with patch.object(llm_service, 'chat', new_callable=AsyncMock) as mock_chat:
        # Mock failure for groundedness
        mock_chat.side_effect = [
            '{"supported": 0, "unsupported": 2}',  # groundedness = 0.0
            '{"contradiction": false}'  # faithfulness = 1.0
        ]

        payload = {
            "query": "What is the project status?",
            "response": "The project status is red.",
            "chunks": [
                {
                    "text": "The project status is green and on track.",
                    "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 0},
                    "vector_score": 0.9,
                    "rerank_score": 0.9,
                    "semantic_similarity": 0.9
                }
            ]
        }

        response = client.post("/guardrails/check", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] is False
        assert "Groundedness" in data["reason"]




def test_guardrails_check_blocked_low_avg_score():
    """POST chunks whose max vector_score passes but average top-3 preferred score fails."""
    payload = {
        "query": "What is the project status?",
        "chunks": [
            {
                "text": "The project status is green and on track.",
                "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 0},
                "vector_score": 0.9,
                "rerank_score": 0.4,
            },
            {
                "text": "Status meetings are held weekly.",
                "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 1},
                "vector_score": 0.7,
                "rerank_score": 0.4,
            },
            {
                "text": "Other project notes here.",
                "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 2},
                "vector_score": 0.7,
                "rerank_score": 0.4,
            },
        ]
    }

    response = client.post("/guardrails/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert "average top score" in data["reason"].lower()
