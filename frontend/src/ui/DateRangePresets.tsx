import React from 'react'

type Preset = { label: string; from: string; to: string }

function iso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function buildPresets(today = new Date()): Preset[] {
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate()

  const startOfMonth = new Date(y, m, 1)             // 1-е число текущего месяца
  const endOfMonth = new Date(y, m + 1, 0)           // последний день текущего месяца
  const startOfQuarter = new Date(y, Math.floor(m / 3) * 3, 1)
  const endOfQuarter = new Date(y, Math.floor(m / 3) * 3 + 3, 0)
  const startOfYear = new Date(y, 0, 1)
  const endOfYear = new Date(y, 11, 31)

  const last7 = new Date(today); last7.setDate(d - 6)
  const last30 = new Date(today); last30.setDate(d - 29)

  return [
    { label: 'Сегодня', from: iso(today), to: iso(today) },
    { label: '7 дней', from: iso(last7), to: iso(today) },
    { label: '30 дней', from: iso(last30), to: iso(today) },
    { label: 'Этот месяц', from: iso(startOfMonth), to: iso(endOfMonth) },
    { label: 'Квартал', from: iso(startOfQuarter), to: iso(endOfQuarter) },
    { label: 'Год', from: iso(startOfYear), to: iso(endOfYear) },
  ]
}

export function DateRangePresets({
  value, onPick,
}: {
  value: { from: string; to: string }
  onPick: (r: { from: string; to: string }) => void
}) {
  const presets = buildPresets()
  return (
    <div className="dr-presets">
      {presets.map((p) => (
        <button
          type="button"
          key={p.label}
          className={`dr-preset ${value.from === p.from && value.to === p.to ? 'on' : ''}`}
          onClick={() => onPick({ from: p.from, to: p.to })}
        >{p.label}</button>
      ))}
      <button
        type="button"
        className={`dr-preset ${!value.from && !value.to ? 'on' : ''}`}
        onClick={() => onPick({ from: '', to: '' })}
      >Всё время</button>
    </div>
  )
}