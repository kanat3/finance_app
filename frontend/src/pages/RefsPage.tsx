import React, { useEffect, useState } from 'react'
import { api, Category, Subcategory } from '@/api'
import { Icon } from '@/icons'
import { ConfirmModal, PromptModal } from '@/ui/Modal'
import { useToast } from '@/ui/Toast'

type PromptState =
  | { kind: 'addCat' }
  | { kind: 'renameCat'; id: number; current: string }
  | { kind: 'addSub' }
  | { kind: 'renameSub'; id: number; current: string }
  | { kind: 'addIncCat' }
  | { kind: 'renameIncCat'; id: number; current: string }

type DeleteState =
  | { kind: 'cat'; id: number; name: string }
  | { kind: 'sub'; id: number; name: string }
  | { kind: 'incCat'; id: number; name: string }

export function RefsPage() {
  const toast = useToast()
  const [cats, setCats] = useState<Category[]>([])
  const [subs, setSubs] = useState<Subcategory[]>([])
  const [incCats, setIncCats] = useState<Category[]>([])
  const [selCat, setSelCat] = useState<number | null>(null)
  const [prompt, setPrompt] = useState<PromptState | null>(null)
  const [del, setDel] = useState<DeleteState | null>(null)

  const reload = async () => {
    const [c, s, ic] = await Promise.all([
      api.expenseCategories(),
      api.expenseSubcategories(),
      api.incomeCategories(),
    ])
    setCats(c); setSubs(s); setIncCats(ic)
    if (!selCat && c.length) setSelCat(c[0].id)
    if (selCat && !c.find((x) => x.id === selCat)) setSelCat(c[0]?.id ?? null)
  }
  useEffect(() => { reload() }, [])

  const promptTitle = () => {
    if (!prompt) return ''
    switch (prompt.kind) {
      case 'addCat': return 'Новая категория расходов'
      case 'renameCat': return 'Переименовать категорию'
      case 'addSub': return 'Новая подкатегория'
      case 'renameSub': return 'Переименовать подкатегорию'
      case 'addIncCat': return 'Новая категория доходов'
      case 'renameIncCat': return 'Переименовать категорию дохода'
    }
  }
  const promptDefault = () => {
    if (!prompt) return ''
    if ('current' in prompt) return prompt.current
    return ''
  }
  const promptSubmit = async (v: string) => {
    if (!prompt || !v) return
    try {
      switch (prompt.kind) {
        case 'addCat': await api.addExpenseCategory(v); break
        case 'renameCat': await api.renameExpenseCategory(prompt.id, v); break
        case 'addSub':
          if (!selCat) { toast.show('Выберите категорию', 'err'); return }
          await api.addSubcategory(selCat, v); break
        case 'renameSub': await api.renameSubcategory(prompt.id, v); break
        case 'addIncCat': await api.addIncomeCategory(v); break
        case 'renameIncCat': await api.renameIncomeCategory(prompt.id, v); break
      }
      toast.show('Сохранено', 'ok')
      setPrompt(null); await reload()
    } catch (e: any) { toast.show(e.message, 'err') }
  }

  const doDelete = async () => {
    if (!del) return
    try {
      if (del.kind === 'cat') await api.deleteExpenseCategory(del.id)
      else if (del.kind === 'sub') await api.deleteSubcategory(del.id)
      else await api.deleteIncomeCategory(del.id)
      toast.show('Удалено', 'ok')
      setDel(null); await reload()
    } catch (e: any) { toast.show(e.message, 'err') }
  }

  const deleteMessage = () => {
    if (!del) return ''
    if (del.kind === 'cat') return `«${del.name}» и все её подкатегории будут удалены. У расходов категория станет пустой.`
    if (del.kind === 'sub') return `«${del.name}» будет удалена. У связанных расходов подкатегория станет пустой.`
    return `«${del.name}» будет удалена. У связанных доходов категория станет пустой.`
  }

  const filteredSubs = subs.filter((s) => s.category_id === selCat)
  const curCatName = cats.find((c) => c.id === selCat)?.name

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Раздел</p>
          <h1>Справочники</h1>
        </div>
        <div className="heading-actions">
          <button onClick={() => window.open(api.exportUrl('refs', 'xlsx'))}>
            <Icon name="download" size={16} /> Excel
          </button>
          <button onClick={() => window.open(api.exportUrl('refs', 'csv'))}>
            <Icon name="download" size={16} /> CSV
          </button>
        </div>
      </section>

      <div className="lists">
        <div className="list-box">
          <h4>Категории расходов <span className="hint">({cats.length})</span></h4>
          <ul>
            {cats.map((c) => (
              <li key={c.id} className={selCat === c.id ? 'sel' : ''} onClick={() => setSelCat(c.id)}>
                <span>{c.name}</span>
                <span className="acts" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setPrompt({ kind: 'renameCat', id: c.id, current: c.name })}>
                    <Icon name="edit" size={12} />
                  </button>
                  <button onClick={() => setDel({ kind: 'cat', id: c.id, name: c.name })}>
                    <Icon name="trash" size={12} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <button className="add-button" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setPrompt({ kind: 'addCat' })}>
            <Icon name="plus" size={16} /> Добавить
          </button>
        </div>

        <div className="list-box">
          <h4>Подкатегории <span className="hint">{curCatName ? `(${curCatName})` : ''}</span></h4>
          <ul>
            {filteredSubs.length === 0 && <li className="empty">Выберите категорию слева</li>}
            {filteredSubs.map((s) => (
              <li key={s.id}>
                <span>{s.name}</span>
                <span className="acts">
                  <button onClick={() => setPrompt({ kind: 'renameSub', id: s.id, current: s.name })}>
                    <Icon name="edit" size={12} />
                  </button>
                  <button onClick={() => setDel({ kind: 'sub', id: s.id, name: s.name })}>
                    <Icon name="trash" size={12} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <button className="add-button" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setPrompt({ kind: 'addSub' })} disabled={!selCat}>
            <Icon name="plus" size={16} /> Добавить
          </button>
        </div>

        <div className="list-box">
          <h4>Категории доходов <span className="hint">({incCats.length})</span></h4>
          <ul>
            {incCats.map((c) => (
              <li key={c.id}>
                <span>{c.name}</span>
                <span className="acts">
                  <button onClick={() => setPrompt({ kind: 'renameIncCat', id: c.id, current: c.name })}>
                    <Icon name="edit" size={12} />
                  </button>
                  <button onClick={() => setDel({ kind: 'incCat', id: c.id, name: c.name })}>
                    <Icon name="trash" size={12} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <button className="add-button" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setPrompt({ kind: 'addIncCat' })}>
            <Icon name="plus" size={16} /> Добавить
          </button>
        </div>
      </div>

      <PromptModal
        open={!!prompt}
        title={promptTitle()}
        label="Название"
        defaultValue={promptDefault()}
        onOk={promptSubmit}
        onCancel={() => setPrompt(null)}
      />

      <ConfirmModal
        open={!!del}
        title="Удалить?"
        message={deleteMessage()}
        onOk={doDelete}
        onCancel={() => setDel(null)}
      />
    </>
  )
}