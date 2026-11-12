-- ============================================================
-- 1. Справочники
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_subcategories (
    id          SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    UNIQUE (category_id, name)
);

CREATE TABLE IF NOT EXISTS income_categories (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- ============================================================
-- 2. Транзакции
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
    id             SERIAL PRIMARY KEY,
    date           DATE NOT NULL,
    category_id    INTEGER REFERENCES expense_categories(id)    ON DELETE SET NULL,
    subcategory_id INTEGER REFERENCES expense_subcategories(id) ON DELETE SET NULL,
    description    TEXT,
    amount         NUMERIC(14, 2) NOT NULL,
    comment        TEXT
);

CREATE TABLE IF NOT EXISTS incomes (
    id          SERIAL PRIMARY KEY,
    date        DATE NOT NULL,
    category_id INTEGER REFERENCES income_categories(id) ON DELETE SET NULL,
    description TEXT,
    amount      NUMERIC(14, 2) NOT NULL,
    comment     TEXT
);

-- ============================================================
-- 3. Вклады
-- ============================================================
CREATE TABLE IF NOT EXISTS deposits (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    bank                VARCHAR(100),
    amount              NUMERIC(14, 2) NOT NULL,
    rate                NUMERIC(5, 2) NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE,
    accrue_period       VARCHAR(20) DEFAULT 'monthly',
    is_capitalized      BOOLEAN DEFAULT FALSE,
    is_active           BOOLEAN DEFAULT TRUE,
    auto_accrue         BOOLEAN DEFAULT FALSE,
    income_category_id  INTEGER REFERENCES income_categories(id) ON DELETE SET NULL,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. Инвестиции
-- ============================================================
CREATE TABLE IF NOT EXISTS investments (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    ticker          VARCHAR(10),
    quantity        NUMERIC(14, 4) NOT NULL,
    avg_price       NUMERIC(14, 2) NOT NULL,
    current_price   NUMERIC(14, 2),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 5. История начислений (С income_id!)
-- ============================================================
CREATE TABLE IF NOT EXISTS deposit_interests (
    id              SERIAL PRIMARY KEY,
    deposit_id      INTEGER REFERENCES deposits(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    amount          NUMERIC(14, 2) NOT NULL,
    paid_out        BOOLEAN DEFAULT FALSE,
    income_id       INTEGER REFERENCES incomes(id) ON DELETE SET NULL -- <-- ДОБАВИТЬ
);

-- ============================================================
-- 6. Индексы
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_expenses_date  ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_cat   ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date   ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_cat    ON incomes(category_id);
CREATE INDEX IF NOT EXISTS idx_deposits_active ON deposits(is_active);
CREATE INDEX IF NOT EXISTS idx_deposit_interests_deposit ON deposit_interests(deposit_id);

-- ============================================================
-- 7. Защита от дубликатов
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_expenses_natural
    ON expenses(date, category_id, subcategory_id, amount, COALESCE(description,''), COALESCE(comment,''));

CREATE UNIQUE INDEX IF NOT EXISTS uq_incomes_natural
    ON incomes(date, category_id, amount, COALESCE(description,''), COALESCE(comment,''));

CREATE UNIQUE INDEX IF NOT EXISTS uq_deposit_interest_day 
    ON deposit_interests (deposit_id, date);

-- ============================================================
-- 8. СТАРТОВЫЕ ДАННЫЕ (С ЖЁСТКИМИ ID ДЛЯ ТЕСТОВ)
-- ============================================================
TRUNCATE TABLE income_categories, expense_categories RESTART IDENTITY CASCADE;

INSERT INTO income_categories (id, name) VALUES
    (1, 'Зарплата'),
    (2, 'Кэшбэк'),
    (3, 'Проценты по вкладам'),
    (4, 'Фриланс'),
    (5, 'Инвестиции'),
    (6, 'Прочее')
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, name) VALUES
    (1, 'Продукты'),
    (2, 'Транспорт'),
    (3, 'Рестораны'),
    (4, 'Развлечения'),
    (5, 'Здоровье'),
    (6, 'Спорт'),
    (7, 'Ежемесячное'),
    (8, 'Долги'),
    (9, 'Путешествия'),
    (10, 'Разное')
ON CONFLICT (id) DO NOTHING;

-- Синхронизируем последовательности
SELECT setval('income_categories_id_seq', (SELECT MAX(id) FROM income_categories));
SELECT setval('expense_categories_id_seq', (SELECT MAX(id) FROM expense_categories));