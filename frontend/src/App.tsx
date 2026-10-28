import React from 'react'
import { useState } from 'react'
import { Icon, IconName } from '@/icons'
import { ToastProvider, useToast } from '@/ui/Toast'
import { HomePage } from '@/pages/HomePage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { IncomesPage } from '@/pages/IncomesPage'
import { RefsPage } from '@/pages/RefsPage'
import { api } from '@/api'

type Page = 'Главная' | 'Расходы' | 'Доходы' | 'Справочники'

const NAV: { label: Page; icon: IconName }[] = [
  { label: 'Главная', icon: 'home' },
  { label: 'Расходы', icon: 'expense' },
  { label: 'Доходы', icon: 'income' },
  { label: 'Справочники', icon: 'book' },
]

function BackupBar({ onHide }: { onHide: () => void }) {
  const [seconds, setSeconds] = useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return (
    <div className="backup-bar">
      <div className="spinner" />
      <div className="msg">Готовим бэкап базы…</div>
      <div className="timer">{m}:{String(s).padStart(2, '0')}</div>
      <button onClick={onHide}>Скрыть</button>
    </div>
  )
}

function Shell() {
  const toast = useToast()
  const [page, setPage] = useState<Page>('Главная')
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth())
  const [backupOpen, setBackupOpen] = useState(false)

  const backup = async () => {
    if (backupOpen) return
    setBackupOpen(true)
    try {
      const r = await fetch(api.backupUrl())
      if (!r.ok) throw new Error(await r.text() || 'Ошибка сервера')
      const blob = await r.blob()
      const cd = r.headers.get('Content-Disposition') || ''
      const m = cd.match(/filename="?([^";]+)"?/)
      const name = m ? m[1] : 'traty_backup.sql'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      document.body.appendChild(a); a.click()
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000)
      toast.show('Бэкап скачан', 'ok')
    } catch (e: any) {
      toast.show('Не удалось создать бэкап: ' + e.message, 'err')
    } finally {
      setBackupOpen(false)
    }
  }

  return (
    <div className="app-shell">
      {backupOpen && <BackupBar onHide={() => setBackupOpen(false)} />}
      <header className="topbar">
        <div className="header-inner">
          <button className="brand" onClick={() => setPage('Главная')}>
            <span className="brand-mark">₽</span>
            <span>монета</span>
          </button>
          <nav className="nav">
            {NAV.map((item) => (
              <button
                key={item.label}
                className={`nav-item ${page === item.label ? 'active' : ''}`}
                onClick={() => setPage(item.label)}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="profile-actions">
            <button className="icon-button" onClick={backup} title="Бэкап БД">
              <Icon name="save" size={20} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {page === 'Главная' && <HomePage monthIndex={monthIndex} setMonthIndex={setMonthIndex} />}
        {page === 'Расходы' && <ExpensesPage />}
        {page === 'Доходы' && <IncomesPage />}
        {page === 'Справочники' && <RefsPage />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  )
}