export const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export type Expense = {
  id: number
  date: string
  description: string | null
  amount: number
  comment: string | null
  category_id: number | null
  category: string | null
  subcategory_id: number | null
  subcategory: string | null
}

export type Income = {
  id: number
  date: string
  description: string | null
  amount: number
  comment: string | null
  category_id: number | null
  category: string | null
}

export type Category = { id: number; name: string }
export type Subcategory = { id: number; category_id: number; name: string }

export type Stats = {
  expenses_by_month: { m: number; s: number }[]
  incomes_by_month: { m: number; s: number }[]
  expenses_by_category: { name: string; s: number }[]
  expenses_by_subcategory: { name: string; s: number }[]
  incomes_by_category: { name: string; s: number }[]
}

export type ImportResult = {
  imported: number
  skipped?: number
  errors: string[]
  total_errors: number
}

export type Paged<T> = {
  items: T[]
  total: number
  total_amount: number
  page: number
  page_size: number
}

export type SortDirection = 'asc' | 'desc'
export type Sort = { field: string; dir: SortDirection }

export type Period =
  | { kind: 'month'; index: number }
  | { kind: 'range'; from: number; to: number }
  | { kind: 'all' }

export function periodMonths(p: Period): number[] {
  if (p.kind === 'month') return [p.index + 1]
  if (p.kind === 'range') {
    const out: number[] = []
    for (let m = p.from; m <= p.to; m++) out.push(m)
    return out
  }
  return []
}

export function periodLabel(p: Period): string {
  if (p.kind === 'month') return MONTHS[p.index]
  if (p.kind === 'range') {
    if (p.from === p.to) return MONTHS[p.from - 1]
    return `${MONTHS[p.from - 1]} – ${MONTHS[p.to - 1]}`
  }
  return 'Всё время'
}

export type ExpenseFilters = {
  months?: number[]
  category_id?: number | null
  subcategory_id?: number | null
  category?: string
  subcategory?: string
  description?: string
  comment?: string
  date?: string
  date_from?: string
  date_to?: string
  amount?: number
  amount_min?: number
  amount_max?: number
  search?: string
  page?: number
  page_size?: number
  sort?: Sort[]
}

export type IncomeFilters = {
  months?: number[]
  category_id?: number | null
  category?: string
  description?: string
  comment?: string
  date?: string
  date_from?: string
  date_to?: string
  amount?: number
  amount_min?: number
  amount_max?: number
  search?: string
  page?: number
  page_size?: number
  sort?: Sort[]
}

function qs(obj: Record<string, any>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      if (v.length === 0) continue
      if (typeof v[0] === 'object' && v[0]?.field) {
        p.set(k, v.map((s: Sort) => `${s.field}:${s.dir}`).join(','))
      } else {
        p.set(k, v.join(','))
      }
    } else {
      p.set(k, String(v))
    }
  }
  const s = p.toString()
  return s ? '?' + s : ''
}

let _offlineUntil = 0
const OFFLINE_COOLDOWN_MS = 3000   // после ошибки 3 сек не бьём в сеть

async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  if (Date.now() < _offlineUntil) {
    throw new Error('Бэкенд недоступен — повтор через несколько секунд')
  }

  let r: Response
  try {
    r = await fetch(url, opts)
  } catch (e: any) {
    _offlineUntil = Date.now() + OFFLINE_COOLDOWN_MS
    throw new Error('Нет связи с сервером')
  }

  if (!r.ok) {
    const txt = await r.text()
    let msg = txt
    try { const j = JSON.parse(txt); msg = j.error || j.message || txt } catch {}
    // 5xx = сервер сломан, тоже считаем «оффлайн»
    if (r.status >= 500) _offlineUntil = Date.now() + OFFLINE_COOLDOWN_MS
    throw new Error(msg || `HTTP ${r.status}`)
  }
  return r.json() as Promise<T>
}

// сбросить «оффлайн» при следующем ручном действии
export const resetOffline = () => { _offlineUntil = 0 }

export const api = {
  // EXPENSES
  expenses: (f: ExpenseFilters = {}) =>
    req<Paged<Expense>>('/api/expenses' + qs(f)),
  createExpense: (d: Partial<Expense>) =>
    req<{ id: number }>('/api/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
    }),
  updateExpense: (id: number, d: Partial<Expense>) =>
    req('/api/expenses/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
    }),
  deleteExpense: (id: number) => req('/api/expenses/' + id, { method: 'DELETE' }),

  // INCOMES
  incomes: (f: IncomeFilters = {}) =>
    req<Paged<Income>>('/api/incomes' + qs(f)),
  createIncome: (d: Partial<Income>) =>
    req<{ id: number }>('/api/incomes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
    }),
  updateIncome: (id: number, d: Partial<Income>) =>
    req('/api/incomes/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
    }),
  deleteIncome: (id: number) => req('/api/incomes/' + id, { method: 'DELETE' }),

  // REFS
  expenseCategories: () => req<Category[]>('/api/refs/expense-categories'),
  addExpenseCategory: (name: string) =>
    req<Category>('/api/refs/expense-categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    }),
  renameExpenseCategory: (id: number, name: string) =>
    req('/api/refs/expense-categories/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    }),
  deleteExpenseCategory: (id: number) =>
    req('/api/refs/expense-categories/' + id, { method: 'DELETE' }),

  expenseSubcategories: (categoryId?: number) => {
    const q = categoryId ? `?category_id=${categoryId}` : ''
    return req<Subcategory[]>('/api/refs/expense-subcategories' + q)
  },
  addSubcategory: (category_id: number, name: string) =>
    req<Subcategory>('/api/refs/expense-subcategories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id, name }),
    }),
  renameSubcategory: (id: number, name: string) =>
    req('/api/refs/expense-subcategories/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    }),
  deleteSubcategory: (id: number) =>
    req('/api/refs/expense-subcategories/' + id, { method: 'DELETE' }),

  incomeCategories: () => req<Category[]>('/api/refs/income-categories'),
  addIncomeCategory: (name: string) =>
    req<Category>('/api/refs/income-categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    }),
  renameIncomeCategory: (id: number, name: string) =>
    req('/api/refs/income-categories/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    }),
  deleteIncomeCategory: (id: number) =>
    req('/api/refs/income-categories/' + id, { method: 'DELETE' }),

  // STATS
  stats: (months: number[]) => {
    const q = months.length ? '?months=' + months.join(',') : ''
    return req<Stats>('/api/stats' + q)
  },

  // IMPORT
  importExpenses: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return req<ImportResult>('/api/import/expenses', { method: 'POST', body: fd })
  },
  importIncomes: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return req<ImportResult>('/api/import/incomes', { method: 'POST', body: fd })
  },

  // EXPORT / BACKUP
  exportUrl: (kind: 'expenses' | 'incomes' | 'refs', fmt: 'csv' | 'xlsx') =>
    `/api/export/${kind}.${fmt}`,
  backupUrl: () => '/api/backup',
}

export const fmtMoney = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽'

export const fmtCompact = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (a >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K'
  return String(Math.round(n))
}

export const fmtDate = (s: string) => {
  const d = new Date(s + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function niceStep(max: number): number {
  if (max <= 0) return 1
  const target = max / 5
  const exp = Math.floor(Math.log10(target))
  const base = Math.pow(10, exp)
  const norm = target / base
  let mult = 1
  if (norm <= 1) mult = 1
  else if (norm <= 2) mult = 2
  else if (norm <= 5) mult = 5
  else mult = 10
  return mult * base
}