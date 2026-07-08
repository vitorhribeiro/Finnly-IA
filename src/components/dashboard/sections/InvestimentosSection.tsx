'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Trash2, Edit3, X, Landmark, TrendingUp, HelpCircle } from 'lucide-react'
import { getInvestments, createInvestment, updateInvestment, deleteInvestment } from '@/app/dashboard/actions/investments'
import { Donut } from '../Charts'
import type { Investment } from '@/types/database'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TYPE_LABELS: Record<Investment['type'], string> = {
  renda_fixa: 'Renda Fixa',
  acoes: 'Ações',
  fiis: 'FIIs',
  cripto: 'Cripto',
  fundos: 'Fundos',
  outros: 'Outros ativos',
}

const TYPE_COLORS: Record<Investment['type'], string> = {
  renda_fixa: '#01584C', // Dark Teal
  acoes: '#0288D1',     // Blue
  fiis: '#FFB300',      // Gold
  cripto: '#F57C00',    // Orange
  fundos: '#7B1FA2',    // Purple
  outros: '#455A64',    // Slate
}

export function InvestimentosSection({ hidden }: { hidden: boolean }) {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editInvest, setEditInvest] = useState<Investment | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Form de investimento
  const [name, setName] = useState('')
  const [type, setType] = useState<Investment['type']>('renda_fixa')
  const [amount, setAmount] = useState('')
  const [yieldRate, setYieldRate] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])

  async function loadData() {
    setLoading(true)
    const data = await getInvestments()
    setInvestments(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function openNewModal() {
    setEditInvest(null)
    setName('')
    setType('renda_fixa')
    setAmount('')
    setYieldRate('')
    setDate(new Date().toISOString().split('T')[0])
    setError('')
    setShowModal(true)
  }

  function openEditModal(inv: Investment) {
    setEditInvest(inv)
    setName(inv.name)
    setType(inv.type)
    setAmount(String(inv.amount))
    setYieldRate(String(inv.yield_rate))
    setDate(inv.date)
    setError('')
    setShowModal(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome do ativo é obrigatório'); return }
    const amt = parseFloat(amount.replace(',', '.'))
    if (isNaN(amt) || amt < 0) { setError('Digite um valor de investimento válido'); return }

    const fd = new FormData()
    fd.set('name', name.trim())
    fd.set('type', type)
    fd.set('amount', amount)
    fd.set('yield_rate', yieldRate || '0')
    fd.set('date', date)

    startTransition(async () => {
      let res
      if (editInvest) {
        res = await updateInvestment(editInvest.id, fd)
      } else {
        res = await createInvestment(fd)
      }

      if (res && 'error' in res) {
        setError(res.error || 'Erro ao salvar investimento')
      } else {
        setShowModal(false)
        await loadData()
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Deseja realmente remover este investimento da sua carteira?')) return
    startTransition(async () => {
      await deleteInvestment(id)
      await loadData()
    })
  }

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount), 0)

  // Consolidar por tipo
  const summaryByType = Object.keys(TYPE_LABELS).reduce((acc, t) => {
    const typeKey = t as Investment['type']
    const typeAmt = investments.filter(inv => inv.type === typeKey).reduce((sum, i) => sum + Number(i.amount), 0)
    if (typeAmt > 0) {
      acc.push({
        type: typeKey,
        label: TYPE_LABELS[typeKey],
        value: typeAmt,
        color: TYPE_COLORS[typeKey],
        pct: totalInvested > 0 ? Math.round((typeAmt / totalInvested) * 100) : 0
      })
    }
    return acc
  }, [] as { type: Investment['type']; label: string; value: number; color: string; pct: number }[])

  const donutData = summaryByType.map(s => ({ value: s.value, color: s.color }))

  return (
    <div className="fd-stack fade-up">
      <div className="topbar-inline" style={{ justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={openNewModal}>
          <Plus size={18} /> Novo ativo
        </button>
      </div>

      <div className="fd-grid">
        {/* KPI total */}
        <div className="col-4 col-sm-12">
          <div className="kpi kpi-wide" style={{ background: 'var(--surface-3)', border: '1px solid var(--teal-tint)' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-teal" style={{ background: 'var(--teal-tint)' }}><TrendingUp size={20} /></div>
              <div className="kpi-label">Patrimônio Investido</div>
            </div>
            <div className="kpi-val" style={{ color: 'var(--teal-900)' }}>
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(totalInvested)}
              </span>
            </div>
            <div className="kpi-foot">
              <span className="mut">
                Distribuição diversificada em {summaryByType.length} classe{summaryByType.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico Donut de alocação */}
        {summaryByType.length > 0 && (
          <div className="col-8 col-sm-12">
            <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 30, flexWrap: 'wrap' }}>
              <div style={{ flex: 'none', display: 'grid', placeItems: 'center', position: 'relative', width: 140, height: 140 }}>
                <Donut data={donutData} size={130} stroke={16} />
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Ativos</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--teal-900)' }}>{investments.length}</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="card-title" style={{ fontSize: 15, marginBottom: 8 }}>Alocação de Ativos</div>
                {summaryByType.map(s => (
                  <div key={s.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                      <span style={{ fontWeight: 600, color: 'var(--teal-900)' }}>{s.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ color: 'var(--muted)' }}>{s.pct}%</span>
                      <span style={{ fontWeight: 700 }} className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(s.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Tabela de ativos */}
      <section className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Meus Ativos</div>
        {loading ? (
          <p className="empty-msg">Carregando carteira de investimentos…</p>
        ) : investments.length === 0 ? (
          <div className="empty-list">
            <TrendingUp size={32} className="t-teal" />
            <p>Sua carteira de investimentos está vazia.</p>
            <button className="btn-primary" onClick={openNewModal}>Adicionar Primeiro Ativo</button>
          </div>
        ) : (
          <div>
            {investments.map(inv => (
              <div key={inv.id} className="row-item">
                <div className="row-ic" style={{ background: TYPE_COLORS[inv.type] + '18', color: TYPE_COLORS[inv.type] }}><Landmark size={18} /></div>
                <div className="row-main">
                  <div className="row-name">{inv.name}</div>
                  <div className="row-sub">
                    {TYPE_LABELS[inv.type]} · Rendimento: <b>{inv.yield_rate}% a.a.</b>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className={`row-amt tabnums${hidden ? ' priv' : ''}`} style={{ fontWeight: 800 }}>
                    R$ {brl(Number(inv.amount))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" onClick={() => openEditModal(inv)} title="Editar"><Edit3 size={14} /></button>
                    <button className="icon-btn delete-btn" onClick={() => handleDelete(inv.id)} title="Excluir"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL INVESTIMENTO */}
      {showModal && (
        <>
          <div className="modal-scrim" onClick={() => setShowModal(false)} />
          <div className="modal-box">
            <div className="modal-head">
              <h3>{editInvest ? 'Editar Ativo' : 'Novo Investimento'}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="entry-form">
              <label>
                <span>Nome do Ativo / Papel <span className="req">*</span></span>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Tesouro SELIC 2029, PETR4..." required />
              </label>

              <div className="form-row">
                <label>
                  <span>Tipo de Ativo <span className="req">*</span></span>
                  <select value={type} onChange={e => setType(e.target.value as Investment['type'])} required>
                    <option value="renda_fixa">Renda Fixa (CDB, Tesouro...)</option>
                    <option value="acoes">Ações</option>
                    <option value="fiis">FIIs (Fundos Imobiliários)</option>
                    <option value="cripto">Criptomoedas</option>
                    <option value="fundos">Fundos de Investimento</option>
                    <option value="outros">Outros ativos</option>
                  </select>
                </label>
                <label>
                  <span>Valor Investido (R$) <span className="req">*</span></span>
                  <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" placeholder="0,00" required />
                </label>
              </div>

              <div className="form-row">
                <label style={{ position: 'relative' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Rendimento Estimado (% a.a.)
                    <span title="Taxa de rendimento ao ano estimada (ex: 10,75 para 10,75% a.a.)" style={{ cursor: 'help' }}>
                      <HelpCircle size={13} />
                    </span>
                  </span>
                  <input value={yieldRate} onChange={e => setYieldRate(e.target.value)} type="number" step="0.01" placeholder="Ex: 10,75" />
                </label>
                <label>
                  <span>Data da Compra <span className="req">*</span></span>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </label>
              </div>

              {error && <p className="form-error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? 'Salvando…' : 'Salvar investimento'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
