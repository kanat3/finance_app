import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal'
import { Icon } from '@/icons'
import { Col } from './DataTable'
import { SearchSelect } from './SearchSelect'
import { NumberInput } from './NumberInput'
import { DateInput } from './DateInput'
import { DateRangePresets } from './DateRangePresets'

type Props<T> = {
  open: boolean
  cols: Col<T>[]
  filters: Record<string, string>
  onApply: (next: Record<string, string>) => void
  onClear: () => void
  onClose: () => void
  categoriesForSub?: (categoryName: string) => string[]
}

export function FilterModal<T>({
  open, cols, filters, onApply, onClear, onClose, categoriesForSub,
}: Props<T>) {
  const [draft, setDraft] = useState<Record<string, string>>(filters)

  useEffect(() => { if (open) setDraft(filters) }, [open, filters])

  const set = (k: string, v: string) =>
    setDraft((d) => {
      const n = { ...d }
      if (v) n[k] = v; else delete n[k]
      return n
    })

  const setTwo = (k1: string, v1: string, k2: string, v2: string) =>
    setDraft((d) => {
      const n = { ...d }
      if (v1) n[k1] = v1; else delete n[k1]
      if (v2) n[k2] = v2; else delete n[k2]
      return n
    })

  const activeCount = useMemo(
    () => Object.values(draft).filter((v) => v && v.trim()).length,
    [draft],
  )

  const dateCol = cols.find((c) => c.filterType === 'date')
  const amountCol = cols.find((c) => c.filterType === 'number')
  const catCol = cols.find((c) => c.key === 'category')
  const subCol = cols.find((c) => c.key === 'subcategory')
  const textCols = cols.filter(
    (c) => c.filterType === 'text' &&
      c.key !== 'description' && c.key !== 'comment',
  )
  const descCol = cols.find((c) => c.key === 'description')
  const commentCol = cols.find((c) => c.key === 'comment')

  const dateFrom = draft['date_from'] || ''
  const dateTo = draft['date_to'] || ''
  const amountMin = draft['amount_min'] || ''
  const amountMax = draft['amount_max'] || ''

  const subOptions = useMemo(() => {
    if (subCol?.options && catCol && categoriesForSub && draft['category']) {
      return categoriesForSub(draft['category'])
    }
    return subCol?.options ?? []
  }, [subCol, catCol, categoriesForSub, draft])

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
          {activeCount > 0 && <span className="fm-badge">{activeCount}</span>}
        </span>
      }
      size="lg"
      footer={<>
        <button onClick={() => { onClear(); onClose() }}>Очистить</button>
        <button className="primary" onClick={() => { onApply(draft); onClose() }}>
          Применить
        </button>
      </>}
    >
 
    <div className="fm-sections">
      {dateCol && (
        <section className="fm-section">
          <h4 className="fm-section-title">
            <Icon name="calendar" size={13} /> Период
          </h4>
            <div className="fm-range">
              <div>
                <span className="fm-range-label">От</span>
                <DateInput
                  value={dateFrom}
                  onChange={(v) => set('date_from', v)}
                />
              </div>
              <div>
                <span className="fm-range-label">До</span>
                <DateInput
                  value={dateTo}
                  onChange={(v) => set('date_to', v)}
                  min={dateFrom || undefined}
                />
              </div>
            </div>
          <DateRangePresets
            value={{ from: dateFrom, to: dateTo }}
            onPick={(r) => setTwo('date_from', r.from, 'date_to', r.to)}
          />
        </section>
      )}

      {amountCol && (
        <section className="fm-section">
          <h4 className="fm-section-title">Сумма</h4>
          <div className="fm-range">
            <div>
              <span className="fm-range-label">От</span>
              <NumberInput value={amountMin} onChange={(v) => set('amount_min', v)} placeholder="0" />
            </div>
            <div>
              <span className="fm-range-label">До</span>
              <NumberInput value={amountMax} onChange={(v) => set('amount_max', v)} placeholder="∞" />
            </div>
          </div>
        </section>
      )}

      {(catCol || subCol) && (
        <section className="fm-section">
          <h4 className="fm-section-title">Категория</h4>
          <div className="fm-grid">
            {catCol && (
              <div className="fm-field">
                <label>Категория</label>
                <SearchSelect
                  value={draft['category'] || ''}
                  onChange={(v) => {
                    set('category', v)
                    if (draft['subcategory']) set('subcategory', '')
                  }}
                  options={catCol.options ?? []}
                  placeholder="Все категории"
                />
              </div>
            )}
            {subCol && (
              <div className="fm-field">
                <label>Подкатегория</label>
                <SearchSelect
                  value={draft['subcategory'] || ''}
                  onChange={(v) => set('subcategory', v)}
                  options={subOptions}
                  placeholder="Все подкатегории"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {(descCol || commentCol) && (
        <section className="fm-section">
          <h4 className="fm-section-title">Поиск по тексту</h4>
          <div className="fm-grid">
            {descCol && (
              <div className="fm-field">
                <label>Описание</label>
                <input
                  type="text"
                  placeholder="DIXY, ROSTICS…"
                  value={draft['description'] || ''}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            )}
            {commentCol && (
              <div className="fm-field">
                <label>Комментарий</label>
                <input
                  type="text"
                  placeholder="Т-Банк, Сбербанк…"
                  value={draft['comment'] || ''}
                  onChange={(e) => set('comment', e.target.value)}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
     </Modal>
  )
}