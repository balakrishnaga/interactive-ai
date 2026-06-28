FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the BERTScore model so the first /evaluate request does not
# time out while the weights are fetched.
RUN python - <<'PY'
import bert_score
bert_score.score(["hello"], ["hello"], lang="en", verbose=False)
PY

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
