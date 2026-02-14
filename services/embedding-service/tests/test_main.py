from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_embed():
    response = client.post("/embed", json={"text": "hello world"})
    assert response.status_code == 200
    assert "embedding" in response.json()
    assert isinstance(response.json()["embedding"], list)
