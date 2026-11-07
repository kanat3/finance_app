import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import {
  api, Expense, Category, Subcategory, Sort, fmtMoney, fmtDate, ImportResult,
} from '@/api'
import { Icon } from '@/icons'
import { Modal, ConfirmModal } from '@/ui/Modal'
import { useToast } from '@/ui/Toast'
import { SearchSelect } from '@/ui/SearchSelect'
import { NumberInput } from '@/ui/NumberInput'
import { DataTable, Col } from '@/ui/DataTable'
import { ExportImport } from '@/ui/ExportImport'
import { FilterModal } from '@/ui/FilterModal'
import { DateInput } from '@/ui/DateInput'
import { ImportPreviewModal, ImportRow } from '@/ui/ImportPreviewModal'

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

  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<Sort[]>([{ field: 'date', dir: 'desc' }])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [del, setDel] = useState<Expense | null>(null)
  
  const [importRes, setImportRes] = useState<ImportResult | null>(null)
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([])
  const [previewWarning, setPreviewWarning] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const [isAutoFilled, setIsAutoFilled] = useState(false)

  useEffect(() => {
    Promise.all([api.expenseCategories(), api.expenseSubcategories()])
      .then(([c, s]) => { setCats(c); setSubs(s) })
  }, [])

  // АВТОПОДСТАНОВКА КАТЕГОРИИ (ML) В МОДАЛКЕ
  useEffect(() => {
    if (!draft || draft.description.length < 3) return;

    // Если это новый расход и категория уже выбрана — не трогаем
    if (!draft.id && draft.category_id && !isAutoFilled) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/predict-category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: draft.description })
        });
        
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.confidence >= 50) {
          const cat = cats.find(c => c.name.toLowerCase() === data.category.toLowerCase());
          if (cat) {
            let subId = null;
            if (data.subcategory) {
              const sub = subs.find(s => 
                s.category_id === cat.id && 
                s.name.toLowerCase() === data.subcategory.toLowerCase()
              );
              if (sub) subId = sub.id;
            }

            setDraft(prev => {
              if (!prev) return null;
              if (prev.category_id === cat.id && prev.subcategory_id === subId) return prev;
              return { ...prev, category_id: cat.id, subcategory_id: subId };
            });
            setIsAutoFilled(true);
          }
        } else {
          setDraft(prev => {
            if (!prev) return null;
            if (!prev.category_id) return prev;
            return { ...prev, category_id: null, subcategory_id: null };
          });
          setIsAutoFilled(false);
        }
      } catch (e) {
        console.warn("ML predict failed", e);
      }
    }, 600);
    
    return () => clearTimeout(timer);
  }, [draft?.description, cats, subs, isAutoFilled]);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (Date.now() < backoffUntilRef.current) return
    const scrollY = window.scrollY
    if (!opts.silent) setLoading(true)

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
      lastErrorRef.current = null
    } catch (e: any) {
      backoffUntilRef.current = Date.now() + 5000
      if (!opts.silent && lastErrorRef.current !== e.message) {
        toast.show('Не удалось загрузить: ' + e.message, 'err')
        lastErrorRef.current = e.message
      }
    } finally {
      if (!opts.silent) setLoading(false)
      requestAnimationFrame(() => window.scrollTo(0, scrollY))
    }
  }, [filters, sort, page, pageSize, toast])

  useEffect(() => { load() }, [load])

  // WEBSOCKET
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'update' && data.kind === 'expenses') {
            load({ silent: true });
          }
        } catch (e) { console.warn(e) }
      };
      ws.onclose = () => { reconnectTimeout = setTimeout(connect, 3000); };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) { ws.onclose = null; ws.close(); }
    };
  }, [load]);

  useEffect(() => { setPage(1) }, [filters, pageSize])

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
    { key: 'date', label: 'Дата', width: '180px', sortable: true, filterType: 'date', range: true, render: (r) => fmtDate(r.date) },
    { key: 'category', label: 'Категория', width: '1.1fr', sortable: true, filterType: 'select', options: cats.map((c) => c.name), render: (r) => r.category ?? '' },
    { key: 'subcategory', label: 'Подкатегория', width: '1.1fr', sortable: true, filterType: 'select', options: [...new Set(subs.map((s) => s.name))], render: (r) => r.subcategory ?? '' },
    { key: 'description', label: 'Описание', width: '1.4fr', sortable: true, filterType: 'text', render: (r) => r.description ?? '' },
    { key: 'amount', label: 'Сумма', width: '180px', sortable: true, align: 'right', filterType: 'number', range: true, render: (r) => fmtMoney(r.amount) },
    { key: 'comment', label: 'Комментарий', width: '1fr', sortable: true, filterType: 'text', render: (r) => r.comment ?? '' },
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
      
      if (!draft.id && draft.description) {
        fetch('/api/feedback-train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: draft.description,
            category: cats.find(c => c.id === draft.category_id)?.name,
            subcategory: subs.find(s => s.id === draft.subcategory_id)?.name
          })
        }).catch(() => {})
      }

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

  const importCsv = (format: 'xlsx' | 'csv' = 'csv') => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = format === 'xlsx' ? '.xlsx,.xls' : '.csv,.txt'
    
    inp.onchange = () => {
      if (!inp.files?.length) return
      
      api.previewImport(inp.files[0])
        .then(res => {
          setPreviewRows(res.rows)
          setPreviewWarning(res.warning || null)
          setIsPreviewOpen(true)
        })
        .catch(err => toast.show(err.message, 'err'))
    }
    inp.click()
  }

  const handleSaveImported = async (editedRows: ImportRow[]) => {
    try {
      for (const row of editedRows) {
        const catName = row.category.trim();
        if (!catName) continue;

        let cat = cats.find(c => c.name.toLowerCase() === catName.toLowerCase());
        
        if (!cat) {
          try {
            const newCat = await api.createExpenseCategory({ name: catName });
            cat = newCat;
            setCats(prev => [...prev, newCat]);
          } catch (e) {
            console.warn(`Не удалось создать категорию ${catName}`, e);
            continue;
          }
        }

        if (!cat) continue;

        let subId = null;
        const subName = row.subcategory?.trim();
        
        if (subName) {
          let sub = subs.find(s => 
            s.category_id === cat.id && 
            s.name.toLowerCase() === subName.toLowerCase()
          );

          if (!sub) {
            try {
              const newSub = await api.createExpenseSubcategory({ 
                category_id: cat.id, 
                name: subName 
              });
              sub = newSub;
              setSubs(prev => [...prev, newSub]);
            } catch (e) {
              console.warn(`Не удалось создать подкатегорию ${subName}`, e);
            }
          }
          
          if (sub) subId = sub.id;
        }

        await api.createExpense({
          date: row.date,
          category_id: cat.id,
          subcategory_id: subId,
          description: row.description || null,
          amount: parseFloat(row.amount as string) || 0,
          comment: row.comment || null,
        });
      }
      
      toast.show(`Успешно импортировано: ${editedRows.length}`, 'ok');
      setIsPreviewOpen(false);
      setPreviewRows([]);
      setPreviewWarning(null);
      await load();
      
    } catch (e: any) {
      toast.show('Ошибка при сохранении: ' + e.message, 'err');
      throw e;
    }
  }

  const predictRowCategory = async (rowId: string, description: string) => {
    try {
      const res = await fetch('/api/predict-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      
      if (!res.ok) return null;
      const data = await res.json();
      
      if (data.confidence >= 50) {
        return { 
          category: data.category, 
          subcategory: data.subcategory || '' 
        };
      }
    } catch (e) {
      console.warn("Row ML predict failed", e);
    }
    return null;
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
        {draft && (
          <div className="modal-form">
            <div className="modal-field">
              <label>Дата</label>
              <DateInput value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
            </div>
            <div className="modal-field">
              <label>Категория</label>
              <SearchSelect
                value={draft.category_id ? (cats.find(c => c.id === draft.category_id)?.name ?? '') : ''}
                onChange={(name) => {
                  const c = cats.find(x => x.name === name) ?? null
                  setIsAutoFilled(false);
                  setDraft({ ...draft, category_id: c?.id ?? null, subcategory_id: null })
                }}
                options={cats.map(c => c.name)}
                placeholder="Выберите категорию"
              />
            </div>
            <div className="modal-field">
              <label>Подкатегория</label>
              <SearchSelect
                value={draft.subcategory_id ? (draftSubs.find(s => s.id === draft.subcategory_id)?.name ?? '') : ''}
                onChange={(name) => {
                  const s = draftSubs.find(x => x.name === name) ?? null
                  setDraft({ ...draft, subcategory_id: s?.id ?? null })
                }}
                options={draftSubs.map(s => s.name)}
                placeholder={draft.category_id ? 'Выберите подкатегорию' : 'Сначала выберите категорию'}
              />
            </div>
            <div className="modal-field">
              <label>Описание</label>
              <input 
                className="text-input" 
                value={draft.description} 
                onChange={(e) => {
                  setIsAutoFilled(false); // Сбрасываем при ручном вводе
                  setDraft({ ...draft, description: e.target.value });
                }} 
              />
            </div>
            <div className="modal-field">
              <label>Сумма</label>
              <NumberInput value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} placeholder="0" />
            </div>
            <div className="modal-field">
              <label>Комментарий</label>
              <input className="text-input" value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!del} title="Удалить расход?"
        message={del ? `«${del.description || del.category}» на сумму ${fmtMoney(del.amount)} за ${fmtDate(del.date)}. Действие необратимо.` : ''}
        onOk={doDelete} onCancel={() => setDel(null)}
      />

      <ImportPreviewModal
        open={isPreviewOpen}
        rows={previewRows}
        warning={previewWarning}
        onClose={() => setIsPreviewOpen(false)}
        onSave={handleSaveImported}
        type="expenses"
        categories={cats}
        subcategories={subs}
        onPredictRow={predictRowCategory}
      />
    </>
  )
}