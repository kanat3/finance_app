import os
from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

celery = Celery(
    "tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"]
)

celery.conf.beat_schedule = {
    "accrue-deposits-daily": {
        "task": "tasks.accrue_all_deposits",
        "schedule": crontab(hour=0, minute=1),
    },
}

# Берем часовой пояс из переменной окружения (по умолчанию UTC)
celery.conf.timezone = os.environ.get("TZ", "UTC")