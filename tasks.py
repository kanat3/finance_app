import os
from datetime import datetime, timedelta
import psycopg2
from psycopg2 import errors # <-- Импортируем класс ошибок
from psycopg2.extras import RealDictCursor
from celery_app import celery

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)

def q(sql, params=None, fetch="all"):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            if cur.description:
                rows = cur.fetchall() if fetch == "all" else cur.fetchone()
            else:
                rows = None
        conn.commit()
        return rows
    finally:
        conn.close()

@celery.task
def accrue_all_deposits():
    today = datetime.now().date()
    active_deposits = q("SELECT * FROM deposits WHERE is_active = TRUE AND auto_accrue = TRUE")

    for d in active_deposits:
        last_int = q("SELECT MAX(date) as last_date FROM deposit_interests WHERE deposit_id = %s", (d["id"],), fetch="one")
        last_date = last_int["last_date"] if last_int and last_int["last_date"] else d["start_date"]

        # ЗАЩИТА: если уже начисляли сегодня — пропускаем
        if last_date >= today:
            continue

        period = d.get("accrue_period", "monthly")
        days_passed = (today - last_date).days

        should_accrue = False
        step_days = 0

        if period == 'daily' and days_passed >= 1:
            should_accrue = True
            step_days = 1
        elif period == 'monthly' and days_passed >= 30:
            should_accrue = True
            step_days = 30
        elif period == 'end':
            if d.get("end_date") and today >= d["end_date"]:
                if not last_int or last_int["last_date"] < d["end_date"]:
                    should_accrue = True
                    step_days = (d["end_date"] - d["start_date"]).days

        if should_accrue:
            cid = d.get("income_category_id")
            if not cid:
                print(f"⚠️ Пропущен вклад {d['name']}: не выбрана категория дохода")
                continue
            
            current_date = last_date
            while step_days > 0 and (today - current_date).days >= step_days:
                current_date += timedelta(days=step_days)

                # Считаем сумму
                if period == 'daily':
                    amount = float(d["amount"]) * (float(d["rate"]) / 100) / 365
                elif period == 'monthly':
                    amount = float(d["amount"]) * (float(d["rate"]) / 100) / 12
                else:
                    amount = float(d["amount"]) * (float(d["rate"]) / 100) * (step_days / 365)

                try:
                    # 1. Создаем доход
                    income_row = q(
                        "INSERT INTO incomes(date, category_id, description, amount) "
                        "VALUES(%s, %s, %s, %s) RETURNING id",
                        (current_date, cid, f'Автоначисление по вкладу "{d["name"]}"', amount),
                        fetch="one"
                    )
                    income_id = income_row["id"]

                    # 2. Записываем в историю
                    q("INSERT INTO deposit_interests(deposit_id, date, amount, paid_out, income_id) "
                      "VALUES(%s, %s, %s, TRUE, %s)",
                      (d["id"], current_date, amount, income_id))

                    if d.get("is_capitalized"):
                        q("UPDATE deposits SET amount = amount + %s WHERE id = %s", (amount, d["id"]))
                        d["amount"] = float(d["amount"]) + amount

                except errors.UniqueViolation:
                    # Если запись за этот день уже есть (сработал уникальный индекс)
                    print(f"ℹ️ Начисление за {current_date} по вкладу {d['name']} уже существует. Пропускаем.")
                    continue

                if period == 'end':
                    break