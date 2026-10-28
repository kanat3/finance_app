import React from 'react'
import { MONTHS } from '@/api'

export function MonthChips({
  selected, onChange, withAll = true,
}: {
  selected: Set<number>
  onChange: (s: Set<number>) => void
  withAll?: boolean
}) {
  const toggle = (m: number) => {
    const next = new Set(selected)
    if (next.has(m)) next.delete(m)
    else next.add(m)
    onChange(next)
  }
  const allOn = selected.size === 0
  return (
    <div className="chips">
      {withAll && (
        <span className={`chip ${allOn ? 'all' : ''}`} onClick={() => onChange(new Set())}>
          Все
        </span>
      )}
      {MONTHS.map((m, i) => (
        <span
          key={m}
          className={`chip ${selected.has(i + 1) ? 'on' : ''}`}
          onClick={() => toggle(i + 1)}
        >
          {m}
        </span>
      ))}
    </div>
  )
}