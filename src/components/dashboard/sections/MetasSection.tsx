'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { Plus, Trash2, Target, X, PiggyBank } from 'lucide-react'
import { addGoal, deleteGoal, updateGoalProgress, updateGoalTarget } from '@/app/dashboard/actions/goals'
import type { Goal } from '@/types/database'
import { createClient } from '@/utils/supabase/client'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

const GOAL_COLORS = [
  { color: '#01584C', label: 'Verde' },
  { color: '#FFB300', label: 'Ouro' },
  { color: '#F57C00', label: 'Laranja' },
  { color: '#28A745', label: 'Verde claro' },
  { color: '#0288D1', label: 'Azul' },
  { color: '#7B1FA2', label: 'Roxo' },
]

export function MetasSection({ hidden }: { hidden: boolean }) {
  const [items, setItems] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editMonths, setEditMonths] = useState(6)
  const [monthlyIncome, setMonthlyIncome] = useState<number>(3000)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [selectedColor, setSelectedColor] = useState('#01584C')
  const formRef = useRef<HTMLFormElement>(null)
  const [supabase] = useState(() => createClient())
  const [nowTime] = useState(() => Date.now())

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // 1. Obter renda mensal do perfil
    const { data: profile } = await supabase
      .from('financial_profiles')
      .select('monthly_income')
      .eq('user_id', user.id)
      .single()
    
    const income = profile?.monthly_income || 3000
    setMonthlyIncome(income)

    // 2. Obter metas
    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    let goals = (goalsData ?? []) as Goal[]

    // 3. Verificar se Reserva de Emergência existe
    const hasEmergencyGoal = goals.some(g =>
      g.name.toLowerCase().includes('reserva de emergência') ||
      g.name.toLowerCase().includes('reserva de emergencia')
    )

    if (!hasEmergencyGoal) {
      const defaultMonths = 6
      const targetAmount = income * defaultMonths
      
      const { data: newGoal, error: insertError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          name: 'Reserva de Emergência',
          target_amount: targetAmount,
          current_amount: 0,
          color: '#01584C',
          icon: 'PiggyBank'
        })
        .select()
        .single()

      if (!insertError && newGoal) {
        goals = [...goals, newGoal as Goal]
      }
    }

    setItems(goals)
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  function handleSubmit(fd: FormData) {
    fd.set('color', selectedColor)
    setError('')
    startTransition(async () => {
      const res = await addGoal(fd)
      if (res && 'error' in res) { setError(res.error ?? 'Erro desconhecido'); return }
      formRef.current?.reset()
      setShowForm(false)
      await load()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteGoal(id)
      await load()
    })
  }

  function handleUpdateProgress(id: string) {
    const val = parseFloat(editValue.replace(',', '.'))
    if (isNaN(val) || val < 0) return

    const goalToUpdate = items.find(g => g.id === id)
    const isEmergency = goalToUpdate 
      ? goalToUpdate.name.toLowerCase().includes('reserva de emergência') || goalToUpdate.name.toLowerCase().includes('reserva de emergencia')
      : false

    startTransition(async () => {
      await updateGoalProgress(id, val)
      if (isEmergency) {
        const monthsVal = Math.max(6, editMonths)
        const newTarget = (monthlyIncome || 3000) * monthsVal
        await updateGoalTarget(id, newTarget)
      }
      setEditId(null)
      setEditValue('')
      await load()
    })
  }

  const [barsReady, setBarsReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setBarsReady(true), 80); return () => clearTimeout(t) }, [items])


  return (
    <div className="fd-stack fade-up">
      <div className="topbar-inline">
        <div>
          <h2 className="section-title">Metas financeiras</h2>
          <p className="section-sub">Acompanhe o progresso dos seus objetivos</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nova meta
        </button>
      </div>

      {showForm && (
        <>
          <div className="modal-scrim" onClick={() => setShowForm(false)} />
          <div className="modal-box">
            <div className="modal-head">
              <h3>Nova meta</h3>
              <button className="icon-btn" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form ref={formRef} action={handleSubmit} className="entry-form">
              <label>
                <span>Nome da meta <span className="req">*</span></span>
                <input name="name" placeholder="Ex: Viagem para Europa" required />
              </label>
              <div className="form-row">
                <label>
                  <span>Valor alvo (R$) <span className="req">*</span></span>
                  <input name="target_amount" type="number" min="1" step="0.01" placeholder="0,00" required />
                </label>
                <label>
                  Já guardei (R$)
                  <input name="current_amount" type="number" min="0" step="0.01" placeholder="0,00" />
                </label>
              </div>
              <label>
                Data alvo
                <input name="target_date" type="date" />
              </label>
              <div>
                <div className="ob-label" style={{ marginBottom: 8 }}>Cor</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {GOAL_COLORS.map(({ color, label }) => (
                    <button
                      key={color}
                      type="button"
                      title={label}
                      onClick={() => setSelectedColor(color)}
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: color,
                        border: selectedColor === color ? '3px solid #1A1A1A' : '3px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? 'Salvando…' : 'Criar meta'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {loading ? (
        <p className="empty-msg">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="empty-list">
            <Target size={32} />
            <p>Nenhuma meta criada ainda.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Criar primeira meta
            </button>
          </div>
        </div>
      ) : (
        <div className="fd-grid">
          {items.map(g => {
            const isEmergency = g.name.toLowerCase().includes('reserva de emergência') || g.name.toLowerCase().includes('reserva de emergencia')
            const months = isEmergency ? Math.max(6, Math.round(g.target_amount / (monthlyIncome || 3000))) : null
            
            const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0
            const remaining = Math.max(0, g.target_amount - g.current_amount)
            const monthsLeft = g.target_date
              ? Math.max(1, Math.ceil((new Date(g.target_date).getTime() - nowTime) / (1000 * 60 * 60 * 24 * 30)))
              : null
            const monthlyNeeded = monthsLeft ? remaining / monthsLeft : null

            return (
              <div key={g.id} className="col-6">
                <section className="card goal-card">
                  <div className="goal-top">
                    <div className="goal-ic" style={{ background: g.color + '22', color: g.color }}>
                      <PiggyBank size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="goal-name">
                        {g.name} {isEmergency && months && `(${months} meses)`}
                      </div>
                      {g.target_date && <div className="goal-sub">Meta: {formatDate(g.target_date)}</div>}
                    </div>
                    <div className="goal-pct" style={{ color: g.color }}>{pct}%</div>
                    {isEmergency ? (
                      <button
                        className="icon-btn delete-btn"
                        disabled
                        title="A Reserva de Emergência não pode ser excluída"
                        style={{ opacity: 0.4, cursor: 'not-allowed' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <button
                        className="icon-btn delete-btn"
                        onClick={() => handleDelete(g.id)}
                        disabled={isPending}
                        title="Excluir meta"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="goal-track" style={{ margin: '14px 0 10px' }}>
                    <i style={{ width: barsReady ? `${pct}%` : '0%', background: g.color }} />
                  </div>

                  <div className="goal-meta">
                    <span>
                      <b className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(g.current_amount)}</b> guardados
                    </span>
                    <span>de <span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(g.target_amount)}</span></span>
                  </div>

                  {remaining > 0 && monthlyNeeded && (
                    <div className="goal-tip">
                      Guardar <b className={hidden ? 'priv' : ''}>R$ {brl(monthlyNeeded)}/mês</b> para atingir no prazo
                    </div>
                  )}

                  {/* Atualizar progresso */}
                  {editId === g.id ? (
                    <div className="goal-edit" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Valor guardado (R$)</span>
                        <input
                          type="number" min="0" step="0.01"
                          placeholder="Valor atual (R$)"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          autoFocus
                          className="ob-input"
                          style={{ fontSize: 14, padding: '8px 12px', width: '100%' }}
                        />
                      </div>
                      
                      {isEmergency && (
                        <div>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Meses de cobertura (mín. 6)</span>
                          <input
                            type="number" min="6" step="1"
                            value={editMonths}
                            onChange={e => setEditMonths(parseInt(e.target.value) || 6)}
                            className="ob-input"
                            style={{ fontSize: 14, padding: '8px 12px', width: '100%' }}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => handleUpdateProgress(g.id)} disabled={isPending}>
                          Salvar
                        </button>
                        <button className="btn-ghost" onClick={() => setEditId(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button className="link-btn" style={{ marginTop: 12 }} onClick={() => { 
                      setEditId(g.id)
                      setEditValue(String(g.current_amount))
                      if (isEmergency) {
                        setEditMonths(months || 6)
                      }
                    }}>
                      Atualizar progresso
                    </button>
                  )}
                </section>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
