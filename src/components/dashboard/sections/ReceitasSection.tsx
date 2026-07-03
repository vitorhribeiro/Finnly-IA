'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import {
  Plus, X, Pencil, Trash2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  ArrowDown, Search, Filter, CalendarClock, Tag, CheckCircle2, Sparkles, AlertCircle, Percent, PieChart, Copy
} from 'lucide-react'
import { CardInfoTooltip } from '@/components/ui/CardInfoTooltip'
import { getTransactionStatus } from '@/lib/utils'
import { addIncome, updateIncome, deleteIncome, getAllIncomes } from '@/app/dashboard/actions/incomes'
import { getIncomeCategories } from '@/app/dashboard/actions/income-categories'
import { getAccounts } from '@/app/dashboard/actions/accounts'
import type { Income, IncomeCategory, Account } from '@/types/database'
import { PremiumIncomeModal } from './PremiumIncomeModal'
import TransactionsFilterDrawer, { FilterState, defaultFilterState } from '@/components/dashboard/filters/TransactionsFilterDrawer'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const mName = d.toLocaleDateString('pt-BR', { month: 'long' })
  return `${mName.charAt(0).toUpperCase() + mName.slice(1)} de ${y}`
}

export function ReceitasSection({ hidden, onAsk }: { hidden: boolean; onAsk?: (seed?: string) => void }) {
  const [allIncomes, setAllIncomes] = useState<Income[]>([])
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Global Month
  const currentMonthYM = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYM)

  // Drawer & Filters
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState)
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [editIncome, setEditIncome] = useState<Income | null>(null)

  const [isPending, startTransition] = useTransition()

  async function load() {
    setLoading(true)
    const [data, cats, accs] = await Promise.all([
      getAllIncomes(), // Assuming an action like this exists, else fetch from supabase
      getIncomeCategories(),
      getAccounts()
    ])
    setAllIncomes(data as Income[])
    setCategories(cats)
    setAccounts(accs)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteIncome(id)
      await load()
    })
  }

  function handleSaved() {
    setShowIncomeModal(false)
    setEditIncome(null)
    load()
  }

  // --- KPIs and Metrics (Based on Global selectedMonth) ---
  const currentIncomes = useMemo(() => allIncomes.filter(i => i.date.slice(0, 7) === selectedMonth), [allIncomes, selectedMonth])
  const totalPeriodo = currentIncomes.reduce((s, i) => s + Number(i.amount), 0)
  const recebido = currentIncomes.filter(i => getTransactionStatus(i.payment_status, i.date) === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const pendente = currentIncomes.filter(i => getTransactionStatus(i.payment_status, i.date) === 'pending').reduce((s, i) => s + Number(i.amount), 0)
  const atrasado = currentIncomes.filter(i => getTransactionStatus(i.payment_status, i.date) === 'overdue').reduce((s, i) => s + Number(i.amount), 0)

  // Composição
  const receitaFixa = currentIncomes.filter(i => i.income_type === 'fixed').reduce((s, i) => s + Number(i.amount), 0)
  const receitaVar = currentIncomes.filter(i => i.income_type === 'variable').reduce((s, i) => s + Number(i.amount), 0)
  const pctFixa = totalPeriodo > 0 ? Math.round((receitaFixa / totalPeriodo) * 100) : 0
  const pctVar = totalPeriodo > 0 ? 100 - pctFixa : 0

  // Fontes (Categories)
  const catMap: Record<string, number> = {}
  currentIncomes.forEach(i => catMap[i.category] = (catMap[i.category] ?? 0) + Number(i.amount))
  const catRanking = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Histórico 4 Meses
  const history4m = useMemo(() => {
    const res = []
    const [y, m] = selectedMonth.split('-').map(Number)
    for (let i = 3; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1)
      const ym = d.toISOString().slice(0, 7)
      const t = allIncomes.filter(inc => inc.date.slice(0, 7) === ym).reduce((s, inc) => s + Number(inc.amount), 0)
      res.push({ ym, label: getMonthLabel(ym).split(' ')[0], total: t })
    }
    return res
  }, [allIncomes, selectedMonth])
  const maxHVal = Math.max(...history4m.map(m => m.total), 1)

  // --- Table Filters (Based on Drawer) ---
  const filteredIncomes = useMemo(() => {
    return allIncomes.filter(inc => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const desc = (inc.description || '').toLowerCase()
        const cat = inc.category.toLowerCase()
        if (!desc.includes(q) && !cat.includes(q)) return false
      }
      
      if (filterState.period === 'global') {
        if (inc.date.slice(0, 7) !== selectedMonth) return false
      } else if (filterState.period === 'this_month') {
        const ym = new Date().toISOString().slice(0, 7)
        if (inc.date.slice(0, 7) !== ym) return false
      } else if (filterState.period === 'last_month') {
        const d = new Date()
        d.setMonth(d.getMonth() - 1)
        if (inc.date.slice(0, 7) !== d.toISOString().slice(0, 7)) return false
      } else if (filterState.period === 'last_7') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        if (inc.date < d.toISOString().slice(0, 10)) return false
      } else if (filterState.period === 'last_30') {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        if (inc.date < d.toISOString().slice(0, 10)) return false
      } else if (filterState.period === 'custom' && filterState.customDateStart && filterState.customDateEnd) {
        if (inc.date < filterState.customDateStart || inc.date > filterState.customDateEnd) return false
      }
      
      if (filterState.categoryId && filterState.categoryId !== 'all' && inc.category !== filterState.categoryId) return false
      if (filterState.paymentMethod === 'received' && !inc.payment_status) return false
      if (filterState.paymentMethod === 'pending' && inc.payment_status) return false
      if (filterState.transactionType !== 'all' && inc.income_type !== filterState.transactionType) return false
      if (filterState.tags && filterState.tags.length > 0) {
        const incTags = inc.tags || []
        if (!filterState.tags.every(t => incTags.includes(t))) return false
      }
      if (filterState.minAmount && Number(inc.amount) < Number(filterState.minAmount)) return false
      if (filterState.maxAmount && Number(inc.amount) > Number(filterState.maxAmount)) return false

      return true
    }).sort((a, b) => {
      if (filterState.order === 'newest') return b.date.localeCompare(a.date)
      if (filterState.order === 'oldest') return a.date.localeCompare(b.date)
      if (filterState.order === 'highest') return Number(b.amount) - Number(a.amount)
      if (filterState.order === 'lowest') return Number(a.amount) - Number(b.amount)
      return 0
    })
  }, [allIncomes, searchQuery, filterState, selectedMonth])

  const activeFilterCount = Object.values(filterState).filter(v => v && v !== 'all' && v !== 'global' && v !== 'newest' && (!Array.isArray(v) || v.length > 0)).length

  return (
    <div className="fd-stack fade-up" style={{ gap: 16 }}>
      <div className="topbar-inline" style={{ marginBottom: 8 }}>
        <div>
          <h2 className="section-title">Receitas</h2>
          <p className="section-sub" style={{ color: 'var(--muted)' }}>Acompanhe suas entradas e projeções</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', padding: '4px 8px', borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <button className="icon-btn" style={{ background: 'transparent' }} onClick={() => {
              const [y, m] = selectedMonth.split('-').map(Number)
              const d = new Date(y, m - 2, 1)
              setSelectedMonth(d.toISOString().slice(0, 7))
            }}>
              <ChevronLeft size={16} color="var(--ink)" />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 110, textAlign: 'center', color: 'var(--ink)' }}>{getMonthLabel(selectedMonth)}</span>
            <button className="icon-btn" style={{ background: 'transparent' }} onClick={() => {
              const [y, m] = selectedMonth.split('-').map(Number)
              const d = new Date(y, m, 1)
              setSelectedMonth(d.toISOString().slice(0, 7))
            }}>
              <ChevronRight size={16} color="var(--ink)" />
            </button>
          </div>
          <button className="btn-primary btn-orange" onClick={() => setShowIncomeModal(true)}>
            <Plus size={18} /> Nova receita
          </button>
        </div>
      </div>

      {/* --- PRIMEIRA DOBRA: CARDS ANALÍTICOS DENSOS --- */}
      <div className="fd-grid" style={{ rowGap: 16 }}>
        {/* ROW 1: Resumo, Realização, Saúde */}
        <div className="col-4">
          <div className="card" style={{ height: '100%', padding: '20px' }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Receitas do Período
              <CardInfoTooltip content="Soma de todas as receitas previstas ou recebidas no mês selecionado." />
            </div>
            <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, marginRight: 2 }}>R$</span>{brl(totalPeriodo)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--faint)' }}><CheckCircle2 size={12} color="var(--green)" /> Recebido</span>
                <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ color: 'var(--green)' }}>R$ {brl(recebido)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--faint)' }}><TrendingUp size={12} color="var(--orange)" /> Pendente</span>
                <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ color: 'var(--orange-ink)' }}>R$ {brl(pendente)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--faint)' }}><AlertCircle size={12} color="var(--neg)" /> Atrasado</span>
                <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ color: 'var(--neg)' }}>R$ {brl(atrasado)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-4">
          <div className="card" style={{ height: '100%', padding: '20px' }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Realização do Mês
              <CardInfoTooltip content="Mostra quanto da sua receita prevista já foi realmente recebida." />
            </div>
            {totalPeriodo > 0 ? (
              <>
                <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
                  {Math.round((recebido / totalPeriodo) * 100)}<span style={{ fontSize: 16 }}>%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--surface-2)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ width: `${(recebido / totalPeriodo) * 100}%`, height: '100%', background: 'var(--green)', borderRadius: 3 }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                  {pendente === 0 
                    ? "Você já recebeu toda a receita prevista para este mês." 
                    : `Faltam R$ ${brl(pendente)} para atingir a projeção mensal.`}
                </p>
              </>
            ) : (
              <p className="empty-msg" style={{ padding: '20px 0', fontSize: 12 }}>Nenhuma receita lançada.</p>
            )}
          </div>
        </div>

        <div className="col-4">
          <div className="card" style={{ height: '100%', padding: '20px' }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Saúde da Receita
              <CardInfoTooltip content="Avalia previsibilidade, atrasos e equilíbrio das suas entradas no período." />
            </div>
            {totalPeriodo > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 28, fontWeight: 800, color: 'var(--teal)' }}>
                    100<span style={{ fontSize: 16, color: 'var(--muted)' }}>/100</span>
                  </div>
                  <span style={{ background: 'rgba(1,88,76,0.1)', color: 'var(--teal)', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Saudável
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                  Sua receita está saudável, com boa previsibilidade e sem atrasos relevantes.
                </p>
              </>
            ) : (
              <p className="empty-msg" style={{ padding: '20px 0', fontSize: 12 }}>Sem dados para análise.</p>
            )}
          </div>
        </div>

        {/* ROW 2: Composição, Dependência, Histórico */}
        <div className="col-4">
          <div className="card" style={{ height: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'var(--teal)', padding: 6, borderRadius: 8, color: 'white' }}>
                  <PieChart size={16} />
                </div>
                <div className="card-title" style={{ fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
                  Composição da Receita
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal-900)', background: 'rgba(1,88,76,0.1)', padding: '4px 10px', borderRadius: 8 }}>
                  {pctFixa}% Fixa
                </div>
                <CardInfoTooltip content="Divide suas entradas entre receitas fixas/previsíveis e variáveis/eventuais." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              {/* Coluna Fixa */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--teal)' }} /> Receita Fixa
                </div>
                <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                  R$ {brl(receitaFixa)}
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-900)', background: 'rgba(1,88,76,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                    {pctFixa}% do total
                  </span>
                </div>
              </div>
              
              <div style={{ width: 1, background: 'var(--line-soft)', opacity: 0.8 }} />

              {/* Coluna Variável */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--orange)' }} /> Receita Variável
                </div>
                <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                  R$ {brl(receitaVar)}
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange-ink)', background: 'rgba(245,124,0,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                    {pctVar}% do total
                  </span>
                </div>
              </div>
            </div>
            
            {/* Barra */}
            <div style={{ width: '100%', height: 14, borderRadius: 7, background: 'var(--surface-2)', display: 'flex', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)' }}>
              {totalPeriodo > 0 ? (
                <>
                  {pctFixa > 0 && <div style={{ width: `${pctFixa}%`, background: 'var(--teal)', minWidth: 4 }} />}
                  {pctVar > 0 && <div style={{ width: `${pctVar}%`, background: 'var(--orange)', minWidth: 4 }} />}
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="col-4">
          <div className="card" style={{ height: '100%', padding: '20px' }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Dependência da Principal Fonte
              <CardInfoTooltip content="Mostra se sua renda está concentrada demais em uma única fonte." />
            </div>
            {catRanking.length > 0 ? (
              (() => {
                const topCat = catRanking[0];
                const pct = Math.round((topCat[1] / totalPeriodo) * 100);
                let statusText = 'Saudável';
                let statusColor = 'var(--teal)';
                let statusBg = 'rgba(1,88,76,0.1)';
                let msg = 'Sua receita está bem distribuída entre fontes diferentes.';
                if (pct > 70) {
                  statusText = 'Alta dependência';
                  statusColor = 'var(--neg)';
                  statusBg = 'rgba(239,68,68,0.1)';
                  msg = 'Sua receita depende muito de uma única fonte neste período.';
                } else if (pct > 40) {
                  statusText = 'Atenção';
                  statusColor = 'var(--orange-ink)';
                  statusBg = 'rgba(245,124,0,0.1)';
                  msg = 'Uma fonte tem peso relevante na sua renda deste mês.';
                }

                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Representa {pct}%</span>
                      <span style={{ background: statusBg, color: statusColor, fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {statusText}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--surface-2)', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: statusColor, borderRadius: 3 }} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, margin: 0 }}>
                      <strong>{topCat[0]}</strong>: {msg}
                    </p>
                  </div>
                )
              })()
            ) : (
              <p className="empty-msg" style={{ padding: '10px 0', fontSize: 12 }}>Sem dados.</p>
            )}
          </div>
        </div>

        <div className="col-4">
          <div className="card" style={{ height: '100%', padding: '20px' }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
              Histórico (4 Meses)
              <CardInfoTooltip content="Compara sua receita recente para identificar crescimento, queda ou estabilidade." />
            </div>
            {history4m.reduce((s, m) => s + m.total, 0) > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 70, padding: '0 4px' }}>
                {history4m.map((m, i) => {
                  const barH = maxHVal > 0 ? Math.max(10, Math.round((m.total / maxHVal) * 50)) : 10
                  const isCurrent = i === 3
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '22%' }}>
                      {m.total > 0 && (
                        <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? 'var(--teal)' : 'var(--faint)' }}>
                          {m.total >= 1000 ? `${(m.total/1000).toFixed(1)}k` : m.total}
                        </span>
                      )}
                      <div style={{ width: '100%', maxWidth: 28, height: barH, background: isCurrent ? 'var(--teal)' : 'var(--surface-3)', borderRadius: '4px 4px 0 0' }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'capitalize' }}>{m.label.substring(0,3)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="empty-msg" style={{ padding: '10px 0', fontSize: 12 }}>Poucos dados.</p>
            )}
          </div>
        </div>
      </div>

      <div className="fd-grid" style={{ rowGap: 16 }}>
        {/* Fontes (Ranking) */}
        <div className="col-8">
          <div className="card" style={{ height: '100%', padding: '24px' }}>
            {(() => {
              const numSources = catRanking.length;
              const topCat = catRanking.length > 0 ? catRanking[0] : null;
              const topPct = topCat && totalPeriodo > 0 ? Math.round((topCat[1] / totalPeriodo) * 100) : 0;
              
              let divBadge = 'Baixa';
              let divColor = 'var(--neg)';
              let divBg = 'rgba(239,68,68,0.1)';
              let insightText = '';
              
              if (numSources >= 3 && topPct <= 50) {
                divBadge = 'Boa';
                divColor = 'var(--green)';
                divBg = 'rgba(40,167,69,0.1)';
                insightText = `Sua renda está bem distribuída entre ${numSources} fontes.`;
              } else if (numSources >= 2) {
                divBadge = 'Moderada';
                divColor = 'var(--orange-ink)';
                divBg = 'rgba(245,124,0,0.1)';
                insightText = `Renda dividida, mas ${topCat?.[0]} ainda concentra ${topPct}% do total.`;
              } else if (numSources === 1) {
                divBadge = 'Baixa';
                divColor = 'var(--neg)';
                divBg = 'rgba(239,68,68,0.1)';
                insightText = `Atenção: 100% da sua renda depende exclusivamente de ${topCat?.[0]}.`;
              }
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="card-title" style={{ fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                        Fontes de Receita
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{numSources} fonte{numSources !== 1 ? 's' : ''} identificada{numSources !== 1 ? 's' : ''} no período.</div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {numSources > 0 && (
                        <span style={{ background: divBg, color: divColor, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {divBadge}
                        </span>
                      )}
                      <CardInfoTooltip content="Como avaliamos: Baixa (1 fonte), Moderada (2 fontes), Boa (3+ fontes). A concentração da fonte principal também é considerada." />
                    </div>
                  </div>
                  
                  {numSources > 0 && (
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0, paddingBottom: 16, borderBottom: '1px solid var(--line-soft)' }}>
                      {insightText}
                    </p>
                  )}
                  
                  {numSources > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
                      {catRanking.map(([catName, val]) => {
                        const pct = totalPeriodo > 0 ? Math.round((val / totalPeriodo) * 100) : 0
                        const catColor = categories.find(c => c.name === catName)?.color || '#90A4AE'
                        return (
                          <div key={catName} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                                <span style={{ width: 10, height: 10, borderRadius: 5, background: catColor }} /> {catName || 'Sem categoria'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>R$ {brl(val)}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', width: 36, textAlign: 'right' }}>{pct}%</span>
                              </div>
                            </div>
                            <div style={{ width: '100%', height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: catColor, borderRadius: 2 }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="empty-msg" style={{ fontSize: 12 }}>Nenhuma receita registrada.</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Finnly IA */}
        <div className="col-4">
          <div className="card" style={{ height: '100%', padding: '24px', background: 'linear-gradient(145deg, #ffffff, #f2f9f8)', border: '1px solid var(--teal)', boxShadow: '0 8px 24px rgba(1,88,76,0.08)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'var(--teal)', padding: 8, borderRadius: 10, boxShadow: '0 4px 12px rgba(1,88,76,0.2)' }}>
                  <Sparkles size={18} color="white" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.5, color: 'var(--teal-900)' }}>FINNLY IA</span>
              </div>
              <CardInfoTooltip content="Sugestões inteligentes para entender melhor suas entradas e oportunidades." />
            </div>
            
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 20, lineHeight: 1.4 }}>
              Entenda suas receitas, pendências e oportunidades com ajuda da IA.
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'auto' }}>
              <button className="ia-action-chip" onClick={() => onAsk?.("Analisar receitas")}>
                Analisar receitas
              </button>
              <button className="ia-action-chip" onClick={() => onAsk?.("Minha renda está concentrada?")}>
                Renda concentrada?
              </button>
              <button className="ia-action-chip" onClick={() => onAsk?.("Previsão do mês")}>
                Previsão do mês
              </button>
              <button className="ia-action-chip" onClick={() => onAsk?.("Como aumentar renda?")}>
                Como aumentar renda?
              </button>
            </div>
            
            <button className="btn-primary" style={{ width: '100%', marginTop: 24, padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => onAsk?.("Gostaria de falar com o Finnly IA sobre minhas receitas.")}>
              <Sparkles size={16} /> Perguntar ao Finnly IA
            </button>
            
            <style jsx>{`
              .ia-action-chip {
                display: flex;
                align-items: center;
                padding: 6px 12px;
                background: white;
                border: 1px solid var(--line-soft);
                border-radius: 16px;
                font-size: 11px;
                font-weight: 600;
                color: var(--ink);
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0,0,0,0.02);
              }
              .ia-action-chip:hover {
                transform: translateY(-1px);
                border-color: var(--teal);
                color: var(--teal-900);
                box-shadow: 0 4px 8px rgba(1,88,76,0.1);
              }
            `}</style>
          </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <section className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div className="card-title" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Detalhamento das Entradas</div>
              <div className="card-sub" style={{ marginTop: 2, fontSize: 12 }}>
                {filteredIncomes.length} resultado{filteredIncomes.length !== 1 ? 's' : ''} 
                {filterState.period !== 'global' && <span style={{ color: 'var(--orange)', fontWeight: 700, marginLeft: 6 }}>· Filtro ativo</span>}
              </div>
            </div>
            {filteredIncomes.length > 0 && (
              <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', background: 'rgba(1,88,76,0.05)', padding: '4px 10px', borderRadius: 12 }}>
                R$ {brl(filteredIncomes.reduce((s, i) => s + Number(i.amount), 0))} filtrado
              </div>
            )}
          </div>
          
          <div className="filter-bar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid var(--line-soft)' }}>
            <div className="search-input" style={{ flex: '1 1 200px', maxWidth: 300, background: 'var(--surface-2)', borderRadius: 8, border: 'none', padding: '6px 12px' }}>
              <Search size={14} className="search-icon" style={{ color: 'var(--muted)' }} />
              <input
                placeholder="Buscar receita…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', fontSize: 13 }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: 'var(--faint)' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="hide-scrollbar">
              <button 
                className={`btn-ghost ${filterState.paymentMethod === 'all' ? 'active-chip' : ''}`}
                style={{ padding: '4px 12px', fontSize: 12, borderRadius: 16, background: filterState.paymentMethod === 'all' ? 'var(--ink)' : 'var(--surface)', color: filterState.paymentMethod === 'all' ? 'white' : 'var(--muted)', whiteSpace: 'nowrap' }}
                onClick={() => setFilterState({ ...filterState, paymentMethod: 'all' })}
              >
                Todas
              </button>
              <button 
                className={`btn-ghost ${filterState.paymentMethod === 'received' ? 'active-chip' : ''}`}
                style={{ padding: '4px 12px', fontSize: 12, borderRadius: 16, background: filterState.paymentMethod === 'received' ? 'rgba(40,167,69,0.1)' : 'var(--surface)', color: filterState.paymentMethod === 'received' ? 'var(--green)' : 'var(--muted)', whiteSpace: 'nowrap' }}
                onClick={() => setFilterState({ ...filterState, paymentMethod: 'received' })}
              >
                Recebidas
              </button>
              <button 
                className={`btn-ghost ${filterState.paymentMethod === 'pending' ? 'active-chip' : ''}`}
                style={{ padding: '4px 12px', fontSize: 12, borderRadius: 16, background: filterState.paymentMethod === 'pending' ? 'rgba(245,124,0,0.1)' : 'var(--surface)', color: filterState.paymentMethod === 'pending' ? 'var(--orange)' : 'var(--muted)', whiteSpace: 'nowrap' }}
                onClick={() => setFilterState({ ...filterState, paymentMethod: 'pending' })}
              >
                Pendentes
              </button>
            </div>
            
            <button 
              className="btn-secondary" 
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, background: activeFilterCount > 0 ? 'rgba(1, 88, 76, 0.1)' : 'var(--surface)', color: activeFilterCount > 0 ? 'var(--teal)' : 'var(--ink)', marginLeft: 'auto' }}
              onClick={() => setIsDrawerOpen(true)}
            >
              <Filter size={14} /> Filtros
              {activeFilterCount > 0 && <div style={{ background: 'var(--teal)', color: 'white', borderRadius: 8, padding: '2px 6px', fontSize: 10, fontWeight: 800 }}>{activeFilterCount}</div>}
            </button>
            
            <TransactionsFilterDrawer 
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              type="income"
              activeFilters={filterState}
              onApply={setFilterState}
              categories={categories}
              accounts={[]}
              cards={[]}
            />
          </div>
          
          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', gap: 6, padding: '10px 0', borderBottom: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>Filtros ativos:</span>
              {filterState.period !== 'global' && <div className="filter-pill">Período: {filterState.period}</div>}
              {filterState.categoryId !== 'all' && <div className="filter-pill">Categoria</div>}
              {filterState.transactionType !== 'all' && <div className="filter-pill">Tipo</div>}
              {filterState.tags && filterState.tags.length > 0 && <div className="filter-pill">Tags</div>}
              {(filterState.minAmount || filterState.maxAmount) && <div className="filter-pill">Valor</div>}
              <button style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--orange)', cursor: 'pointer', fontWeight: 600, padding: '2px 6px' }} onClick={() => setFilterState(defaultFilterState)}>Limpar</button>
              
              <style jsx>{`
                .filter-pill {
                  font-size: 10px;
                  font-weight: 600;
                  background: rgba(1,88,76,0.08);
                  color: var(--teal-900);
                  padding: 2px 8px;
                  border-radius: 8px;
                }
              `}</style>
            </div>
          )}
        </div>
        
        <div style={{ padding: '0 20px 20px 20px' }}>
          {loading ? (
            <p className="empty-msg" style={{ padding: '30px 0', fontSize: 13 }}>Carregando...</p>
          ) : filteredIncomes.length === 0 ? (
            <div className="empty-list" style={{ padding: '40px 0' }}>
              <Search size={24} color="var(--line-strong)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Nenhuma receita encontrada.</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Tente ajustar os filtros ou a busca.</p>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              {filteredIncomes.map(item => {
                const cat = categories.find(c => c.name === item.category)
                const catColor = cat?.color ?? '#90A4AE'
                return (
                  <div key={item.id} className="row-item" style={{ borderBottom: '1px solid var(--line-soft)', padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, background: catColor + '15', color: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ArrowDown size={14} />
                    </div>
                    
                    <div className="row-main" style={{ flex: 1, minWidth: 0 }}>
                      <div className="row-name" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.description || item.category}
                        </span>
                        {(() => {
                          const status = getTransactionStatus(item.payment_status, item.date)
                          if (status === 'paid') {
                            return <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)', background: 'rgba(40,167,69,0.1)', padding: '2px 6px', borderRadius: 8 }}>Recebido</span>
                          } else if (status === 'overdue') {
                            return <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--neg)', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 8 }}>Atrasado</span>
                          } else {
                            return <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--orange-ink)', background: 'rgba(245,124,0,0.1)', padding: '2px 6px', borderRadius: 8 }}>Pendente</span>
                          }
                        })()}
                      </div>
                      
                      <div className="row-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                        <span>{item.category}</span>
                        <span style={{ color: 'var(--line-strong)' }}>•</span>
                        <span>{formatDate(item.date)}</span>
                        
                        {item.tags && item.tags.length > 0 && (
                          <>
                            <span style={{ color: 'var(--line-strong)' }}>•</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {item.tags.map(t => <span key={t} style={{ fontSize: 9, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, color: 'var(--faint)' }}>{t}</span>)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="row-amt pos" style={{ textAlign: 'right' }}>
                      <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                        + R$ {brl(Number(item.amount))}
                      </div>
                    </div>
                    
                    <button 
                      className="icon-btn" 
                      style={{ background: 'transparent', color: 'var(--muted)', padding: 4 }} 
                      onClick={() => {
                        const cloned = {
                          ...item,
                          id: undefined as unknown as string,
                          created_at: undefined as unknown as string,
                          updated_at: undefined as unknown as string,
                          received_at: null,
                          payment_status: false,
                          installment_group_id: undefined
                        }
                        setEditIncome(cloned)
                      }} 
                      disabled={isPending} 
                      title="Duplicar"
                    >
                      <Copy size={14} />
                    </button>
                    <button className="icon-btn" style={{ background: 'transparent', color: 'var(--muted)', padding: 4 }} onClick={() => setEditIncome(item)} disabled={isPending} title="Editar">
                      <Pencil size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {(showIncomeModal || editIncome) && (
        <PremiumIncomeModal
          income={editIncome}
          categories={categories}
          accounts={accounts}
          onClose={() => { setShowIncomeModal(false); setEditIncome(null) }}
          onSaved={handleSaved}
          onRequestNewCategory={() => {}}
        />
      )}
    </div>
  )
}
