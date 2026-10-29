import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '@/icons'
import { Calendar } from './Calendar'

type Props = {
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
  placeholder?: string
}

export function DateInput({ value, onChange, min, max, placeholder }: Props) {
  const [y, setY] = useState('')
  const [m, setM] = useState('')
  const [d, setD] = useState('')
  const [open, setOpen] = useState(false)

  const dayRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!value) { setY(''); setM(''); setD(''); return }
    const [yy, mm, dd] = value.split('-')
    setY(yy || ''); setM(mm || ''); setD(dd || '')
  }, [value])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const emit = (yy = y, mm = m, dd = d) => {
    if (!yy && !mm && !dd) { onChange(''); return }
    if (yy.length === 4 && mm.length >= 1 && dd.length >= 1) {
      const yN = +yy, mN = +mm, dN = +dd
      if (yN >= 1900 && mN >= 1 && mN <= 12 && dN >= 1 && dN <= 31) {
        const iso = `${yy}-${String(mN).padStart(2, '0')}-${String(dN).padStart(2, '0')}`
        const dt = new Date(iso + 'T00:00:00')
        if (dt.getFullYear() === yN && dt.getMonth() + 1 === mN && dt.getDate() === dN) {
          if (min && iso < min) { onChange(''); return }
          if (max && iso > max) { onChange(''); return }
          onChange(iso)
          return
        }
      }
    }
    onChange('')
  }

  return (
    <div className="date-input-wrap" ref={wrapRef}>
      <div className={`date-input-custom ${open ? 'focused' : ''}`}>
        <div className="di-segments">
          <input
            ref={dayRef}
            className="di-day"
            type="text"
            inputMode="numeric"
            maxLength={2}
            placeholder="ДД"
            value={d}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 2)
              setD(v)
              if (v.length === 2) monthRef.current?.focus()
              emit(y, m, v)
            }}
          />
          <span className="di-sep">.</span>
          <input
            ref={monthRef}
            className="di-month"
            type="text"
            inputMode="numeric"
            maxLength={2}
            placeholder="ММ"
            value={m}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 2)
              setM(v)
              if (v.length === 2) yearRef.current?.focus()
              emit(y, v, d)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !m) dayRef.current?.focus()
            }}
          />
          <span className="di-sep">.</span>
          <input
            ref={yearRef}
            className="di-year"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="ГГГГ"
            value={y}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4)
              setY(v)
              emit(v, m, d)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !y) monthRef.current?.focus()
            }}
          />
        </div>
        <button
          type="button"
          className="di-cal-btn"
          onClick={() => setOpen((v) => !v)}
          title="Открыть календарь"
        >
          <Icon name="calendar" size={15} />
        </button>
      </div>

      {open && (
        <Calendar
          value={value}
          onChange={(v) => { onChange(v); }}
          min={min}
          max={max}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}