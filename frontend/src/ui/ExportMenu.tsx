import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '@/icons'

export function ExportImport({
  kind, onImport,
}: {
  kind: 'expenses' | 'incomes' | 'refs'
  onImport?: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const download = (fmt: 'xlsx' | 'csv') => {
    setOpen(false)
    window.open(`/api/export/${kind}.${fmt}`)
  }

  return (
    <div className="export-menu" ref={ref}>
      <button
        className="toolbar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="download" size={15} />
        <span>Экспорт</span>
        <span className={`toolbar-caret ${open ? 'open' : ''}`}>
          <Icon name="chevron" size={11} />
        </span>
      </button>

      {open && (
        <div className="export-dropdown" role="menu">
          <button className="export-item" role="menuitem" onClick={() => download('xlsx')}>
            <span className="export-item-icon xlsx">
              <Icon name="download" size={14} />
            </span>
            <span className="export-item-body">
              <span className="export-item-title">Excel</span>
              <span className="export-item-sub">.xlsx</span>
            </span>
          </button>
          <button className="export-item" role="menuitem" onClick={() => download('csv')}>
            <span className="export-item-icon csv">
              <Icon name="download" size={14} />
            </span>
            <span className="export-item-body">
              <span className="export-item-title">CSV</span>
              <span className="export-item-sub">.csv, разделитель ;</span>
            </span>
          </button>
        </div>
      )}

      {onImport && (
        <button className="toolbar-btn" onClick={onImport}>
          <Icon name="upload" size={15} />
          <span>Импорт</span>
        </button>
      )}
    </div>
  )
}