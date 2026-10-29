import React, { useEffect, useState } from 'react'

export function NumberInput({
  value, onChange, placeholder, min = 0, max, step = '0.01',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  min?: number
  max?: number
  step?: string
}) {
  const [text, setText] = useState(value)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setText(value) }, [value])

  const validate = (raw: string): string | null => {
    if (!raw) return null
    // заменить запятую на точку, убрать пробелы, оставить цифры и одну точку
    let s = raw.replace(/\s/g, '').replace(',', '.')
    // только цифры и одна точка
    if (!/^\d*(\.\d{0,2})?$/.test(s)) return 'Только цифры, максимум 2 знака после точки'
    if (s === '.') return null
    if (s.startsWith('.')) s = '0' + s
    const num = parseFloat(s)
    if (Number.isNaN(num)) return 'Некорректное число'
    if (min !== undefined && num < min) return `Минимум ${min}`
    if (max !== undefined && num > max) return `Максимум ${max}`
    return null
  }

  const handle = (raw: string) => {
    // допускаем промежуточный ввод (пусто, "12.", "-")
    const s = raw.replace(/\s/g, '').replace(',', '.')
    setText(s)
    const err = validate(s)
    setError(err)
    // в родителя отдаём только валидное
    if (!err) onChange(s)
  }

  const onBlur = () => {
    if (!text) { onChange(''); return }
    const num = parseFloat(text)
    if (!Number.isNaN(num)) {
      onChange(num.toFixed(2).replace(/\.00$/, ''))
    }
  }

  return (
    <div className={`ni ${error ? 'has-error' : ''}`}>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
        onBlur={onBlur}
      />
      {error && <div className="ni-error">{error}</div>}
    </div>
  )
}