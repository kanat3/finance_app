#!/usr/bin/env bash

set -e

# Функция для очистки при выходе (даже при ошибке)
cleanup() {
    echo "=== 6. Остановка тестовой базы и удаление volume ==="
    docker compose -f docker-compose.test.yml down -v
}
trap cleanup EXIT

echo "=== 1. Создание виртуального окружения (если нет) ==="
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "Виртуальное окружение .venv создано."
else
    echo "Виртуальное окружение .venv уже существует."
fi

echo "=== 2. Активация виртуального окружения ==="
source .venv/bin/activate

echo "=== 3. Установка зависимостей ==="
pip install --upgrade pip
pip install -r requirements.txt
pip install pytest pytest-flask

echo "=== 4. Запуск тестовой базы данных (отдельный compose) ==="
# Поднимаем только db_test (с удалением старого volume, чтобы начать с чистой базы)
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d db_test

# Ждем, пока база станет healthy
echo "Ожидание готовности базы данных..."
until docker exec traty_db_test pg_isready -U traty -d traty_test > /dev/null 2>&1; do
    sleep 1
done
echo "База данных готова!"

echo "=== 5. Запуск тестов ==="
# Указываем DATABASE_URL для тестов (порт 5433)
export DATABASE_URL="postgresql://traty:traty@localhost:5433/traty_test"
export RUN_SEED="0"

pytest tests/test_api.py -v

echo "=== Тесты завершены ==="