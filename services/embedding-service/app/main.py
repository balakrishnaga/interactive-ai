import logging

from fastapi import FastAPI
from app.api.endpoints import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(title="Embedding Service")

app.include_router(api_router)


@app.get("/health")
def health_check():
    logger.info("Health check requested")
    return {"status": "healthy"}
