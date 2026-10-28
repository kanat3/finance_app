import React, { useState } from 'react'
import { MONTHS, Period, periodLabel } from '@/api'
import { Icon } from '@/icons'
import { Modal } from './Modal'

export function PeriodPicker({
  period, onChange,
}: {
  period: Period
  onChange: (p: Period) => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'month' | 'range' | 'all'>(period.kind)
  const [monthIdx, setMonthIdx] = useState(period.kind === 'month' ? period.index : new Date().getMonth())
  const [from, setFrom] = useState(period.kind === 'range' ? period.from : 1)
  const [to, setTo] = useState(period.kind === 'range' ? period.to : new Date().getMonth() + 1)

  const apply = () => {
    if (tab === 'month') onChange({ kind: 'month', index: monthIdx })
    else if (tab === 'all') onChange({ kind: 'all' })
    else {
      const a = Math.min(from, to)
      const b = Math.max(from, to)
      onChange({ kind: 'range', from: a, to: b })
    }
    setOpen(false)
  }

  return (
    <>
      <button className="period-btn" onClick={() => setOpen(true)}>
        <Icon name="calendar" size={16} />
        <span>{periodLabel(period)}</span>
        <Icon name="chevron" size={14} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Период"
        size="sm"
        footer={<>
          <button onClick={() => setOpen(false)}>Отмена</button>
          <button className="primary" onClick={apply}>Применить</button>
        </>}
      >
        <div className="period-tabs">
          <button className={tab === 'month' ? 'on' : ''} onClick={() => setTab('month')}>Месяц</button>
          <button className={tab === 'range' ? 'on' : ''} onClick={() => setTab('range')}>Диапазон</button>
          <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>Всё время</button>
        </div>

        {tab === 'month' && (
          <div className="period-grid">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                className={monthIdx === i ? 'on' : ''}
                onClick={() => setMonthIdx(i)}
              >{m.slice(0, 3)}</button>
            ))}
          </div>
        )}

        {tab === 'range' && (
          <div className="period-range">
            <div>
              <label>С</label>
              <select value={from} onChange={(e) => setFrom(+e.target.value)}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label>По</label>
              <select value={to} onChange={(e) => setTo(+e.target.value)}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>
        )}

        {tab === 'all' && (
          <p className="period-hint">Будут показаны данные за всё доступное время.</p>
        )}
      </Modal>
    </>
  )
}