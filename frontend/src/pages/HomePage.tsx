import React, { useEffect, useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { api, Stats, MONTHS, fmtMoney, fmtCompact, niceStep, Period, periodMonths, periodLabel } from '@/api'
import { Icon } from '@/icons'
import { PeriodPicker } from '@/ui/PeriodPicker'

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export function HomePage() {
  const [period, setPeriod] = useState<Period>({ kind: 'month', index: new Date().getMonth() })
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.stats(periodMonths(period)).then(setStats)
  }, [period])

  const incomeByMonth = useMemo(() => {
    const m = Object.fromEntries((stats?.incomes_by_month ?? []).map((r) => [r.m, r.s]))
    return MONTHS.map((_, i) => m[i + 1] || 0)
  }, [stats])

  const expenseByMonth = useMemo(() => {
    const m = Object.fromEntries((stats?.expenses_by_month ?? []).map((r) => [r.m, r.s]))
    return MONTHS.map((_, i) => m[i + 1] || 0)
  }, [stats])

  const currentMonthKey = period.kind === 'month' ? period.index : -1
  const totalIncome = currentMonthKey >= 0
    ? (incomeByMonth[currentMonthKey] || 0)
    : incomeByMonth.reduce((a, b) => a + b, 0)
  const totalExpense = currentMonthKey >= 0
    ? (expenseByMonth[currentMonthKey] || 0)
    : expenseByMonth.reduce((a, b) => a + b, 0)
  const balance = totalIncome - totalExpense

  // Адаптивные оси Y — красивые шаги
  const yExp = useMemo(() => {
    const max = Math.max(...expenseByMonth, ...incomeByMonth, 1)
    const step = niceStep(max)
    return {
      ticks: {
        stepSize: step,
        callback: (v: any) => fmtCompact(Number(v)),
      },
    }
  }, [incomeByMonth, expenseByMonth])

  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Обзор финансов</p>
          <h1>Добрый день!</h1>
          <p className="subtitle">
            {periodLabel(period)}: доходы {fmtMoney(totalIncome)} · расходы {fmtMoney(totalExpense)}
          </p>
        </div>
        <div className="heading-actions">
          <PeriodPicker period={period} onChange={setPeriod} />
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card balance-card">
          <div className="summary-top">
            <span className="summary-label">Баланс за {periodLabel(period).toLowerCase()}</span>
          </div>
          <strong className="summary-value">{fmtMoney(balance)}</strong>
          <span className="muted-caption">Доходы минус расходы</span>
        </article>

        <article className="summary-card">
          <div className="summary-icon income"><Icon name="arrowDown" size={21} /></div>
          <div className="summary-data">
            <span className="summary-label">Доходы</span>
            <strong className="summary-value">{fmtMoney(totalIncome)}</strong>
          </div>
        </article>

        <article className="summary-card">
          <div className="summary-icon expense"><Icon name="arrowUp" size={21} /></div>
          <div className="summary-data">
            <span className="summary-label">Расходы</span>
            <strong className="summary-value">{fmtMoney(totalExpense)}</strong>
          </div>
        </article>

        <article className="saving-card">
          <div className="saving-copy">
            <span className="sparkle">✦</span>
            <strong>{balance >= 0 ? 'Так держать!' : 'Стоит поберечься'}</strong>
            <p>
              {balance >= 0
                ? <>Вы в плюсе на <b>{fmtMoney(balance)}</b></>
                : <>Расходы превышают доходы на <b>{fmtMoney(-balance)}</b></>}
            </p>
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dynamics-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{periodLabel(period)}</p>
              <h2>Динамика финансов</h2>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <Bar
              data={{
                labels: MONTHS.map((m) => m.slice(0, 3)),
                datasets: [
                  { label: 'Доходы', data: incomeByMonth, backgroundColor: '#9cc940' },
                  { label: 'Расходы', data: expenseByMonth, backgroundColor: '#f08467' },
                ],
              }}
              options={{
                ...baseOpts,
                plugins: { legend: { display: true, position: 'bottom' } },
                scales: { y: yExp },
              }}
            />
          </div>
        </article>

        <article className="panel categories-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Топ категорий</p>
              <h2>Расходы</h2>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <Bar
              data={{
                labels: (stats?.expenses_by_category ?? []).map((r) => r.name),
                datasets: [{
                  data: (stats?.expenses_by_category ?? []).map((r) => r.s),
                  backgroundColor: '#82b9dc',
                }],
              }}
              options={{
                ...baseOpts,
                indexAxis: 'y' as const,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    ticks: {
                      callback: (v: any) => fmtCompact(Number(v)),
                      maxRotation: 0,
                      autoSkip: true,
                    },
                  },
                },
              }}
            />
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Подкатегории</p>
              <h2>Топ расходов</h2>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <Bar
              data={{
                labels: (stats?.expenses_by_subcategory ?? []).map((r) => r.name),
                datasets: [{
                  data: (stats?.expenses_by_subcategory ?? []).map((r) => r.s),
                  backgroundColor: '#f5d16d',
                }],
              }}
              options={{
                ...baseOpts,
                indexAxis: 'y' as const,
                scales: {
                  x: {
                    ticks: {
                      callback: (v: any) => fmtCompact(Number(v)),
                      autoSkip: true,
                    },
                  },
                },
              }}
            />
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Доходы</p>
              <h2>По категориям</h2>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <Bar
              data={{
                labels: (stats?.incomes_by_category ?? []).map((r) => r.name),
                datasets: [{
                  data: (stats?.incomes_by_category ?? []).map((r) => r.s),
                  backgroundColor: '#a28de8',
                }],
              }}
              options={{
                ...baseOpts,
                indexAxis: 'y' as const,
                scales: {
                  x: {
                    ticks: {
                      callback: (v: any) => fmtCompact(Number(v)),
                      autoSkip: true,
                    },
                  },
                },
              }}
            />
          </div>
        </article>
      </section>
    </>
  )
}