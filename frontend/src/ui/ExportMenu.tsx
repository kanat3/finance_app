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
      <button className="toolbar-btn" onClick={() => setOpen((v) => !v)}>
        <Icon name="download" size={16} /> Экспорт <Icon name="chevron" size={12} />
      </button>
      {open && (
        <div className="export-dropdown">
          <button onClick={() => download('xlsx')}>Скачать Excel</button>
          <button onClick={() => download('csv')}>Скачать CSV</button>
        </div>
      )}
      {onImport && (
        <button className="toolbar-btn" onClick={onImport}>
          <Icon name="upload" size={16} /> Импорт
        </button>
      )}
    </div>
  )
}