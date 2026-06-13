FROM python:3.10-slim-bookworm

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file from root workspace
COPY requirements.txt .

# Install dependencies plus async driver requirements
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir aiosqlite sqlalchemy greenlet

# Copy backend app
COPY apps/api /app

# Ensure storage directories exist
RUN mkdir -p /app/storage/models /app/db_data

EXPOSE 8000

ENV PYTHONPATH=/app
ENV PORT=8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
