import React from 'react'
import { Icon } from '@/icons'

export function Pagination({
  page, pageSize, total, onPage, onPageSize,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
  onPageSize: (n: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="pagination">
      <div className="pagination-info">
        Показаны <b>{from}–{to}</b> из <b>{total}</b>
      </div>
      <div className="pagination-controls">
        <label className="page-size">
          На странице:
          <select value={pageSize} onChange={(e) => { onPageSize(+e.target.value); onPage(1) }}>
            {[10, 25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button disabled={page <= 1} onClick={() => onPage(1)}>«</button>
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="page-indicator">{page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <Icon name="chevron" size={14} />
        </button>
        <button disabled={page >= pages} onClick={() => onPage(pages)}>»</button>
      </div>
    </div>
  )
}