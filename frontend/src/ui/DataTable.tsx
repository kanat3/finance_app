import React, { useEffect, useMemo } from 'react'
import { Icon } from '@/icons'
import { Sort, SortDirection } from '@/api'

export type Col<T> = {
  key: string
  label: string
  width?: string
  align?: 'left' | 'right'
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  filterType?: 'text' | 'select' | 'number' | 'date'
  range?: boolean
  options?: string[]
  placeholder?: string
}

type Props<T> = {
  rows: T[]
  cols: Col<T>[]
  total: number
  totalAmount: number
  page: number
  pageSize: number
  sort: Sort[]
  filters: Record<string, string>
  activeFilters: number
  loading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onSortChange: (sort: Sort[]) => void
  onOpenFilters: () => void
  onClearFilters: () => void
  onRowClick?: (row: T) => void
  renderActions?: (row: T) => React.ReactNode
  emptyText?: string
}

export function DataTable<T extends { id: number }>({
  rows, cols, total, totalAmount, page, pageSize, sort, filters, activeFilters,
  loading, onPageChange, onPageSizeChange, onSortChange, onOpenFilters,
  onClearFilters, onRowClick, renderActions, emptyText = 'Нет данных',
}: Props<T>) {
  const [pageInput, setPageInput] = React.useState(String(page))
  useEffect(() => { setPageInput(String(page)) }, [page])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const gridCols = useMemo(
    () => cols.map((c) => c.width || '1fr').join(' ') + ' 84px',
    [cols],
  )

  const sortOf = (field: string) => sort.find((s) => s.field === field)
  const toggleSort = (field: string, withShift: boolean) => {
    const current = sortOf(field)
    const nextDir: SortDirection = current?.dir === 'asc' ? 'desc' : 'asc'
    if (withShift) {
      const others = sort.filter((s) => s.field !== field)
      onSortChange([...others, { field, dir: nextDir }])
    } else {
      onSortChange([{ field, dir: nextDir }])
    }
  }

  const hasFilters = cols.some((c) => c.filterType)

  return (
    <div className="data-table-wrap">
      <div className="data-summary">
        <span className="summary-found">
          {activeFilters > 0
            ? <>Найдено <b>{total}</b> · Сумма <b>{fmtMoney(totalAmount)}</b></>
            : <>Всего <b>{total}</b> · Сумма <b>{fmtMoney(totalAmount)}</b></>}
        </span>
        {hasFilters && (
          <button
            className={`toolbar-btn filter-trigger ${activeFilters > 0 ? 'has-active' : ''}`}
            onClick={onOpenFilters}
            title="Открыть фильтры"
          >
            <Icon name="filter" size={15} />
            <span>Фильтры</span>
            {activeFilters > 0 && <span className="filter-badge">{activeFilters}</span>}
          </button>
        )}
        {activeFilters > 0 && (
          <button className="summary-clear" onClick={onClearFilters}>
            <Icon name="x" size={12} /> Сбросить
          </button>
        )}
      </div>

      <div className="data-table">
        <div className="data-head" style={{ gridTemplateColumns: gridCols }}>
          {cols.map((c) => {
            const s = sortOf(c.key)
            return (
              <span
                key={c.key}
                style={{ textAlign: c.align }}
                className={c.sortable ? 'sortable' : ''}
                onClick={(e) => c.sortable && toggleSort(c.key, e.shiftKey)}
              >
                {c.label}
                {c.sortable && (
                  <span className="sort-indicator">
                    {s ? (s.dir === 'asc' ? '▲' : '▼') : '⇅'}
                    {sort.length > 1 && s ? <sup>{sort.findIndex((x) => x.field === c.key) + 1}</sup> : null}
                  </span>
                )}
              </span>
            )
          })}
          <span />
        </div>

        {loading && <div className="empty">Загрузка…</div>}
        {!loading && rows.length === 0 && <div className="empty">{emptyText}</div>}

        {!loading && rows.map((r) => (
          <div
            key={r.id}
            className="data-row"
            style={{ gridTemplateColumns: gridCols }}
            onClick={() => onRowClick?.(r)}
          >
            {cols.map((c) => (
              <span key={c.key} style={{ textAlign: c.align }}>
                {c.render ? c.render(r) : String((r as any)[c.key] ?? '')}
              </span>
            ))}
            <span className="row-actions" onClick={(e) => e.stopPropagation()}>
              {renderActions?.(r)}
            </span>
          </div>
        ))}
      </div>

      <div className="pagination">
        <div className="pagination-info">
          Показаны <b>{from}–{to}</b> из <b>{total}</b>
        </div>
        <div className="pagination-controls">
          <label className="page-size">
            На странице:
            <select value={pageSize} onChange={(e) => { onPageSizeChange(+e.target.value); onPageChange(1) }}>
              {[10, 25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button disabled={page <= 1} onClick={() => onPageChange(1)}>«</button>
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</button>
          <span className="page-indicator">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => onPageChange(Math.max(1, Math.min(totalPages, +pageInput || 1)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onPageChange(Math.max(1, Math.min(totalPages, +pageInput || 1)))
              }}
              className="page-input"
            />
            / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>›</button>
          <button disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>»</button>
        </div>
      </div>
    </div>
  )
}

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽'
}