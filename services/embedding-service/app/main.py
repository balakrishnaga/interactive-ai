from fastapi import FastAPI
from app.api.endpoints import router as api_router

app = FastAPI(title="Embedding Service")

app.include_router(api_router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}
