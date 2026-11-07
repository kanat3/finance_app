import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Icon } from '@/icons'
import { SearchSelect } from './SearchSelect'

export type ImportRow = {
  id: string;
  date: string;
  category: string;
  subcategory?: string;
  description: string;
  amount: string | number;
  comment: string;
}

type SubcategoryRef = {
  id: number;
  category_id: number;
  name: string;
}

type Props = {
  open: boolean;
  rows: ImportRow[];
  warning?: string | null;
  onClose: () => void;
  onSave: (rows: ImportRow[]) => Promise<void>;
  type: 'incomes' | 'expenses';
  categories: { id: number; name: string }[];
  subcategories?: SubcategoryRef[];
  onPredictRow?: (rowId: string, description: string) => Promise<{ category: string, subcategory: string } | null>;
}

export function ImportPreviewModal({
  open, rows: initialRows, warning, onClose, onSave, type, categories, subcategories = [], onPredictRow
}: Props) {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const [isAutoMode, setIsAutoMode] = useState(false)
  const pageSize = 10

  useEffect(() => {
    if (open) {
      setRows(initialRows)
      setPage(1)
      setIsAutoMode(false)
    }
  }, [open, initialRows])

  if (!open) return null

  const totalPages = Math.ceil(rows.length / pageSize)
  const startIdx = (page - 1) * pageSize
  const visibleRows = rows.slice(startIdx, startIdx + pageSize)

  const updateRow = (id: string, field: keyof ImportRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const deleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
    if (visibleRows.length === 1 && page > 1) setPage(page - 1)
  }

  const handleDescriptionChange = async (id: string, value: string) => {
    updateRow(id, 'description', value);

    const row = rows.find(r => r.id === id);
    console.log('DEBUG: isAutoMode=', isAutoMode, 'onPredictRow=', !!onPredictRow, 'value=', value);

    // Если включен режим и текст >= 3 символов
    if (isAutoMode && onPredictRow && value.length >= 3) {
      console.log('DEBUG: Отправляем запрос к ML для', value);
      const result = await onPredictRow(id, value);
      console.log('DEBUG: Ответ от ML', result);

      if (result) {
        setRows(prev => prev.map(r => r.id === id ? {
          ...r,
          category: result.category,
          subcategory: result.subcategory
        } : r));
      }
    }
  };

  const handleSave = async () => {
    if (rows.length === 0) return
    setSaving(true)
    try {
      await onSave(rows)
    } finally {
      setSaving(false)
    }
  }

  const isExpenses = type === 'expenses'
  const gridCols = isExpenses
    ? '100px 1fr 1fr 1.5fr 100px 1fr 40px'
    : '100px 1fr 1.5fr 100px 1fr 40px'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Проверьте данные перед сохранением (${rows.length} шт.)`}
      size="lg"
      footer={
        <>
          <button onClick={onClose} disabled={saving}>Отмена</button>
          <button className="primary" onClick={handleSave} disabled={saving || rows.length === 0}>
            {saving ? 'Сохранение...' : `Добавить (${rows.length})`}
          </button>
        </>
      }
    >
      {warning && (
        <div style={{
          padding: '12px 16px', background: 'rgba(240, 132, 103, 0.1)',
          borderLeft: '4px solid var(--coral)', borderRadius: '8px',
          marginBottom: 16, fontSize: 13, color: 'var(--ink)',
          display: 'flex', alignItems: 'flex-start', gap: 10
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
          <div>{warning}</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p className="subtitle" style={{ margin: 0 }}>
          Вы можете отредактировать любую ячейку или удалить лишние строки.
        </p>

        {onPredictRow && (
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          fontSize: 13,
          color: 'var(--muted)',
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 400
        }}>
          <input
            type="checkbox"
            checked={isAutoMode}
            onChange={(e) => setIsAutoMode(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          Автозаполнение по описанию
        </label>
        )}
      </div>

      <div className="data-table-wrap">
        <div className="data-head" style={{ gridTemplateColumns: gridCols }}>
          <span>Дата</span>
          <span>Категория</span>
          {isExpenses && <span>Подкатегория</span>}
          <span>Описание</span>
          <span>Сумма</span>
          <span>Комментарий</span>
          <span></span>
        </div>

        {visibleRows.map((r) => {
          const currentCategory = categories.find(c => c.name === r.category);
          const availableSubs = subcategories.filter(s => s.category_id === currentCategory?.id);

          return (
            <div key={r.id} className="data-row" style={{ gridTemplateColumns: gridCols }}>
              <input
                type="date"
                className="text-input"
                style={{ padding: '4px 6px', height: '28px', fontSize: '12px' }}
                value={r.date}
                onChange={(e) => updateRow(r.id, 'date', e.target.value)}
              />

              <div style={{ minWidth: 0 }}>
                <SearchSelect
                  value={r.category}
                  onChange={(name) => {
                    updateRow(r.id, 'category', name)
                    updateRow(r.id, 'subcategory', '')
                  }}
                  options={categories.map(c => c.name)}
                  placeholder="Поиск..."
                />
              </div>

              {isExpenses && (
                <div style={{ minWidth: 0 }}>
                  <SearchSelect
                    value={r.subcategory || ''}
                    onChange={(name) => updateRow(r.id, 'subcategory', name)}
                    options={availableSubs.map(s => s.name)}
                    placeholder="Поиск..."
                  />
                </div>
              )}

              <input
                className="text-input"
                style={{ padding: '4px 6px', height: '28px', fontSize: '12px' }}
                value={r.description}
                onChange={(e) => handleDescriptionChange(r.id, e.target.value)}
              />

              <input
                type="number"
                step="0.01"
                className="text-input"
                style={{ padding: '4px 6px', height: '28px', fontSize: '12px', textAlign: 'right' }}
                value={r.amount}
                onChange={(e) => updateRow(r.id, 'amount', e.target.value)}
              />

              <input
                className="text-input"
                style={{ padding: '4px 6px', height: '28px', fontSize: '12px' }}
                value={r.comment}
                onChange={(e) => updateRow(r.id, 'comment', e.target.value)}
              />

              <button
                className="icon-button"
                style={{ width: 28, height: 28, border: 'none', background: 'transparent' }}
                onClick={() => deleteRow(r.id)}
                title="Удалить"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          );
        })}

        {rows.length === 0 && <div className="empty">Все строки удалены</div>}

        {totalPages > 1 && (
          <div className="pagination" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="pagination-info">
              Показаны <b>{startIdx + 1}–{Math.min(startIdx + pageSize, rows.length)}</b> из <b>{rows.length}</b>
            </div>
            <div className="pagination-controls">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              <span className="page-indicator">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}