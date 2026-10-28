import React from 'react'
import { Icon } from '@/icons'
import { MONTHS } from '@/api'

export function MonthPicker({
  index, onChange,
}: {
  index: number
  onChange: (i: number) => void
}) {
  const prev = (index - 1 + MONTHS.length) % MONTHS.length
  const next = (index + 1) % MONTHS.length
  return (
    <div className="month-switcher">
      <button aria-label="Предыдущий месяц" onClick={() => onChange(prev)}>
        <Icon name="chevron" size={17} />
      </button>
      <span>{MONTHS[index]}</span>
      <button aria-label="Следующий месяц" onClick={() => onChange(next)}>
        <Icon name="chevron" size={17} />
      </button>
    </div>
  )
}