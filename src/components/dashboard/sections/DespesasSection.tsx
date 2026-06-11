'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { Plus, Trash2, ArrowUp, X } from 'lucide-react'
import { addExpense, deleteExpense, getAllExpenses } from '@/app/dashboard/actions/expenses'
import { EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/types/database'
import type { Expense } from '@/types/database'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DespesasSection({ hidden }: { hidden: boolean }) {
  const [items, setItems] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  async function load() {
    setLoading(true)
    const data = await getAllExpenses()
    setItems(data as Expense[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleSubmit(fd: FormData) {
    setError('')
    startTransition(async () => {
      const res = await addExpense(fd)
      if (res && 'error' in res) { setError(res.error ?? 'Erro desconhecido'); return }
      formRef.current?.reset()
      setShowForm(false)
      await load()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExpense(id)
      await load()
    })
  }

  const total = items.reduce((s, r) => s + Number(r.amount), 0)

  // Resumo por categoria
  const catMap: Record<string, number> = {}
  for (const e of items) catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount)
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="fd-stack fade-up">
      <div className="topbar-inline">
        <div>
          <h2 className="section-title">Despesas</h2>
          <p className="section-sub">Acompanhe e categorize seus gastos</p>
        </div>
        <button className="btn-primary btn-orange" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nova despesa
        </button>
      </div>

      <div className="fd-grid">
        <div className="col-4">
          <div className="kpi kpi-wide">
            <div className="kpi-top">
              <div className="kpi-ic t-orange"><ArrowUp size={20} /></div>
              <div className="kpi-label">Total registrado</div>
            </div>
            <div className="kpi-val">
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(total)}
              </span>
            </div>
            <div className="kpi-foot">
              <span className="mut">{items.length} lançamento{items.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {cats.length > 0 && (
          <div className="col-8">
            <section className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Por categoria</div>
              {cats.map(([cat, val]) => {
                const pct = total > 0 ? Math.round((val / total) * 100) : 0
                const color = CATEGORY_COLORS[cat] ?? '#90A4AE'
                return (
                  <div key={cat} className="cat-row">
                    <div className="cat-name">
                      <span className="cat-dot" style={{ background: color }} />
                      {cat}
                    </div>
                    <div>
                      <div className="cat-track">
                        <i style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="cat-pct" style={{ marginTop: 5 }}>{pct}%</div>
                    </div>
                    <div className="cat-val">
                      <span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(val)}</span>
                    </div>
                  </div>
                )
              })}
            </section>
          </div>
        )}
      </div>

      {showForm && (
        <>
          <div className="modal-scrim" onClick={() => setShowForm(false)} />
          <div className="modal-box">
            <div className="modal-head">
              <h3>Nova despesa</h3>
              <button className="icon-btn" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form ref={formRef} action={handleSubmit} className="entry-form">
              <label>
                Descrição
                <input name="description" placeholder="Ex: Mercado" />
              </label>
              <label>
                Valor (R$) <span className="req">*</span>
                <input name="amount" type="number" min="0.01" step="0.01" placeholder="0,00" required />
              </label>
              <label>
                Categoria <span className="req">*</span>
                <select name="category" defaultValue="Alimentação" required>
                  {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label>
                Data <span className="req">*</span>
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </label>
              {error && <p className="form-error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary btn-orange" disabled={isPending}>
                  {isPending ? 'Salvando…' : 'Salvar despesa'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <section className="card">
        {loading ? (
          <p className="empty-msg">Carregando…</p>
        ) : items.length === 0 ? (
          <div className="empty-list">
            <ArrowUp size={32} className="t-orange" />
            <p>Nenhuma despesa registrada ainda.</p>
            <button className="btn-primary btn-orange" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Adicionar primeira despesa
            </button>
          </div>
        ) : (
          items.map(item => {
            const color = CATEGORY_COLORS[item.category] ?? '#90A4AE'
            return (
              <div key={item.id} className="row-item">
                <div className="row-ic" style={{ background: color + '22', color }}><ArrowUp size={19} /></div>
                <div className="row-main">
                  <div className="row-name">{item.description ?? item.category}</div>
                  <div className="row-sub">{item.category} · {formatDate(item.date)}</div>
                </div>
                <div className="row-amt neg-amt">
                  <span className={`tabnums${hidden ? ' priv' : ''}`}>
                    – R$ {brl(Number(item.amount))}
                  </span>
                </div>
                <button
                  className="icon-btn delete-btn"
                  onClick={() => handleDelete(item.id)}
                  disabled={isPending}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
