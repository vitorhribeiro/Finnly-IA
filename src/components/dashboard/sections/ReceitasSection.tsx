'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { Plus, Trash2, ArrowDown, X } from 'lucide-react'
import { addIncome, deleteIncome, getAllIncomes } from '@/app/dashboard/actions/incomes'
import { INCOME_CATEGORIES } from '@/types/database'
import type { Income } from '@/types/database'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ReceitasSection({ hidden }: { hidden: boolean }) {
  const [items, setItems] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  async function load() {
    setLoading(true)
    const data = await getAllIncomes()
    setItems(data as Income[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleSubmit(fd: FormData) {
    setError('')
    startTransition(async () => {
      const res = await addIncome(fd)
      if (res && 'error' in res) { setError(res.error ?? 'Erro desconhecido'); return }
      formRef.current?.reset()
      setShowForm(false)
      await load()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteIncome(id)
      await load()
    })
  }

  const total = items.reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div className="fd-stack fade-up">
      <div className="topbar-inline">
        <div>
          <h2 className="section-title">Receitas</h2>
          <p className="section-sub">Registre e acompanhe todas as suas entradas</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nova receita
        </button>
      </div>

      {/* Totalizador */}
      <div className="kpi kpi-wide">
        <div className="kpi-top">
          <div className="kpi-ic t-green"><ArrowDown size={20} /></div>
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

      {/* Modal de adição */}
      {showForm && (
        <>
          <div className="modal-scrim" onClick={() => setShowForm(false)} />
          <div className="modal-box">
            <div className="modal-head">
              <h3>Nova receita</h3>
              <button className="icon-btn" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form ref={formRef} action={handleSubmit} className="entry-form">
              <label>
                Descrição
                <input name="description" placeholder="Ex: Salário junho" />
              </label>
              <label>
                Valor (R$) <span className="req">*</span>
                <input name="amount" type="number" min="0.01" step="0.01" placeholder="0,00" required />
              </label>
              <label>
                Categoria <span className="req">*</span>
                <select name="category" defaultValue="Salário" required>
                  {INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label>
                Data <span className="req">*</span>
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </label>
              {error && <p className="form-error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? 'Salvando…' : 'Salvar receita'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Lista */}
      <section className="card">
        {loading ? (
          <p className="empty-msg">Carregando…</p>
        ) : items.length === 0 ? (
          <div className="empty-list">
            <ArrowDown size={32} className="t-green" />
            <p>Nenhuma receita registrada ainda.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Adicionar primeira receita
            </button>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="row-item">
              <div className="row-ic t-green"><ArrowDown size={19} /></div>
              <div className="row-main">
                <div className="row-name">{item.description ?? item.category}</div>
                <div className="row-sub">{item.category} · {formatDate(item.date)}</div>
              </div>
              <div className="row-amt pos">
                <span className={`tabnums${hidden ? ' priv' : ''}`}>
                  + R$ {brl(Number(item.amount))}
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
          ))
        )}
      </section>
    </div>
  )
}
