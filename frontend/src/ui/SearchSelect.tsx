import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/icons'

export function SearchSelect({
  value, onChange, options, placeholder, emptyText = 'Ничего не найдено',
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  emptyText?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => { setHighlight(0) }, [query, open])

  const pick = (v: string) => {
    onChange(v)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="ss" ref={ref}>
      <button
        type="button"
        className={`ss-trigger ${value ? 'has-value' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ss-value">{value || placeholder || 'Все'}</span>
        {value ? (
          <span
            className="ss-clear"
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            title="Очистить"
          >
            <Icon name="x" size={12} />
          </span>
        ) : (
          <span className="ss-caret"><Icon name="chevron" size={11} /></span>
        )}
      </button>

      {open && (
        <div className="ss-popover">
          <div className="ss-search">
            <Icon name="search" size={14} />
            <input
              type="text"
              autoFocus
              placeholder="Поиск…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setHighlight((h) => Math.min(h + 1, filtered.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setHighlight((h) => Math.max(h - 1, 0))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  if (filtered[highlight]) pick(filtered[highlight])
                } else if (e.key === 'Escape') {
                  setOpen(false)
                }
              }}
            />
          </div>
          <div className="ss-options">
            <button
              type="button"
              className={`ss-option ${!value ? 'selected' : ''}`}
              onClick={() => pick('')}
            >Все</button>
            {filtered.length === 0 && (
              <div className="ss-empty">{emptyText}</div>
            )}
            {filtered.map((o, i) => (
              <button
                type="button"
                key={o}
                className={`ss-option ${value === o ? 'selected' : ''} ${highlight === i ? 'highlight' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(o)}
              >{o}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}