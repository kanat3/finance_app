import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal'
import { Icon } from '@/icons'
import { Col } from './DataTable'

type Props<T> = {
  open: boolean
  cols: Col<T>[]
  filters: Record<string, string>
  months?: { selected: Set<number>; onChange: (s: Set<number>) => void }
  onApply: (next: Record<string, string>) => void
  onClear: () => void
  onClose: () => void
}

export function FilterModal<T>({
  open, cols, filters, months, onApply, onClear, onClose,
}: Props<T>) {
  const [draft, setDraft] = useState<Record<string, string>>(filters)

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  const set = (k: string, v: string) =>
    setDraft((d) => {
      const n = { ...d }
      if (v) n[k] = v; else delete n[k]
      return n
    })

  const activeCount = useMemo(() => {
    let n = Object.values(draft).filter((v) => v && v.trim()).length
    if (months && months.selected.size > 0) n += 1
    return n
  }, [draft, months])

  const filterCols = cols.filter((c) => c.filterType)

  const renderField = (c: Col<T>) => {
    const key = c.key
    const v = draft[key] || ''

    if (c.filterType === 'select') {
      return (
        <div className="fm-field" key={key}>
          <label>{c.label}</label>
          <select value={v} onChange={(e) => set(key, e.target.value)}>
            <option value="">Все</option>
            {c.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )
    }

    if (c.filterType === 'text') {
      return (
        <div className="fm-field" key={key}>
          <label>{c.label}</label>
          <input
            type="text"
            placeholder={c.placeholder || 'Содержит…'}
            value={v}
            onChange={(e) => set(key, e.target.value)}
          />
        </div>
      )
    }

    if (c.filterType === 'date' || c.filterType === 'number') {
      const type = c.filterType === 'number' ? 'number' : 'date'
      const minKey = `${key}_${c.filterType === 'date' ? 'from' : 'min'}`
      const maxKey = `${key}_${c.filterType === 'date' ? 'to'   : 'max'}`
      const vMin = draft[minKey] || ''
      const vMax = draft[maxKey] || ''
      const showRange = !!c.range

      if (!showRange) {
        return (
          <div className="fm-field" key={key}>
            <label>{c.label}</label>
            <input
              type={type}
              value={v}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        )
      }

      return (
        <div className="fm-field fm-field-wide" key={key}>
          <label>{c.label}</label>
          <div className="fm-range">
            <div>
              <span className="fm-range-label">От</span>
              <input
                type={type}
                value={vMin}
                onChange={(e) => set(minKey, e.target.value)}
              />
            </div>
            <div>
              <span className="fm-range-label">До</span>
              <input
                type={type}
                value={vMax}
                onChange={(e) => set(maxKey, e.target.value)}
              />
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="fm-title">
          <span className="fm-title-icon">
            <Icon name="filter" size={16} />
          </span>
          Фильтры
          {activeCount > 0 && (
            <span className="fm-badge">{activeCount}</span>
          )}
        </span>
      }
      size="lg"
      footer={<>
        <button onClick={() => { onClear(); onClose() }}>Сбросить</button>
        <button
          className="primary"
          onClick={() => { onApply(draft); onClose() }}
        >
          Применить
        </button>
      </>}
    >
      <div className="fm-sections">
        {months && (
          <section className="fm-section">
            <h4 className="fm-section-title">Период</h4>
            <div className="fm-months">
              <button
                type="button"
                className={months.selected.size === 0 ? 'on all' : ''}
                onClick={() => months.onChange(new Set())}
              >Все</button>
              {MONTHS_SHORT.map((m, i) => (
                <button
                  type="button"
                  key={m}
                  className={months.selected.has(i + 1) ? 'on' : ''}
                  onClick={() => {
                    const next = new Set(months.selected)
                    if (next.has(i + 1)) next.delete(i + 1)
                    else next.add(i + 1)
                    months.onChange(next)
                  }}
                >{m}</button>
              ))}
            </div>
          </section>
        )}

        <section className="fm-section">
          <h4 className="fm-section-title">Поля</h4>
          <div className="fm-grid">
            {filterCols.map(renderField)}
          </div>
        </section>
      </div>
    </Modal>
  )
}

const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
                      'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']