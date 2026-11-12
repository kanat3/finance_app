import pytest
from datetime import date
import psycopg2
import os
import sys
import time

# Добавляем корень проекта в sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app, get_conn, q

# ============================================================
# ФИКСТУРЫ (ОПРЕДЕЛЯЕМ ОДИН РАЗ)
# ============================================================
TEST_DATABASE_URL = "postgresql://traty:traty@localhost:5433/traty_test"

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    os.environ["RUN_SEED"] = "0"

    for _ in range(15):
        try:
            psycopg2.connect(TEST_DATABASE_URL).close()
            break
        except psycopg2.OperationalError:
            time.sleep(1)

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
        # Очищаем только транзакционные таблицы
        cur.execute("TRUNCATE TABLE deposit_interests, incomes, expenses, deposits, investments RESTART IDENTITY CASCADE;")
    conn.commit()
    conn.close()
    yield

# ============================================================
# ТЕСТЫ: РАСХОДЫ
# ============================================================
def test_create_and_get_expense(client):
    resp = client.post("/api/expenses", json={
        "date": "2026-11-07",
        "category_id": 1,
        "amount": 1500.50,
        "description": "Test expense",
        "comment": "T-Bank"
    })
    assert resp.status_code == 201

    row = q("SELECT * FROM expenses WHERE description='Test expense'", fetch="one")
    assert row is not None
    assert float(row["amount"]) == 1500.50

    resp = client.get("/api/expenses")
    assert resp.json["total"] == 1
    assert resp.json["items"][0]["description"] == "Test expense"

def test_update_and_delete_expense(client):
    resp = client.post("/api/expenses", json={
        "date": "2026-11-07", "category_id": 1, "amount": 100, "description": "Old"
    })
    exp_id = resp.json["id"]

    resp = client.put(f"/api/expenses/{exp_id}", json={
        "date": "2026-11-07", "category_id": 1, "amount": 200, "description": "New"
    })
    assert resp.status_code == 200
    row = q("SELECT * FROM expenses WHERE id=%s", (exp_id,), fetch="one")
    assert row["description"] == "New"

    resp = client.delete(f"/api/expenses/{exp_id}")
    assert resp.status_code == 200
    assert q("SELECT * FROM expenses WHERE id=%s", (exp_id,), fetch="one") is None

def test_expense_filter_by_date(client):
    client.post("/api/expenses", json={"date": "2026-10-01", "category_id": 1, "amount": 100, "description": "Oct"})
    client.post("/api/expenses", json={"date": "2026-11-01", "category_id": 1, "amount": 200, "description": "Nov"})

    resp = client.get("/api/expenses?date_from=2026-11-01&date_to=2026-11-30")
    assert resp.json["total"] == 1
    assert resp.json["items"][0]["description"] == "Nov"

# ============================================================
# ТЕСТЫ: ДОХОДЫ
# ============================================================
def test_create_and_get_income(client):
    resp = client.post("/api/incomes", json={
        "date": "2026-11-07",
        "category_id": 1,
        "amount": 5000,
        "description": "Test income"
    })
    assert resp.status_code == 201

    row = q("SELECT * FROM incomes WHERE description='Test income'", fetch="one")
    assert row is not None
    assert float(row["amount"]) == 5000

def test_income_filter_by_date(client):
    client.post("/api/incomes", json={"date": "2026-10-01", "category_id": 1, "amount": 100, "description": "Oct"})
    client.post("/api/incomes", json={"date": "2026-11-01", "category_id": 1, "amount": 200, "description": "Nov"})

    resp = client.get("/api/incomes?date_from=2026-11-01&date_to=2026-11-30")
    assert resp.json["total"] == 1
    assert resp.json["items"][0]["description"] == "Nov"

def test_income_duplicate_prevention(client):
    payload = {"date": "2026-11-07", "category_id": 1, "amount": 1000, "description": "Unique"}
    client.post("/api/incomes", json=payload)
    client.post("/api/incomes", json=payload)

    rows = q("SELECT * FROM incomes WHERE description='Unique'")
    assert len(rows) == 1

# ============================================================
# ТЕСТЫ: ВКЛАДЫ (ОСНОВНЫЕ)
# ============================================================
def test_create_deposit_with_valid_category(client):
    resp = client.post("/api/deposits", json={
        "name": "Test Deposit",
        "amount": 100000,
        "rate": 12.0,
        "start_date": "2026-01-01",
        "accrue_period": "monthly",
        "is_capitalized": False,
        "auto_accrue": False,
        "income_category_id": 3
    })
    assert resp.status_code == 201
    dep_id = resp.json["id"]

    row = q("SELECT * FROM deposits WHERE id=%s", (dep_id,), fetch="one")
    assert row["income_category_id"] == 3

def test_deposit_without_category_fails_accrue(client):
    resp = client.post("/api/deposits", json={
        "name": "No Category",
        "amount": 10000,
        "rate": 10.0,
        "start_date": "2026-01-01",
        "accrue_period": "monthly",
        "auto_accrue": False,
        "income_category_id": None
    })
    dep_id = resp.json["id"]

    resp = client.post(f"/api/deposits/{dep_id}/accrue", json={"amount": 100})
    assert resp.status_code == 400
    # Проверяем, что в ответе есть слово "категория" (в любом ключе)
    assert "категория" in resp.get_data(as_text=True).lower()

def test_manual_accrue_with_capitalization(client):
    resp = client.post("/api/deposits", json={
        "name": "Capitalized",
        "amount": 100000,
        "rate": 12.0,
        "start_date": "2026-01-01",
        "accrue_period": "monthly",
        "is_capitalized": True,
        "income_category_id": 3
    })
    dep_id = resp.json["id"]

    client.post(f"/api/deposits/{dep_id}/accrue", json={"amount": 1000})

    row = q("SELECT amount FROM deposits WHERE id=%s", (dep_id,), fetch="one")
    assert float(row["amount"]) == 101000

def test_manual_accrue_without_capitalization(client):
    resp = client.post("/api/deposits", json={
        "name": "No Capital",
        "amount": 100000,
        "rate": 12.0,
        "start_date": "2026-01-01",
        "accrue_period": "monthly",
        "is_capitalized": False,
        "income_category_id": 3
    })
    dep_id = resp.json["id"]

    client.post(f"/api/deposits/{dep_id}/accrue", json={"amount": 1000})

    row = q("SELECT amount FROM deposits WHERE id=%s", (dep_id,), fetch="one")
    assert float(row["amount"]) == 100000

def test_delete_deposit_cascades_incomes(client):
    resp = client.post("/api/deposits", json={
        "name": "To Delete", "amount": 100000, "rate": 12.0,
        "start_date": "2026-01-01", "accrue_period": "monthly",
        "income_category_id": 3
    })
    dep_id = resp.json["id"]
    client.post(f"/api/deposits/{dep_id}/accrue", json={"amount": 1000})

    client.delete(f"/api/deposits/{dep_id}")

    income = q("SELECT * FROM incomes WHERE description LIKE '%To Delete%'", fetch="one")
    assert income is None

    interest = q("SELECT * FROM deposit_interests WHERE deposit_id=%s", (dep_id,), fetch="one")
    assert interest is None

def test_recreate_deposit_and_accrue_no_duplicates(client):
    # 1. Создаем и начисляем
    resp = client.post("/api/deposits", json={
        "name": "Recreated", "amount": 100000, "rate": 12.0,
        "start_date": "2026-01-01", "accrue_period": "monthly",
        "income_category_id": 3
    })
    dep1_id = resp.json["id"]
    client.post(f"/api/deposits/{dep1_id}/accrue", json={"amount": 1000})

    # 2. Удаляем
    client.delete(f"/api/deposits/{dep1_id}")

    # 3. Создаем заново
    resp = client.post("/api/deposits", json={
        "name": "Recreated", "amount": 100000, "rate": 12.0,
        "start_date": "2026-01-01", "accrue_period": "monthly",
        "income_category_id": 3
    })
    dep2_id = resp.json["id"]

    # 4. Начисляем
    client.post(f"/api/deposits/{dep2_id}/accrue", json={"amount": 1000})

    # 5. Проверяем, что история привязана к доходу
    interests = q("SELECT * FROM deposit_interests WHERE deposit_id=%s", (dep2_id,))
    assert len(interests) == 1
    assert interests[0]["income_id"] is not None

    # 6. Нет "пустых" доходов
    empty = q("SELECT * FROM incomes WHERE category_id IS NULL AND description LIKE '%Recreated%'", fetch="one")
    assert empty is None

def test_history_marks_deleted_income(client):
    resp = client.post("/api/deposits", json={
        "name": "History Test", "amount": 100000, "rate": 12.0,
        "start_date": "2026-01-01", "accrue_period": "monthly",
        "income_category_id": 3
    })
    dep_id = resp.json["id"]
    client.post(f"/api/deposits/{dep_id}/accrue", json={"amount": 1000})

    # Удаляем доход вручную
    income = q("SELECT * FROM incomes WHERE description LIKE '%History Test%'", fetch="one")
    q("DELETE FROM incomes WHERE id=%s", (income["id"],))

    resp = client.get(f"/api/deposits/{dep_id}/interests")
    assert resp.json[0]["linked_income_id"] is None

def test_accrue_negative_amount_fails(client):
    resp = client.post("/api/deposits", json={
        "name": "Negative", "amount": 100000, "rate": 12.0,
        "start_date": "2026-01-01", "accrue_period": "monthly",
        "income_category_id": 3
    })
    dep_id = resp.json["id"]

    resp = client.post(f"/api/deposits/{dep_id}/accrue", json={"amount": -100})
    assert resp.status_code == 400

# ============================================================
# ТЕСТЫ: СТАТИСТИКА
# ============================================================
def test_stats(client):
    client.post("/api/incomes", json={"date": "2026-11-07", "category_id": 1, "amount": 1000, "description": "Salary"})
    client.post("/api/expenses", json={"date": "2026-11-07", "category_id": 1, "amount": 500, "description": "Food"})

    resp = client.get("/api/stats")
    assert resp.status_code == 200
    data = resp.json
    assert len(data["incomes_by_month"]) > 0
    assert len(data["expenses_by_month"]) > 0
    assert data["incomes_by_month"][0]["s"] == 1000
    assert data["expenses_by_month"][0]["s"] == 500

# ============================================================
# ТЕСТЫ: ЭКСПОРТ
# ============================================================
def test_export_csv(client):
    client.post("/api/expenses", json={"date": "2026-11-07", "category_id": 1, "amount": 500, "description": "Food"})
    resp = client.get("/api/export/expenses.csv")
    assert resp.status_code == 200
    assert "Food" in resp.data.decode("utf-8-sig")

def test_export_xlsx(client):
    client.post("/api/expenses", json={"date": "2026-11-07", "category_id": 1, "amount": 500, "description": "Food"})
    resp = client.get("/api/export/expenses.xlsx")
    assert resp.status_code == 200
    assert resp.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

# ============================================================
# ТЕСТЫ: ИНВЕСТИЦИИ
# ============================================================
def test_create_investment(client):
    resp = client.post("/api/investments", json={
        "name": "SBER",
        "ticker": "SBER",
        "quantity": 10,
        "avg_price": 250.5,
        "current_price": 260.0
    })
    assert resp.status_code == 201
    row = q("SELECT * FROM investments WHERE name='SBER'", fetch="one")
    assert float(row["quantity"]) == 10

def test_update_investment_price(client):
    resp = client.post("/api/investments", json={
        "name": "GAZP", "quantity": 5, "avg_price": 100, "current_price": 100
    })
    inv_id = resp.json["id"]

    client.put(f"/api/investments/{inv_id}", json={"current_price": 150})
    row = q("SELECT * FROM investments WHERE id=%s", (inv_id,), fetch="one")
    assert float(row["current_price"]) == 150