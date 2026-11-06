// src/hooks/usePeriod.ts (без изменений)
import { useState } from 'react'
import { Period } from '@/api'

const STORAGE_KEY = 'finance_period'

export function usePeriod() {
  const [period, setPeriodState] = useState<Period>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return { kind: 'all' }
  })

  const setPeriod = (p: Period) => {
    setPeriodState(p)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    } catch (e) {}
  }

  return [period, setPeriod] as const
}