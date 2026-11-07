import React, { useEffect, useMemo, useState } from 'react'
import { Chart as ChartJS } from 'react-chartjs-2'
import {
  Chart, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, 
  LineController, BarController, DoughnutController, Title, Tooltip, Legend,
} from 'chart.js'
import { api, Stats, MONTHS, fmtMoney, fmtCompact, niceStep, periodMonths, periodLabel } from '@/api'
import { Icon } from '@/icons'
import { PeriodPicker } from '@/ui/PeriodPicker'
import { usePeriod } from '@/hooks/usePeriod'

Chart.register(
  CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement,
  LineController, BarController, DoughnutController, Title, Tooltip, Legend
)

// Плагин для отрисовки процентов прямо на кольцевой диаграмме
const doughnutLabelsPlugin = {
  id: 'doughnutLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx, data } = chart;
    const dataset = data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    
    const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
    if (total === 0) return;

    meta.data.forEach((element: any, index: number) => {
      const value = dataset.data[index];
      const percent = Math.round((value / total) * 100);
      
      if (percent >= 5) {
        const { x, y } = element.tooltipPosition();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Manrope, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percent}%`, x, y);
        ctx.restore();
      }
    });
  }
};

const commonScales = {
  y: { grid: { display: false }, border: { display: false }, ticks: { color: '#777b73' } },
  x: { grid: { display: false }, border: { display: false }, ticks: { color: '#777b73' } }
}

export function HomePage() {
  const [period, setPeriod] = usePeriod()
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

  // 1. Считаем накопительный баланс (для линии тренда)
  const cumulativeBalanceByMonth = useMemo(() => {
    let running = 0;
    return MONTHS.map((_, i) => {
      const income = incomeByMonth[i] || 0;
      const expense = expenseByMonth[i] || 0;
      running += (income - expense);
      return running;
    });
  }, [incomeByMonth, expenseByMonth]);

  const currentMonthKey = period.kind === 'month' ? period.index : -1
  const totalIncome = currentMonthKey >= 0 ? (incomeByMonth[currentMonthKey] || 0) : incomeByMonth.reduce((a, b) => a + b, 0)
  const totalExpense = currentMonthKey >= 0 ? (expenseByMonth[currentMonthKey] || 0) : expenseByMonth.reduce((a, b) => a + b, 0)
  const balance = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0

  // === Расчеты для средних показателей ===
  const activeMonthsCount = useMemo(() => {
    if (period.kind === 'month') return 1;
    const count = MONTHS.filter((_, i) => incomeByMonth[i] > 0 || expenseByMonth[i] > 0).length;
    return count || 1;
  }, [period, incomeByMonth, expenseByMonth]);

  const avgIncome = totalIncome / activeMonthsCount;
  const avgExpense = totalExpense / activeMonthsCount;
  
  const salaryCategory = useMemo(() => {
    return (stats?.incomes_by_category ?? []).find(r => 
      r.name.toLowerCase().includes('зарплат') || r.name.toLowerCase().includes('оклад')
    );
  }, [stats]);

  const avgSalary = salaryCategory ? (salaryCategory.s / activeMonthsCount) : 0;
  // =====================================

  const yExp = useMemo(() => {
    const max = Math.max(...expenseByMonth, ...incomeByMonth, 1)
    const step = niceStep(max)
    return { ...commonScales.y, ticks: { stepSize: step, callback: (v: any) => fmtCompact(Number(v)) } }
  }, [incomeByMonth, expenseByMonth])

  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: { callbacks: { label: (context: any) => ` ${context.dataset.label || context.label}: ${fmtMoney(context.raw)}` } }
    },
  }

  const topCategories = stats?.expenses_by_category?.slice(0, 6) ?? []
  const otherExpenses = (stats?.expenses_by_category ?? []).slice(6).reduce((sum, r) => sum + r.s, 0)
  const donutLabels = [...topCategories.map(r => r.name)]
  const donutData = [...topCategories.map(r => r.s)]
  if (otherExpenses > 0) {
    donutLabels.push('Прочее')
    donutData.push(otherExpenses)
  }

  const donutColors = ['#f08467', '#f5d16d', '#82b9dc', '#a28de8', '#9cc940', '#777b73', '#e5e7df']

  const dynamicDatasets: any[] = [
    { type: 'bar', label: 'Доходы', data: incomeByMonth, backgroundColor: '#9cc940', borderRadius: 4, order: 2 },
    { type: 'bar', label: 'Расходы', data: expenseByMonth, backgroundColor: '#f08467', borderRadius: 4, order: 2 },
  ];

  if (period.kind === 'all') {
    dynamicDatasets.push({
      type: 'line',
      label: 'Баланс (накопительный)',
      data: cumulativeBalanceByMonth, // <-- Используем новый массив
      borderColor: '#777b73',
      borderWidth: 1.5,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#777b73',
      pointBorderWidth: 1.5,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.3,
      order: 1,
    });
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Обзор финансов</p>
          <h1>Добрый день!</h1>
        </div>
        <div className="heading-actions">
          <PeriodPicker period={period} onChange={setPeriod} />
        </div>
      </section>

      <section className="summary-grid">
        {/* Карточка баланса с переворотом по наведению */}
        <div className="flip-container">
          <div className="flip-card-inner">
            {/* ЛИЦЕВАЯ СТОРОНА */}
            <div className="flip-front">
              <div>
                <div className="summary-top">
                  <span className="summary-label">Баланс за {periodLabel(period).toLowerCase()}</span>
                  {totalIncome > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 800, background: savingsRate >= 20 ? 'var(--lime)' : savingsRate > 0 ? 'var(--yellow)' : 'var(--coral)', color: savingsRate >= 20 ? 'var(--ink)' : '#fff', padding: '3px 8px', borderRadius: '10px' }}>
                      {savingsRate > 0 ? '+' : ''}{savingsRate}%
                    </span>
                  )}
                </div>
                <strong className="summary-value">{fmtMoney(balance)}</strong>
                <span className="muted-caption" style={{ display: 'block', marginTop: 8 }}>Доходы минус расходы</span>
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
                Наведите для деталей ↔
              </div>
            </div>

            {/* ОБРАТНАЯ СТОРОНА (Средние показатели) */}
            <div className="flip-back">
              <div style={{ marginBottom: 8 }}>
                <span className="summary-label" style={{ color: 'var(--lime)', fontSize: '10px' }}>Средние показатели / мес</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', opacity: 0.8 }}>Доход</span>
                  <strong style={{ fontSize: '15px' }}>{fmtMoney(avgIncome)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', opacity: 0.8 }}>Расход</span>
                  <strong style={{ fontSize: '15px' }}>{fmtMoney(avgExpense)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                  <span style={{ fontSize: '12px', opacity: 0.8 }}>Зарплата</span>
                  {salaryCategory ? (
                    <strong style={{ fontSize: '15px' }}>{fmtMoney(avgSalary)}</strong>
                  ) : (
                    <span style={{ fontSize: '10px', color: 'var(--coral)', textAlign: 'right', maxWidth: '110px', lineHeight: 1.2 }}>
                      Нет категории «Зарплата»
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
                ↔ Назад к балансу
              </div>
            </div>
          </div>
        </div>

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
            <p>{balance >= 0 ? <>Вы в плюсе на <b>{fmtMoney(balance)}</b></> : <>Расходы превышают доходы на <b>{fmtMoney(-balance)}</b></>}</p>
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dynamics-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{periodLabel(period)}</p>
              <h2>Динамика и тренд баланса</h2>
            </div>
          </div>
          <div style={{ height: 300 }}>
            <ChartJS
              type="bar"
              data={{ labels: MONTHS.map((m) => m.slice(0, 3)), datasets: dynamicDatasets }}
              options={{
                ...baseOpts,
                plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } } },
                scales: { x: commonScales.x, y: { ...yExp, grid: { color: '#f4f5ef' } } },
                layout: { padding: { top: 10, bottom: 0, left: 0, right: 10 } }
              }}
            />
          </div>
        </article>

        <article className="panel categories-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Структура</p>
              <h2>Расходы по категориям</h2>
            </div>
          </div>
          <div style={{ height: 300, position: 'relative', display: 'flex', alignItems: 'center' }}>
            {donutData.length === 0 ? (
              <div className="empty" style={{ width: '100%' }}>Нет данных о расходах</div>
            ) : (
              <ChartJS
                type="doughnut"
                data={{
                  labels: donutLabels,
                  datasets: [{ data: donutData, backgroundColor: donutColors, borderWidth: 0, hoverOffset: 4 }],
                }}
                plugins={[doughnutLabelsPlugin]}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '70%',
                  layout: { padding: { left: 0, right: 10 } },
                  plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6, padding: 12, font: { size: 10 } } },
                    tooltip: { callbacks: { label: (context: any) => {
                      const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                      return ` ${fmtMoney(context.raw)} (${Math.round((context.raw / total) * 100)}%)`;
                    } } }
                  },
                }}
              />
            )}
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
            {(stats?.expenses_by_subcategory ?? []).length === 0 ? <div className="empty">Пока нет данных</div> : (
              <ChartJS 
                type="bar" 
                data={{ labels: (stats?.expenses_by_subcategory ?? []).map((r) => r.name), datasets: [{ label: 'Сумма', data: (stats?.expenses_by_subcategory ?? []).map((r) => r.s), backgroundColor: '#f5d16d', borderRadius: 4 }] }} 
                options={{ ...baseOpts, indexAxis: 'y' as const, scales: { ...commonScales, x: { ...commonScales.x, ticks: { callback: (v: any) => fmtCompact(Number(v)), autoSkip: true } } } }} 
              />
            )}
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
            {(stats?.incomes_by_category ?? []).length === 0 ? <div className="empty">Пока нет данных</div> : (
              <ChartJS 
                type="bar" 
                data={{ labels: (stats?.incomes_by_category ?? []).map((r) => r.name), datasets: [{ label: 'Сумма', data: (stats?.incomes_by_category ?? []).map((r) => r.s), backgroundColor: '#a28de8', borderRadius: 4 }] }} 
                options={{ ...baseOpts, indexAxis: 'y' as const, scales: { ...commonScales, x: { ...commonScales.x, ticks: { callback: (v: any) => fmtCompact(Number(v)), autoSkip: true } } } }} 
              />
            )}
          </div>
        </article>
      </section>
    </>
  )
}