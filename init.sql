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

CREATE INDEX IF NOT EXISTS idx_expenses_date  ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_cat   ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date   ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_cat    ON incomes(category_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_expenses_natural
    ON expenses(date, category_id, subcategory_id, amount, COALESCE(description,''), COALESCE(comment,''));

CREATE UNIQUE INDEX IF NOT EXISTS uq_incomes_natural
    ON incomes(date, category_id, amount, COALESCE(description,''), COALESCE(comment,''));