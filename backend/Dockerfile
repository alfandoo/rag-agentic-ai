FROM python:3.12-slim

WORKDIR /app

# Install python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy source code
COPY backend /app/backend

RUN useradd --create-home appuser \
    && mkdir -p /app/chroma_data \
    && chown -R appuser:appuser /app

ENV PYTHONPATH=/app
ENV BACKEND_HOST=0.0.0.0
ENV BACKEND_PORT=8000

USER appuser

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
