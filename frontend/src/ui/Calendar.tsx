import React, { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/icons'

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function iso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function Calendar({
  value, onChange, min, max, onClose,
}: {
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
  onClose: () => void
}) {
  const selected = parseISO(value)
  const [cursor, setCursor] = useState<Date>(selected ?? new Date())

  useEffect(() => {
    const s = parseISO(value)
    if (s) setCursor(s)
  }, [value])

  const minDate = parseISO(min || '')
  const maxDate = parseISO(max || '')

  const { year, month } = { year: cursor.getFullYear(), month: cursor.getMonth() }

  const grid = useMemo(() => {
    const first = new Date(year, month, 1)
    const startWeekday = (first.getDay() + 6) % 7   // 0 = Пн
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < startWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isDisabled = (d: Date) => {
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  const isSelected = (d: Date) =>
    !!selected &&
    d.getFullYear() === selected.getFullYear() &&
    d.getMonth() === selected.getMonth() &&
    d.getDate() === selected.getDate()

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()

  const shift = (delta: number) => {
    const n = new Date(year, month + delta, 1)
    setCursor(n)
  }

  const pick = (d: Date) => {
    if (isDisabled(d)) return
    onChange(iso(d))
    onClose()
  }

  const clear = () => {
    onChange('')
    onClose()
  }

  return (
    <div className="cal" onMouseDown={(e) => e.stopPropagation()}>
      <div className="cal-head">
        <button type="button" className="cal-nav cal-prev" onClick={() => shift(-1)}>
            <Icon name="chevron" size={14} />
        </button>
        <div className="cal-title">
          <button
            type="button"
            className="cal-title-btn"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            {MONTHS_RU[month]}
          </button>
          <button
            type="button"
            className="cal-title-btn year"
            onClick={() => setCursor(new Date(year, month, 1))}
          >
            {year}
          </button>
        </div>
        <button type="button" className="cal-nav" onClick={() => shift(1)}>
          <Icon name="chevron" size={14} />
        </button>
      </div>

      <div className="cal-weekdays">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>

      <div className="cal-grid">
        {grid.map((d, i) => {
          if (!d) return <span key={i} className="cal-cell empty" />
          const disabled = isDisabled(d)
          const sel = isSelected(d)
          const t = isToday(d)
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              className={
                'cal-cell' +
                (sel ? ' selected' : '') +
                (t && !sel ? ' today' : '') +
                (disabled ? ' disabled' : '')
              }
              onClick={() => pick(d)}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>

      <div className="cal-footer">
        <button type="button" className="cal-clear" onClick={clear}>
          Очистить
        </button>
        <button
          type="button"
          className="cal-today"
          onClick={() => pick(new Date())}
        >
          Сегодня
        </button>
      </div>
    </div>
  )
}