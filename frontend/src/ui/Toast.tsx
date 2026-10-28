import React, { createContext, useCallback, useContext, useState } from 'react'

type ToastMsg = { id: number; text: string; kind: 'ok' | 'err' | 'info' }
type ToastApi = { show: (text: string, kind?: 'ok' | 'err' | 'info') => void }

const Ctx = createContext<ToastApi>({ show: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastMsg[]>([])
  const show = useCallback((text: string, kind: 'ok' | 'err' | 'info' = 'info') => {
    const id = Date.now() + Math.random()
    setItems((cur) => [...cur, { id, text, kind }])
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3500)
  }, [])
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="toast-stack">
        {items.map((t) => (
          <div key={t.id} className={`toast-item ${t.kind}`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  )
}