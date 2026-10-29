import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import {
  api, Expense, Category, Subcategory, Sort, fmtMoney, fmtDate, ImportResult,
} from '@/api'
import { Icon } from '@/icons'
import { Modal, ConfirmModal } from '@/ui/Modal'
import { useToast } from '@/ui/Toast'
import { DataTable, Col } from '@/ui/DataTable'
import { ExportImport } from '@/ui/ExportMenu'
import { FilterModal } from '@/ui/FilterModal'

type Draft = {
  id?: number
  date: string
  category_id: number | null
  subcategory_id: number | null
  description: string
  amount: string
  comment: string
}

const emptyDraft = (): Draft => ({
  date: new Date().toISOString().slice(0, 10),
  category_id: null, subcategory_id: null,
  description: '', amount: '', comment: '',
})

export function ExpensesPage() {
  const toast = useToast()

  const [filtersOpen, setFiltersOpen] = useState(false)

  const [rows, setRows] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(false)

  const lastErrorRef = useRef<string | null>(null)
  const backoffUntilRef = useRef(0)

  const [cats, setCats] = useState<Category[]>([])
  const [subs, setSubs] = useState<Subcategory[]>([])

  // 🔹 состояние фильтров/пагинации/сортировки — всё живёт здесь
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<Sort[]>([{ field: 'date', dir: 'desc' }])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [del, setDel] = useState<Expense | null>(null)
  const [importRes, setImportRes] = useState<ImportResult | null>(null)

  // Категории/подкатегории — один раз
  useEffect(() => {
    Promise.all([api.expenseCategories(), api.expenseSubcategories()])
      .then(([c, s]) => { setCats(c); setSubs(s) })
  }, [])

  // Загрузка данных с сервера при любом изменении фильтров/сортировки/пагинации
  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    // не бьём в сеть, если недавно упали — ждём N секунд
    if (Date.now() < backoffUntilRef.current) return

    setLoading(true)
    try {
      const res = await api.expenses({
        description: filters.description || undefined,
        comment: filters.comment || undefined,
        category: filters.category || undefined,
        subcategory: filters.subcategory || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        date: filters.date || undefined,
        amount_min: filters.amount_min ? Number(filters.amount_min) : undefined,
        amount_max: filters.amount_max ? Number(filters.amount_max) : undefined,
        amount: filters.amount ? Number(filters.amount) : undefined,
        page, page_size: pageSize, sort,
      })
      setRows(res.items)
      setTotal(res.total)
      setTotalAmount(res.total_amount)
      lastErrorRef.current = null      // успех → сброс ошибки
    } catch (e: any) {
      backoffUntilRef.current = Date.now() + 5000  // 5 сек не дёргаем сеть
      if (!opts.silent && lastErrorRef.current !== e.message) {
        toast.show('Не удалось загрузить: ' + e.message, 'err')
        lastErrorRef.current = e.message
      }
    } finally {
      setLoading(false)
    }
  }, [filters, sort, page, pageSize, toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const id = setInterval(() => load({ silent: true }), 10_000)
    return () => clearInterval(id)
  }, [load])

  // Сброс страницы при смене фильтров
  useEffect(() => { setPage(1) }, [filters, pageSize])

  const setFilter = (key: string, value: string) => {
    setFilters((f) => {
      const next = { ...f }
      if (value) next[key] = value; else delete next[key]
      return next
    })
  }

  const clearFilters = () => {
    setFilters({})
    setSort([{ field: 'date', dir: 'desc' }])
    setPage(1)
  }

  const activeCount = useMemo(
    () => Object.values(filters).filter(v => v && v.trim()).length,
    [filters],
  )

  const cols: Col<Expense>[] = useMemo(() => [
    {
        key: 'date', label: 'Дата', width: '180px', sortable: true,
        filterType: 'date', range: true,       // ← два инпута «с / по»
        render: (r) => fmtDate(r.date),
    },
    {
        key: 'category', label: 'Категория', width: '1.1fr', sortable: true,
        filterType: 'select',
        options: cats.map((c) => c.name),
        render: (r) => r.category ?? '',
    },
    {
        key: 'subcategory', label: 'Подкатегория', width: '1.1fr', sortable: true,
        filterType: 'select',
        options: [...new Set(subs.map((s) => s.name))],
        render: (r) => r.subcategory ?? '',
    },
    {
        key: 'description', label: 'Описание', width: '1.4fr', sortable: true,
        filterType: 'text',
        render: (r) => r.description ?? '',
    },
    {
        key: 'amount', label: 'Сумма', width: '180px', sortable: true, align: 'right',
        filterType: 'number', range: true,     // ← два инпута «от / до»
        render: (r) => fmtMoney(r.amount),
    },
    {
        key: 'comment', label: 'Комментарий', width: '1fr', sortable: true,
        filterType: 'text',
        render: (r) => r.comment ?? '',
    },
  ], [cats, subs])

  const save = async () => {
    if (!draft) return
    if (!draft.date || !draft.category_id || !draft.amount) {
      toast.show('Заполните дату, категорию и сумму', 'err'); return
    }
    const payload = {
      date: draft.date,
      category_id: draft.category_id,
      subcategory_id: draft.subcategory_id,
      description: draft.description.trim() || null,
      amount: parseFloat(draft.amount) || 0,
      comment: draft.comment.trim() || null,
    }
    try {
      if (draft.id) await api.updateExpense(draft.id, payload)
      else await api.createExpense(payload)
      toast.show(draft.id ? 'Расход обновлён' : 'Расход добавлен', 'ok')
      setDraft(null); await load()
    } catch (e: any) { toast.show(e.message, 'err') }
  }

  const doDelete = async () => {
    if (!del) return
    try {
      await api.deleteExpense(del.id)
      toast.show('Расход удалён', 'ok'); setDel(null); await load()
    } catch (e: any) { toast.show(e.message, 'err') }
  }

  const importCsv = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = '.csv'
    inp.onchange = async () => {
      if (!inp.files?.length) return
      try {
        const r = await api.importExpenses(inp.files[0])
        setImportRes(r); await load()
      } catch (e: any) {
        setImportRes({ imported: 0, errors: [e.message], total_errors: 1 })
      }
    }
    inp.click()
  }

  const draftSubs = draft ? subs.filter((s) => s.category_id === draft.category_id) : []

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Раздел</p>
          <h1>Расходы</h1>
        </div>
        <div className="heading-actions">
          <ExportImport kind="expenses" onImport={importCsv} />
          <button className="add-button" onClick={() => setDraft(emptyDraft())}>
            <Icon name="plus" size={19} /><span>Добавить</span>
          </button>
        </div>
      </section>

      <DataTable
        rows={rows}
        cols={cols}
        total={total}
        totalAmount={totalAmount}
        page={page}
        pageSize={pageSize}
        sort={sort}
        filters={filters}
        activeFilters={activeCount}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onClearFilters={clearFilters}
        onOpenFilters={() => setFiltersOpen(true)}
        onRowClick={(r) => setDraft({
          id: r.id, date: r.date,
          category_id: r.category_id, subcategory_id: r.subcategory_id,
          description: r.description ?? '', amount: String(r.amount),
          comment: r.comment ?? '',
        })}
        renderActions={(r) => (
          <>
            <button onClick={() => setDraft({
              id: r.id, date: r.date,
              category_id: r.category_id, subcategory_id: r.subcategory_id,
              description: r.description ?? '', amount: String(r.amount),
              comment: r.comment ?? '',
            })}><Icon name="edit" size={14} /></button>
            <button onClick={() => setDel(r)}><Icon name="trash" size={14} /></button>
          </>
        )}
      />

      <FilterModal
        open={filtersOpen}
        cols={cols}
        filters={filters}
        onApply={setFilters}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
        categoriesForSub={(cat) => subs.filter(s => {
          const c = cats.find(x => x.name === cat)
          return c && s.category_id === c.id
        }).map(s => s.name)}
      />

      <Modal
        open={!!draft} onClose={() => setDraft(null)}
        title={draft?.id ? 'Изменить расход' : 'Добавить расход'}
        footer={<>
          <button onClick={() => setDraft(null)}>Отмена</button>
          <button className="primary" onClick={save}>Сохранить</button>
        </>}
      >
        {draft && <>
          <label>Дата</label>
          <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <label>Категория</label>
          <select value={draft.category_id ?? ''}
            onChange={(e) => setDraft({ ...draft, category_id: e.target.value ? +e.target.value : null, subcategory_id: null })}>
            <option value="">—</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label>Подкатегория</label>
          <select value={draft.subcategory_id ?? ''}
            onChange={(e) => setDraft({ ...draft, subcategory_id: e.target.value ? +e.target.value : null })}>
            <option value="">—</option>
            {draftSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label>Описание</label>
          <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <label>Сумма</label>
          <input type="number" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
          <label>Комментарий</label>
          <input value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} />
        </>}
      </Modal>

      <ConfirmModal
        open={!!del} title="Удалить расход?"
        message={del ? `«${del.description || del.category}» на сумму ${fmtMoney(del.amount)} за ${fmtDate(del.date)}. Действие необратимо.` : ''}
        onOk={doDelete} onCancel={() => setDel(null)}
      />

      <Modal
        open={!!importRes} onClose={() => setImportRes(null)}
        title="Импорт завершён"
        footer={<button className="primary" onClick={() => setImportRes(null)}>ОК</button>}
      >
        {importRes && <>
          <p>
            Добавлено: <b>{importRes.imported}</b>
            {importRes.skipped ? <><br />Пропущено как дубликаты: <b>{importRes.skipped}</b></> : null}
            {importRes.total_errors ? <><br />Ошибок: <b>{importRes.total_errors}</b></> : null}
          </p>
          {importRes.errors.length > 0 && (
            <div className="err-list">
              {importRes.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </>}
      </Modal>
    </>
  )
}