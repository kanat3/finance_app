import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '@/icons'

export type RangeValue = { from: string; to: string }

/**
 * Компактный фильтр-диапазон для колонки таблицы.
 * В свёрнутом виде — кнопка с текущим значением.
 * В раскрытом — поповер с двумя полями и явными подписями «От / До».
 */
export function RangeFilter({
  type, value, onChange, placeholder,
}: {
  type: 'date' | 'number'
  value: RangeValue
  onChange: (v: RangeValue) => void
  placeholder?: string
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

  const label = () => {
    const { from, to } = value
    if (!from && !to) return placeholder || 'Все'
    if (from && to) return `${display(from)} – ${display(to)}`
    if (from) return `от ${display(from)}`
    return `до ${display(to)}`
  }

  const display = (v: string) => {
    if (!v) return ''
    if (type === 'date') {
      // ISO → DD.MM.YYYY
      const [y, m, d] = v.split('-')
      return d && m && y ? `${d}.${m}.${y}` : v
    }
    return v
  }

  const hasValue = !!(value.from || value.to)

  return (
    <div className="range-filter" ref={ref}>
      <button
        type="button"
        className={`range-trigger ${hasValue ? 'has-value' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="range-label">{label()}</span>
        <span className="range-caret">
          <Icon name="chevron" size={11} />
        </span>
      </button>

      {open && (
        <div className="range-popover">
          <div className="range-field">
            <label>От</label>
            <input
              type={type}
              value={value.from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              autoFocus
            />
          </div>
          <div className="range-field">
            <label>До</label>
            <input
              type={type}
              value={value.to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </div>
          <div className="range-actions">
            <button
              type="button"
              className="range-clear"
              onClick={() => { onChange({ from: '', to: '' }); setOpen(false) }}
            >
              Очистить
            </button>
            <button
              type="button"
              className="range-apply"
              onClick={() => setOpen(false)}
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  )
}