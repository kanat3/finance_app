FROM node:20-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/ ./
RUN npm install --no-audit --no-fund
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .

RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

COPY --from=frontend-build /frontend/dist /app/frontend_dist
COPY *.py *.sql ml ./

EXPOSE 3000

CMD ["gunicorn", "--preload", "-b", "0.0.0.0:3000", "-w", "2", "--timeout", "300", "main:app"]