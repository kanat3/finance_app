# ============ STAGE 1: build React ============
FROM node:20-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ============ STAGE 2: python + gunicorn ============
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py init.sql ./

COPY main.py init.sql ./
COPY --from=frontend-build /frontend/dist /app/frontend_dist

EXPOSE 3000

CMD ["gunicorn", "--preload", "-b", "0.0.0.0:3000", "-w", "2", "--timeout", "300", "main:app"]