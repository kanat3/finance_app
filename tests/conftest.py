import sys
import os
import time
import pytest
import psycopg2

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app, get_conn, q

# Указываем тестовую базу (порт 5433)
TEST_DATABASE_URL = "postgresql://traty:traty@localhost:5433/traty_test"

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    os.environ["RUN_SEED"] = "0"  # Отключаем засев основной базы

    # Ждем, пока база поднимется
    for _ in range(15):
        try:
            psycopg2.connect(TEST_DATABASE_URL).close()
            break
        except psycopg2.OperationalError:
            time.sleep(1)

    # Накатываем схему для тестов
    with open("tests/init_tests.sql", "r") as f:
        schema_sql = f.read()

    conn = psycopg2.connect(TEST_DATABASE_URL)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(schema_sql)
    conn.close()
    yield

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def clean_db():
    """Очищает транзакции, но НЕ справочники."""
    conn = get_conn()
    with conn.cursor() as cur:
        # Используем DELETE, чтобы не трогать справочники (CASCADE удаляет всё)
        cur.execute("DELETE FROM deposit_interests;")
        cur.execute("DELETE FROM incomes;")
        cur.execute("DELETE FROM expenses;")
        cur.execute("DELETE FROM deposits;")
        cur.execute("DELETE FROM investments;")
    conn.commit()
    conn.close()
    yield