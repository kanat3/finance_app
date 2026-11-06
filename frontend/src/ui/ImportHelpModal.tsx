import React from 'react'
import { Modal } from './Modal'

export function ImportHelpModal({
  open, onClose, kind, mode = 'import'
}: {
  open: boolean
  onClose: () => void
  kind: 'expenses' | 'incomes' | 'refs'
  mode?: 'import' | 'export'
}) {
  const isExpenses = kind === 'expenses'
  
  // Пример CSV для импорта
  const exampleCsv = isExpenses
    ? `Дата;Категория;Подкатегория;Описание;Стоимость;Комментарий
19.10.2026;Продукты;Пятерочка;Оплата в PYATEROCHKA;424,79;Т-Банк
20.10.2026;Транспорт;Такси;Оплата в YANDEX GO;842,00;Т-Банк`
    : `Дата;Категория;Описание;Сумма;Комментарий
19.10.2026;Зарплата;Оклад за октябрь;80000,00;Сбербанк
20.10.2026;Фриланс;Оплата за проект;15000,00;Т-Банк`

  const downloadExample = () => {
    const blob = new Blob([exampleCsv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `example_${kind}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Стили для блоков кода, чтобы не смешивать шрифты
  const codeStyle: React.CSSProperties = {
    background: 'var(--paper)', 
    padding: '12px 16px', 
    borderRadius: '10px', 
    fontFamily: 'monospace', 
    fontSize: 12,
    overflowX: 'auto',
    border: '1px solid var(--line)', 
    marginBottom: 16,
    color: 'var(--ink)',
    lineHeight: 1.5
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'import' ? "Как импортировать данные" : "Как сохранить данные"}
      size="lg"
      footer={
        <>
          <button onClick={onClose}>Закрыть</button>
          {mode === 'import' && (
            <button className="primary" onClick={downloadExample}>
              Скачать правильный пример
            </button>
          )}
        </>
      }
    >
      {mode === 'import' ? (
        /* ================= РЕЖИМ ИМПОРТА ================= */
        <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
          <div style={{ 
            padding: '16px', background: 'rgba(240, 132, 103, 0.1)', 
            borderLeft: '4px solid var(--coral)', borderRadius: '8px', marginBottom: 24 
          }}>
            <strong style={{ display: 'block', marginBottom: 4, color: 'var(--coral)', fontSize: 15 }}>
              Главное правило: разделитель — точка с запятой
            </strong>
          </div>

          <h4 style={{ margin: '0 0 8px', fontSize: 15 }}>Какие колонки нужны</h4>
          <p style={{ margin: '0 0 8px' }}>Обязательно заполните эти поля:</p>
          <ul style={{ paddingLeft: 20, margin: '0 0 16px' }}>
            <li><b>Дата</b> (например, 19.10.2026)</li>
            <li><b>Категория</b> (например, Продукты)</li>
            <li><b>{isExpenses ? 'Стоимость' : 'Сумма'}</b> (например, 424,79)</li>
          </ul>
          
          <p style={{ margin: '0 0 8px' }}>По желанию можно добавить:</p>
          <ul style={{ paddingLeft: 20, margin: '0 0 24px' }}>
            {isExpenses && <li><b>Подкатегория</b></li>}
            <li><b>Описание</b></li>
            <li><b>Комментарий</b></li>
          </ul>

          <h4 style={{ margin: '0 0 8px', fontSize: 15 }}>Как это выглядит в файле</h4>
          <div style={codeStyle}>
            {isExpenses ? (
              <>
                Дата;Категория;Подкатегория;Описание;Стоимость;Комментарий<br/>
                19.10.2026;Продукты;Пятерочка;Оплата в PYATEROCHKA;424,79;Т-Банк<br/>
                20.10.2026;Транспорт;Такси;Оплата в YANDEX GO;842,00;Т-Банк
              </>
            ) : (
              <>
                Дата;Категория;Описание;Сумма;Комментарий<br/>
                19.10.2026;Зарплата;Оклад за октябрь;80000,00;Сбербанк<br/>
                20.10.2026;Фриланс;Оплата за проект;15000,00;Т-Банк
              </>
            )}
          </div>
          
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Если у вас файл <b>.xlsx</b> (Excel), разделитель не нужен — там данные лежат по разным ячейкам.
          </p>
        </div>
      ) : (
        /* ================= РЕЖИМ ЭКСПОРТА ================= */
        <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 24px' }}>
            Мы рекомендуем всегда скачивать данные в формате <b>Excel (.xlsx)</b>. 
            Это самый надежный вариант: цифры и даты сохраняются идеально.
          </p>

          <h4 style={{ margin: '0 0 8px', fontSize: 15 }}>Если вам нужен именно CSV-файл</h4>
          <p style={{ margin: '0 0 8px' }}>
            При скачивании CSV мы используем <b>точку с запятой</b> в качестве разделителя. 
            Это стандарт для русского Excel, чтобы не путать запятые в суммах.
          </p>
          <div style={codeStyle}>
            Дата;Категория;Описание;Сумма;Комментарий<br/>
            19.10.2026;Продукты;Пятерочка;424,79;Т-Банк
          </div>
        </div>
      )}
    </Modal>
  )
}