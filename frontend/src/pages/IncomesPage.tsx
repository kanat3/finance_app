import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import {
  api, Income, Category, Sort, fmtMoney, fmtDate, ImportResult,
} from '@/api'
import { Icon } from '@/icons'
import { Modal, ConfirmModal } from '@/ui/Modal'
import { useToast } from '@/ui/Toast'
import { SearchSelect } from '@/ui/SearchSelect' // <-- Импортируем SearchSelect
import { DataTable, Col } from '@/ui/DataTable'
import { ExportImport } from '@/ui/ExportImport'
import { FilterModal } from '@/ui/FilterModal'
import { DateInput } from '@/ui/DateInput'
import { ImportPreviewModal, ImportRow } from '@/ui/ImportPreviewModal'

type Draft = {
  id?: number
  date: string
  category_id: number | null
  description: string
  amount: string
  comment: string
}

const emptyDraft = (): Draft => ({
  date: new Date().toISOString().slice(0, 10),
  category_id: null, description: '', amount: '', comment: '',
})

export function IncomesPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Income[]>([])
  const [total, setTotal] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [cats, setCats] = useState<Category[]>([])

  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<Sort[]>([{ field: 'date', dir: 'desc' }])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const lastErrorRef = useRef<string | null>(null)
  const backoffUntilRef = useRef(0)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [del, setDel] = useState<Income | null>(null)

  const [importRes, setImportRes] = useState<ImportResult | null>(null)
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([])
  const [previewWarning, setPreviewWarning] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const [isAutoFilled, setIsAutoFilled] = useState(false)

  useEffect(() => { api.incomeCategories().then(setCats) }, [])

  // АВТОПОДСТАНОВКА КАТЕГОРИИ (ML) В МОДАЛКЕ
  useEffect(() => {
    if (!draft || draft.description.length < 3) return;

    // Если это новый доход и категория уже выбрана — не трогаем
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
            setDraft(prev => {
              if (!prev) return null;
              if (prev.category_id === cat.id) return prev;
              return { ...prev, category_id: cat.id };
            });
            setIsAutoFilled(true);
          } else {
            console.warn(`ML вернул категорию "${data.category}", но её нет в справочнике. Доступные: ${cats.map(c => c.name).join(', ')}`);
          }
        } else {
          // Если модель не уверена, а категорию ставили мы — сбрасываем
          setDraft(prev => {
            if (!prev) return null;
            if (!prev.category_id) return prev;
            return { ...prev, category_id: null };
          });
          setIsAutoFilled(false);
        }
      } catch (e) {
        console.warn("ML predict failed", e);
      }
    }, 600);
    
    return () => clearTimeout(timer);
  }, [draft?.description, cats, isAutoFilled]);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (Date.now() < backoffUntilRef.current) return

    const scrollY = window.scrollY
    if (!opts.silent) setLoading(true)

    try {
      const res = await api.incomes({
        description: filters.description || undefined,
        comment: filters.comment || undefined,
        category: filters.category || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        amount_min: filters.amount_min ? Number(filters.amount_min) : undefined,
        amount_max: filters.amount_max ? Number(filters.amount_max) : undefined,
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
          if (data.event === 'update' && data.kind === 'incomes') {
            load({ silent: true });
          }
        } catch (e) { console.warn(e) }
      };
      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };
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

  const cols: Col<Income>[] = useMemo(() => [
    { key: 'date', label: 'Дата', width: '180px', sortable: true, filterType: 'date', range: true, render: (r) => fmtDate(r.date) },
    { key: 'category', label: 'Категория', width: '1.2fr', sortable: true, filterType: 'select', options: cats.map((c) => c.name), render: (r) => r.category ?? '' },
    { key: 'description', label: 'Описание', width: '1.5fr', sortable: true, filterType: 'text', render: (r) => r.description ?? '' },
    { key: 'amount', label: 'Сумма', width: '180px', sortable: true, align: 'right', filterType: 'number', range: true, render: (r) => fmtMoney(r.amount) },
    { key: 'comment', label: 'Комментарий', width: '1fr', sortable: true, filterType: 'text', render: (r) => r.comment ?? '' },
  ], [cats])

  const save = async () => {
    if (!draft) return
    if (!draft.date || !draft.category_id || !draft.amount) {
      toast.show('Заполните дату, категорию и сумму', 'err'); return
    }
    const payload = {
      date: draft.date, category_id: draft.category_id,
      description: draft.description.trim() || null,
      amount: parseFloat(draft.amount) || 0,
      comment: draft.comment.trim() || null,
    }
    try {
      if (draft.id) await api.updateIncome(draft.id, payload)
      else await api.createIncome(payload)
      
      if (!draft.id && draft.description) {
        fetch('/api/feedback-train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: draft.description,
            category: cats.find(c => c.id === draft.category_id)?.name,
            subcategory: null
          })
        }).catch(() => {})
      }

      toast.show(draft.id ? 'Доход обновлён' : 'Доход добавлен', 'ok')
      setDraft(null); await load()
    } catch (e: any) { toast.show(e.message, 'err') }
  }

  const doDelete = async () => {
    if (!del) return
    try {
      await api.deleteIncome(del.id)
      toast.show('Доход удалён', 'ok'); setDel(null); await load()
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
            const newCat = await api.createIncomeCategory({ name: catName });
            cat = newCat;
            setCats(prev => [...prev, newCat]);
          } catch (e) {
            console.warn(`Не удалось создать категорию ${catName}`, e);
            continue;
          }
        }

        if (!cat) continue;

        await api.createIncome({
          date: row.date,
          category_id: cat.id,
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

  return (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">Раздел</p><h1>Доходы</h1></div>
        <div className="heading-actions">
          <ExportImport kind="incomes" onImport={importCsv} />
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
          id: r.id, date: r.date, category_id: r.category_id,
          description: r.description ?? '', amount: String(r.amount), comment: r.comment ?? '',
        })}
        renderActions={(r) => (
          <>
            <button onClick={() => setDraft({
              id: r.id, date: r.date, category_id: r.category_id,
              description: r.description ?? '', amount: String(r.amount), comment: r.comment ?? '',
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
        categoriesForSub={() => []}
      />

      <Modal
        open={!!draft} onClose={() => setDraft(null)}
        title={draft?.id ? 'Изменить доход' : 'Добавить доход'}
        footer={<>
          <button onClick={() => setDraft(null)}>Отмена</button>
          <button className="primary" onClick={save}>Сохранить</button>
        </>}
      >
        {draft && (
          <div className="modal-form">
            <div className="modal-field">
              <label>Дата</label>
              <DateInput value={draft.date} onChange={(val) => setDraft({ ...draft, date: val })} />
            </div>
            
            <div className="modal-field">
              <label>Категория</label>
              <SearchSelect
                value={draft.category_id ? (cats.find(c => c.id === draft.category_id)?.name ?? '') : ''}
                onChange={(name) => {
                  const c = cats.find(x => x.name === name) ?? null;
                  setIsAutoFilled(false);
                  setDraft({ ...draft, category_id: c?.id ?? null });
                }}
                options={cats.map(c => c.name)}
                placeholder="Выберите категорию"
              />
            </div>

            <div className="modal-field">
              <label>Описание</label>
              <input 
                className="text-input" 
                value={draft.description} 
                onChange={(e) => {
                  setIsAutoFilled(false);
                  setDraft({ ...draft, description: e.target.value });
                }} 
              />
            </div>
            <div className="modal-field">
              <label>Сумма</label>
              <input className="text-input" type="number" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
            </div>
            <div className="modal-field">
              <label>Комментарий</label>
              <input className="text-input" value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!del} title="Удалить доход?"
        message={del ? `«${del.description || del.category}» на сумму ${fmtMoney(del.amount)} за ${fmtDate(del.date)}. Действие необратимо.` : ''}
        onOk={doDelete} onCancel={() => setDel(null)}
      />

      <ImportPreviewModal
        open={isPreviewOpen}
        rows={previewRows}
        warning={previewWarning}
        onClose={() => setIsPreviewOpen(false)}
        onSave={handleSaveImported}
        type="incomes"
        categories={cats}
        onPredictRow={predictRowCategory}
      />
    </>
  )
}