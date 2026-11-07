import React, { useEffect, useState } from 'react'
import { api, Deposit, Investment, DepositInterest, Category, fmtMoney } from '@/api'
import { Icon } from '@/icons'
import { Modal } from '@/ui/Modal'
import { useToast } from '@/ui/Toast'
import { DateInput } from '@/ui/DateInput'
import { NumberInput } from '@/ui/NumberInput'
import { SearchSelect } from '@/ui/SearchSelect'

export function SavingsPage() {
  const toast = useToast()
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [draftDeposit, setDraftDeposit] = useState<Partial<Deposit> | null>(null)
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null)
  const [draftInvest, setDraftInvest] = useState<Partial<Investment> | null>(null)

  const [accrualDeposit, setAccrualDeposit] = useState<Deposit | null>(null)
  const [accrualAmount, setAccrualAmount] = useState<number>(0)
  const [accrualHelpOpen, setAccrualHelpOpen] = useState(false)
  
  const [historyDeposit, setHistoryDeposit] = useState<Deposit | null>(null)
  const [historyList, setHistoryList] = useState<DepositInterest[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  
  // Для выбора "Другое" в сроке вклада
  const [customEndDate, setCustomEndDate] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [d, i, c] = await Promise.all([
        api.deposits(), 
        api.investments(),
        api.incomeCategories()
      ])
      setDeposits(d)
      setInvestments(i)
      setCats(c)
    } catch (e: any) {
      toast.show('Ошибка загрузки: ' + e.message, 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0)
  const totalInvestments = investments.reduce((sum, i) => sum + (i.current_price || i.avg_price) * i.quantity, 0)
  const totalCapital = totalDeposits + totalInvestments

  const expectedMonthlyIncome = deposits.reduce((sum, d) => {
    const monthly = d.amount * (d.rate / 100) / 12
    return sum + monthly
  }, 0)

  const saveDeposit = async () => {
    if (!draftDeposit) return
    if (!draftDeposit.name || !draftDeposit.amount || !draftDeposit.rate || !draftDeposit.start_date) {
      toast.show('Заполните название, сумму, ставку и дату', 'err')
      return
    }
    if (!draftDeposit.income_category_id) {
      toast.show('Выберите категорию для процентов', 'err')
      return
    }
    try {
      await api.createDeposit(draftDeposit as any)
      toast.show('Вклад добавлен', 'ok')
      setDraftDeposit(null)
      await load()
    } catch (e: any) {
      toast.show(e.message, 'err')
    }
  }

  const saveEditedDeposit = async () => {
    if (!editingDeposit) return
    if (!editingDeposit.name || !editingDeposit.amount || !editingDeposit.rate || !editingDeposit.start_date) {
      toast.show('Заполните название, сумму, ставку и дату', 'err')
      return
    }
    if (!editingDeposit.income_category_id) {
      toast.show('Выберите категорию для процентов', 'err')
      return
    }
    try {
      await api.updateDeposit(editingDeposit.id, editingDeposit)
      toast.show('Вклад обновлён', 'ok')
      setEditingDeposit(null)
      await load()
    } catch (e: any) {
      toast.show(e.message, 'err')
    }
  }

  const saveInvestment = async () => {
    if (!draftInvest) return
    if (!draftInvest.name || !draftInvest.quantity || !draftInvest.avg_price) {
      toast.show('Заполните название, количество и цену', 'err')
      return
    }
    try {
      await api.createInvestment(draftInvest as any)
      toast.show('Акция добавлена', 'ok')
      setDraftInvest(null)
      await load()
    } catch (e: any) {
      toast.show(e.message, 'err')
    }
  }

  const openAccrueModal = (d: Deposit) => {
    if (!d.income_category_id) {
      toast.show('У вклада не выбрана категория дохода. Отредактируйте вклад.', 'err')
      return
    }
    let amount = 0
    if (d.accrue_period === 'daily') amount = d.amount * (d.rate / 100) / 365
    else if (d.accrue_period === 'monthly') amount = d.amount * (d.rate / 100) / 12
    else {
      const days = d.end_date ? (new Date(d.end_date).getTime() - new Date(d.start_date).getTime()) / (1000 * 60 * 60 * 24) : 365
      amount = d.amount * (d.rate / 100) * (days / 365)
    }
    setAccrualDeposit(d)
    setAccrualAmount(Number(amount.toFixed(2)))
  }

  const confirmAccrue = async () => {
    if (!accrualDeposit) return
    try {
      await api.accrueInterest(accrualDeposit.id, accrualAmount)
      toast.show('Проценты начислены и добавлены в доходы', 'ok')
      setAccrualDeposit(null)
      await load()
    } catch (e: any) {
      toast.show(e.message, 'err')
    }
  }

  const openHistory = async (d: Deposit) => {
    setHistoryDeposit(d)
    setHistoryLoading(true)
    try {
      const list = await api.depositInterests(d.id)
      setHistoryList(list)
    } catch (e: any) {
      toast.show(e.message, 'err')
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Капитал</p>
          <h1>Сбережения</h1>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <div className="summary-icon income"><Icon name="arrowDown" size={21} /></div>
          <div className="summary-data">
            <span className="summary-label">Вклады</span>
            <strong className="summary-value">{fmtMoney(totalDeposits)}</strong>
          </div>
        </article>
        <article className="summary-card">
          <div className="summary-icon income" style={{ background: 'rgba(162, 141, 232, 0.18)', color: '#7b61c9' }}>
            <Icon name="trendingUp" size={21} />
          </div>
          <div className="summary-data">
            <span className="summary-label">Инвестиции</span>
            <strong className="summary-value">{fmtMoney(totalInvestments)}</strong>
          </div>
        </article>
        <article className="summary-card">
          <div className="summary-icon income"><Icon name="wallet" size={21} /></div>
          <div className="summary-data">
            <span className="summary-label">Общий капитал</span>
            <strong className="summary-value">{fmtMoney(totalCapital)}</strong>
          </div>
        </article>
        <article className="saving-card">
          <div className="saving-copy">
            <span className="sparkle">✦</span>
            <strong>Ожидаемый доход</strong>
            <p>~ <b>{fmtMoney(expectedMonthlyIncome)}</b> / мес с вкладов</p>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Вклады и депозиты</p>
            <h2>Список вкладов</h2>
          </div>
          <button className="add-button" onClick={() => setDraftDeposit({ 
            is_capitalized: false, 
            start_date: new Date().toISOString().slice(0, 10), 
            auto_accrue: false,
            accrue_period: 'monthly' 
          })}>
            <Icon name="plus" size={19} /><span>Добавить вклад</span>
          </button>
        </div>

        {deposits.length === 0 ? (
          <div className="empty">Пока нет вкладов. Добавьте первый!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {deposits.map(d => {
              let periodLabel = 'мес'
              let periodAmount = 0
              
              if (d.accrue_period === 'daily') {
                periodAmount = d.amount * (d.rate / 100) / 365
                periodLabel = 'день'
              } else if (d.accrue_period === 'monthly') {
                periodAmount = d.amount * (d.rate / 100) / 12
                periodLabel = 'мес'
              } else {
                const days = d.end_date ? (new Date(d.end_date).getTime() - new Date(d.start_date).getTime()) / (1000 * 60 * 60 * 24) : 365
                periodAmount = d.amount * (d.rate / 100) * (days / 365)
                periodLabel = 'срок'
              }

              return (
                <div key={d.id} className="data-row" style={{ gridTemplateColumns: '1fr auto', cursor: 'default', padding: '16px 18px', borderRadius: 12, background: '#fafbf7' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {d.name} 
                      {d.bank && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {d.bank}</span>}
                      {d.is_capitalized && <span style={{ color: 'var(--lime-deep)', fontSize: 11, marginLeft: 8, border: '1px solid var(--lime-deep)', padding: '1px 6px', borderRadius: 4 }}>Капитализация</span>}
                      {d.auto_accrue && <span style={{ color: 'var(--lime-deep)', fontSize: 11, marginLeft: 8, border: '1px solid var(--lime-deep)', padding: '1px 6px', borderRadius: 4 }}>Автоначисление</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      Ставка: <b>{d.rate}%</b> · Тело: <b>{fmtMoney(d.amount)}</b>
                      {d.income_category_id && <> · Доход в: <b>{cats.find(c => c.id === d.income_category_id)?.name || '—'}</b></>}
                      {d.end_date && <> · До: {d.end_date}</>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--lime-deep)', marginBottom: 8 }}>+{fmtMoney(periodAmount)} / {periodLabel}</div>
                    
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        className="icon-button" 
                        style={{ width: 32, height: 32 }} 
                        onClick={() => setEditingDeposit(d)}
                        title="Редактировать вклад"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button 
                        className="icon-button" 
                        style={{ width: 32, height: 32 }} 
                        onClick={() => openHistory(d)} 
                        title="История начислений"
                      >
                        <Icon name="history" size={14} />
                      </button>
                      
                      {/* Убираем кнопку Начислить, если включено автоначисление */}
                      {!d.auto_accrue && (
                        <button className="toolbar-btn" onClick={() => openAccrueModal(d)} title="Начислить проценты вручную">
                          <Icon name="plus" size={14} /> Начислить
                        </button>
                      )}
                      
                      <button className="icon-button" style={{ width: 32, height: 32 }} onClick={() => api.deleteDeposit(d.id).then(load)}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Портфель</p>
            <h2>Акции и фонды</h2>
          </div>
          <button className="add-button" onClick={() => setDraftInvest({})}>
            <Icon name="plus" size={19} /><span>Добавить</span>
          </button>
        </div>

        {investments.length === 0 ? (
          <div className="empty">Пока нет инвестиций.</div>
        ) : (
          <div className="data-table-wrap" style={{ marginBottom: 0 }}>
            <div className="data-head" style={{ gridTemplateColumns: '1fr 100px 100px 100px 120px 120px 40px' }}>
              <span>Название</span>
              <span>Кол-во</span>
              <span>Ср. цена</span>
              <span>Тек. цена</span>
              <span>Стоимость</span>
              <span>Прибыль</span>
              <span></span>
            </div>
            {investments.map(i => {
              const price = i.current_price || i.avg_price
              const value = price * i.quantity
              const profit = (price - i.avg_price) * i.quantity
              const profitPct = i.avg_price > 0 ? ((price - i.avg_price) / i.avg_price) * 100 : 0
              return (
                <div key={i.id} className="data-row" style={{ gridTemplateColumns: '1fr 100px 100px 100px 120px 120px 40px', cursor: 'default' }}>
                  <span><b>{i.name}</b> {i.ticker && <span style={{ color: 'var(--muted)' }}>({i.ticker})</span>}</span>
                  <span>{i.quantity}</span>
                  <span>{fmtMoney(i.avg_price)}</span>
                  <span>
                    <input 
                      className="text-input" 
                      type="number" 
                      step="0.01"
                      style={{ padding: '4px 6px', height: 28, fontSize: 12 }}
                      value={i.current_price || i.avg_price}
                      onChange={async (e) => {
                        const val = parseFloat(e.target.value)
                        await api.updateInvestment(i.id, { current_price: val })
                        setInvestments(prev => prev.map(x => x.id === i.id ? { ...x, current_price: val } : x))
                      }}
                    />
                  </span>
                  <span>{fmtMoney(value)}</span>
                  <span style={{ color: profit >= 0 ? 'var(--lime-deep)' : 'var(--coral)', fontWeight: 700 }}>
                    {profit >= 0 ? '+' : ''}{fmtMoney(profit)} ({profitPct.toFixed(1)}%)
                  </span>
                  <button className="icon-button" style={{ width: 28, height: 28 }} onClick={() => api.deleteInvestment(i.id).then(load)}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* МОДАЛКА: ДОБАВИТЬ / РЕДАКТИРОВАТЬ ВКЛАД */}
      <Modal
        open={!!draftDeposit || !!editingDeposit}
        onClose={() => {
          setDraftDeposit(null)
          setEditingDeposit(null)
          setCustomEndDate(false)
        }}
        title={editingDeposit ? 'Редактировать вклад' : 'Добавить вклад'}
        size="lg" // <-- Сделали шире
        footer={
          <>
            <button onClick={() => {
              setDraftDeposit(null)
              setEditingDeposit(null)
              setCustomEndDate(false)
            }}>Отмена</button>
            <button className="primary" onClick={editingDeposit ? saveEditedDeposit : saveDeposit}>Сохранить</button>
          </>
        }
      >
        {(draftDeposit || editingDeposit) && (() => {
          const data = editingDeposit || draftDeposit!;
          const setData = (newData: Partial<Deposit>) => {
            if (editingDeposit) setEditingDeposit({ ...editingDeposit, ...newData } as Deposit);
            else setDraftDeposit({ ...draftDeposit, ...newData });
          };

          return (
            <div className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="modal-field">
                  <label>Название</label>
                  <input className="text-input" value={data.name || ''} onChange={(e) => setData({ name: e.target.value })} placeholder="Вклад 'Копилка'" />
                </div>
                <div className="modal-field">
                  <label>Банк</label>
                  <input className="text-input" value={data.bank || ''} onChange={(e) => setData({ bank: e.target.value })} placeholder="Т-Банк" />
                </div>
                <div className="modal-field">
                  <label>Сумма (₽)</label>
                  <NumberInput value={String(data.amount || '')} onChange={(v) => setData({ amount: parseFloat(v) })} placeholder="100000" />
                </div>
                <div className="modal-field">
                  <label>Ставка (%)</label>
                  <input className="text-input" type="number" step="0.1" value={data.rate || ''} onChange={(e) => setData({ rate: parseFloat(e.target.value) })} placeholder="15.5" />
                </div>
                <div className="modal-field">
                  <label>Дата открытия</label>
                  <DateInput value={data.start_date || ''} onChange={(v) => setData({ start_date: v })} />
                </div>
                <div className="modal-field">
                  <label>Категория дохода для процентов *</label>
                  <SearchSelect
                    value={data.income_category_id ? (cats.find(c => c.id === data.income_category_id)?.name ?? '') : ''}
                    onChange={(name) => {
                      const c = cats.find(x => x.name === name) ?? null
                      setData({ income_category_id: c?.id ?? null })
                    }}
                    options={cats.map(c => c.name)}
                    placeholder="Выберите категорию"
                  />
                </div>
              </div>

              <div className="modal-field" style={{ marginTop: 12 }}>
                <label>Как начислять проценты?</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Каждый день', value: 'daily' },
                    { label: 'Раз в месяц', value: 'monthly' },
                    { label: 'В конце срока', value: 'end' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`chip ${data.accrue_period === opt.value ? 'on' : ''}`}
                      style={{ fontSize: 13, padding: '6px 14px' }}
                      onClick={() => setData({ accrue_period: opt.value as any })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Красивые чекбоксы */}
              <div className="modal-field" style={{ marginTop: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={data.is_capitalized || false}
                    onChange={(e) => setData({ is_capitalized: e.target.checked })}
                    style={{ width: 18, height: 18, margin: 0 }}
                  />
                  Капитализация процентов
                </label>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, marginLeft: 28 }}>
                  Прибавлять проценты к телу вклада
                </div>
              </div>

              <div className="modal-field" style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={data.auto_accrue || false}
                    onChange={(e) => setData({ auto_accrue: e.target.checked })}
                    style={{ width: 18, height: 18, margin: 0 }}
                  />
                  Автоначисление
                </label>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, marginLeft: 28 }}>
                  Начислять проценты автоматически каждый период
                </div>
              </div>

              <div className="modal-field" style={{ marginTop: 12 }}>
                <label>Срок вклада</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: '3 мес', months: 3 },
                    { label: '6 мес', months: 6 },
                    { label: '1 год', months: 12 },
                    { label: 'Бессрочный', months: 0 },
                  ].map(opt => {
                    const isSelected = (() => {
                      if (customEndDate) return false;
                      if (!data.end_date) return opt.months === 0;
                      const start = data.start_date ? new Date(data.start_date) : new Date();
                      const end = new Date(data.end_date);
                      const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                      return diffMonths === opt.months;
                    })();

                    return (
                      <button
                        key={opt.label}
                        type="button"
                        className={`chip ${isSelected ? 'on' : ''}`}
                        style={{ fontSize: 13, padding: '6px 14px' }}
                        onClick={() => {
                          setCustomEndDate(false);
                          if (opt.months === 0) {
                            setData({ end_date: null });
                          } else {
                            const start = data.start_date ? new Date(data.start_date) : new Date();
                            const end = new Date(start);
                            end.setMonth(end.getMonth() + opt.months);
                            const yyyy = end.getFullYear();
                            const mm = String(end.getMonth() + 1).padStart(2, '0');
                            const dd = String(end.getDate()).padStart(2, '0');
                            setData({ end_date: `${yyyy}-${mm}-${dd}` });
                          }
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  
                  {/* Кнопка "Другое" */}
                  <button
                    type="button"
                    className={`chip ${customEndDate ? 'on' : ''}`}
                    style={{ fontSize: 13, padding: '6px 14px' }}
                    onClick={() => setCustomEndDate(true)}
                  >
                    Другое
                  </button>
                </div>
              </div>

              {/* Кастомный календарь для "Другое" */}
              {customEndDate && (
                <div className="modal-field" style={{ marginTop: 8 }}>
                  <label>Выберите дату окончания</label>
                  <DateInput 
                    value={data.end_date || ''} 
                    onChange={(v) => setData({ end_date: v })} 
                  />
                </div>
              )}

              {data.end_date && !customEndDate && (
                <div className="modal-field" style={{ marginTop: 8 }}>
                  <label>Дата закрытия (автоматически)</label>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {new Date(data.end_date).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* МОДАЛКА: ДОБАВИТЬ АКЦИЮ */}
      <Modal
        open={!!draftInvest}
        onClose={() => setDraftInvest(null)}
        title="Добавить акцию"
        size="lg" // <-- Сделали шире
        footer={
          <>
            <button onClick={() => setDraftInvest(null)}>Отмена</button>
            <button className="primary" onClick={saveInvestment}>Сохранить</button>
          </>
        }
      >
        {draftInvest && (
          <div className="modal-form">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="modal-field">
                <label>Название</label>
                <input className="text-input" value={draftInvest.name || ''} onChange={(e) => setDraftInvest({ ...draftInvest, name: e.target.value })} placeholder="Сбербанк" />
              </div>
              <div className="modal-field">
                <label>Тикер</label>
                <input className="text-input" value={draftInvest.ticker || ''} onChange={(e) => setDraftInvest({ ...draftInvest, ticker: e.target.value })} placeholder="SBER" />
              </div>
              <div className="modal-field">
                <label>Количество</label>
                <input className="text-input" type="number" value={draftInvest.quantity || ''} onChange={(e) => setDraftInvest({ ...draftInvest, quantity: parseFloat(e.target.value) })} />
              </div>
              <div className="modal-field">
                <label>Средняя цена покупки</label>
                <input className="text-input" type="number" step="0.01" value={draftInvest.avg_price || ''} onChange={(e) => setDraftInvest({ ...draftInvest, avg_price: parseFloat(e.target.value) })} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* МОДАЛКА: НАЧИСЛЕНИЕ ПРОЦЕНТОВ */}
      <Modal
        open={!!accrualDeposit}
        onClose={() => setAccrualDeposit(null)}
        title="Начисление процентов"
        footer={
          <>
            <button onClick={() => setAccrualDeposit(null)}>Отмена</button>
            <button className="primary" onClick={confirmAccrue}>Начислить</button>
          </>
        }
      >
        {accrualDeposit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              Начислить проценты по вкладу <b>«{accrualDeposit.name}»</b>?
            </p>
            
            <div className="modal-field">
              <label>Сумма к начислению (₽)</label>
              <NumberInput 
                value={String(accrualAmount)} 
                onChange={(v) => setAccrualAmount(parseFloat(v) || 0)} 
                placeholder="0" 
              />
            </div>
            
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              Доход будет добавлен в категорию <b>«{cats.find(c => c.id === accrualDeposit.income_category_id)?.name}»</b>.
              {accrualDeposit.is_capitalized && (
                <div style={{ color: 'var(--lime-deep)', marginTop: 4 }}>
                  ✅ Капитализация: тело вклада увеличится на {fmtMoney(accrualAmount)}.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* МОДАЛКА: СПРАВКА ПО ПРОЦЕНТАМ */}
      <Modal
        open={accrualHelpOpen}
        onClose={() => setAccrualHelpOpen(false)}
        title="Как работает начисление процентов"
        size="md"
        footer={<button className="primary" onClick={() => setAccrualHelpOpen(false)}>Понятно</button>}
      >
        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
          <p><b>1. Как рассчитывается сумма?</b></p>
          <p>В зависимости от выбранного периода:</p>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li><b>Каждый день</b>: (Сумма × Ставка / 100) / 365</li>
            <li><b>Раз в месяц</b>: (Сумма × Ставка / 100) / 12</li>
            <li><b>В конце срока</b>: (Сумма × Ставка / 100) × (Дней / 365)</li>
          </ul>

          <p><b>2. Что происходит при начислении?</b></p>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>Создается запись в истории начислений вклада.</li>
            <li>Создается запись в <b>Доходах</b> (в категории, выбранной при создании вклада).</li>
            <li>Вы можете изменить сумму вручную.</li>
          </ul>

          <p><b>3. А тело вклада меняется?</b></p>
          <p>Зависит от настройки «Капитализация»:</p>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li><b>Включена</b>: проценты прибавляются к телу вклада.</li>
            <li><b>Выключена</b>: проценты уходят в доходы, тело не меняется.</li>
          </ul>
        </div>
      </Modal>

      {/* МОДАЛКА: ИСТОРИЯ НАЧИСЛЕНИЙ */}
      <Modal
        open={!!historyDeposit}
        onClose={() => setHistoryDeposit(null)}
        title={`История начислений: ${historyDeposit?.name}`}
        footer={<button className="primary" onClick={() => setHistoryDeposit(null)}>Закрыть</button>}
      >
        {historyLoading ? (
          <div className="empty">Загрузка...</div>
        ) : historyList.length === 0 ? (
          <div className="empty">Пока не было начислений по этому вкладу.</div>
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Дата</th>
                  <th style={{ padding: 8 }}>Сумма</th>
                  <th style={{ padding: 8 }}>Статус</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: 8 }}>{new Date(h.date).toLocaleDateString('ru-RU')}</td>
                    <td style={{ padding: 8, color: 'var(--lime-deep)', fontWeight: 700 }}>+{fmtMoney(h.amount)}</td>
                    <td style={{ padding: 8 }}>
                      {h.linked_income_id ? (
                        <span style={{ color: 'var(--lime-deep)' }}>✅ Зачислено в доходы</span>
                      ) : (
                        <span style={{ color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          ⚠️ Удалено из доходов
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  )
}