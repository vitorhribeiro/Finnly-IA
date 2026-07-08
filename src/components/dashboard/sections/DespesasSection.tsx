'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import {
  Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight,
  ArrowUp, Search, Filter, AlertTriangle, ShieldCheck, Tag, CheckCircle2, Sparkles, TrendingDown,
  PieChart, Copy
} from 'lucide-react'
import { CardInfoTooltip } from '@/components/ui/CardInfoTooltip'
import { getTransactionStatus } from '@/lib/utils'
import { addExpense, deleteExpense, getAllExpenses } from '@/app/dashboard/actions/expenses'
import { getAccounts } from '@/app/dashboard/actions/accounts'
import { getCreditCards } from '@/app/dashboard/actions/credit-cards'
import { getExpenseCategories } from '@/app/dashboard/actions/expense-categories'
import { CATEGORY_COLORS } from '@/types/database'
import type { Expense, Account, CreditCard, ExpenseCategory } from '@/types/database'
import { PremiumExpenseModal } from './PremiumExpenseModal'
import TransactionsFilterDrawer, { FilterState, defaultFilterState } from '@/components/dashboard/filters/TransactionsFilterDrawer'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string) {
  if (!d) return ''
  const cleanStr = d.slice(0, 10)
  const [y, m, day] = cleanStr.split('-').map(Number)
  const dateObj = new Date(y, m - 1, day)
  const dd = String(dateObj.getDate()).padStart(2, '0')
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
  const yyyy = dateObj.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function getMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const mName = d.toLocaleDateString('pt-BR', { month: 'long' })
  return `${mName.charAt(0).toUpperCase() + mName.slice(1)} de ${y}`
}

export function DespesasSection({ hidden, onAsk }: { hidden: boolean; onAsk?: (seed?: string) => void }) {
  const [items, setItems] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Global Month
  const currentMonthYM = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYM)

  // Drawer & Filters
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusTab, setStatusTab] = useState<'all' | 'received' | 'pending'>('all')

  // Modals
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)

  const [isPending, startTransition] = useTransition()

  async function load() {
    setLoading(true)
    const [data, acc, cards, cats] = await Promise.all([
      getAllExpenses(),
      getAccounts(),
      getCreditCards(),
      getExpenseCategories()
    ])
    setItems(data as Expense[])
    setAccounts(acc)
    setCreditCards(cards)
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExpense(id)
      await load()
    })
  }

  function handleSaved() {
    setShowForm(false)
    setEditExpense(null)
    load()
  }

  // --- KPIs and Metrics (Global selectedMonth) ---
  const currentItems = useMemo(() => items.filter(i => i.date.slice(0, 7) === selectedMonth), [items, selectedMonth])
  const totalPeriodo = currentItems.reduce((s, i) => s + Number(i.amount), 0)
  const pagos = currentItems.filter(i => getTransactionStatus(i.payment_status, i.date) === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const pendentes = currentItems.filter(i => getTransactionStatus(i.payment_status, i.date) !== 'paid').reduce((s, i) => s + Number(i.amount), 0)

  // Controle de Gastos (Score simplificado: 100 se gastou menos que o mês anterior)
  const prevYM = (() => {
    const d = new Date(selectedMonth + '-01')
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  })()
  const prevItems = useMemo(() => items.filter(i => i.date.slice(0, 7) === prevYM), [items, prevYM])
  const prevTotal = prevItems.reduce((s, i) => s + Number(i.amount), 0)
  
  let score = 50
  if (prevTotal > 0 && totalPeriodo > 0) {
    if (totalPeriodo < prevTotal) score = Math.min(100, 50 + ((prevTotal - totalPeriodo) / prevTotal) * 100)
    else score = Math.max(0, 50 - ((totalPeriodo - prevTotal) / prevTotal) * 100)
  }

  // Risco de Estouro (Projeção baseada nos dias do mês)
  const dToday = new Date()
  const isCurrentMonth = selectedMonth === currentMonthYM
  const currentDay = isCurrentMonth ? Math.max(1, dToday.getDate()) : 30
  const totalDays = 30
  const projection = isCurrentMonth && currentDay > 0 ? (totalPeriodo / currentDay) * totalDays : totalPeriodo
  const riskPct = prevTotal > 0 ? Math.min(100, Math.round((projection / (prevTotal * 1.1)) * 100)) : 0

  // Categorias que mais pesaram
  const catMap: Record<string, number> = {}
  currentItems.forEach(i => catMap[i.category] = (catMap[i.category] ?? 0) + Number(i.amount))
  const catRanking = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Histórico 4 Meses
  const history4m = useMemo(() => {
    const res = []
    const [y, m] = selectedMonth.split('-').map(Number)
    for (let i = 3; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1)
      const ym = d.toISOString().slice(0, 7)
      const t = items.filter(inc => inc.date.slice(0, 7) === ym).reduce((s, inc) => s + Number(inc.amount), 0)
      res.push({ ym, label: getMonthLabel(ym).split(' ')[0], total: t })
    }
    return res
  }, [items, selectedMonth])
  const maxHVal = Math.max(...history4m.map(m => m.total), 1)

  // --- Table Filters (Drawer) ---
  const filteredItems = useMemo(() => {
    return items.filter(inc => {
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
        const todayStr = new Date().toISOString().slice(0, 10)
        const d = new Date()
        d.setDate(d.getDate() - 7)
        const dStr = d.toISOString().slice(0, 10)
        if (inc.date < dStr || inc.date > todayStr) return false
      } else if (filterState.period === 'last_30') {
        const todayStr = new Date().toISOString().slice(0, 10)
        const d = new Date()
        d.setDate(d.getDate() - 30)
        const dStr = d.toISOString().slice(0, 10)
        if (inc.date < dStr || inc.date > todayStr) return false
      } else if (filterState.period === 'custom' && filterState.customDateStart && filterState.customDateEnd) {
        if (inc.date < filterState.customDateStart || inc.date > filterState.customDateEnd) return false
      }
      
      // 1. Category Filter (match UUID in filterState.categoryId to categories name)
      if (filterState.categoryId && filterState.categoryId !== 'all') {
        const cat = categories.find(c => c.id === filterState.categoryId)
        if (cat && inc.category !== cat.name) return false
      }
      
      // 2. Account Filter
      if (filterState.accountId && filterState.accountId !== 'all') {
         if (inc.account_id !== filterState.accountId && inc.paid_account_id !== filterState.accountId) return false
      }

      // 3. Card Filter
      if (filterState.creditCardId && filterState.creditCardId !== 'all') {
         if (inc.credit_card_id !== filterState.creditCardId) return false
      }
      
      // 4. Status Tab Filter (from Quick Toolbar Tabs)
      const status = getTransactionStatus(inc.payment_status, inc.date)
      if (statusTab === 'received' && status !== 'paid') return false // received for expenses means paid
      if (statusTab === 'pending' && status === 'paid') return false

      // 5. Payment Method Filter (from Drawer)
      if (filterState.paymentMethod && filterState.paymentMethod !== 'all') {
        if (inc.payment_method !== filterState.paymentMethod) return false
      }

      // 6. Type Filter
      if (filterState.transactionType !== 'all' && inc.expense_type !== filterState.transactionType) return false
      
      // 7. Tags Filter
      if (filterState.tags && filterState.tags.length > 0) {
        const incTags = inc.tags || []
        if (!filterState.tags.every(t => incTags.includes(t))) return false
      }

      // 8. Amount Filters (parse Brazilian format)
      if (filterState.minAmount) {
        const cleanMin = parseFloat(filterState.minAmount.replace(/\./g, '').replace(',', '.'))
        if (!isNaN(cleanMin) && Number(inc.amount) < cleanMin) return false
      }
      if (filterState.maxAmount) {
        const cleanMax = parseFloat(filterState.maxAmount.replace(/\./g, '').replace(',', '.'))
        if (!isNaN(cleanMax) && Number(inc.amount) > cleanMax) return false
      }

      return true
    }).sort((a, b) => {
      if (filterState.order === 'newest') return b.date.localeCompare(a.date)
      if (filterState.order === 'oldest') return a.date.localeCompare(b.date)
      if (filterState.order === 'highest') return Number(b.amount) - Number(a.amount)
      if (filterState.order === 'lowest') return Number(a.amount) - Number(b.amount)
      return 0
    })
  }, [items, searchQuery, filterState, selectedMonth, statusTab, categories])

  const activeFilterCount = Object.values(filterState).filter(v => v && v !== 'all' && v !== 'global' && v !== 'newest' && (!Array.isArray(v) || v.length > 0)).length

  return (
    <div className="fd-stack fade-up">
      <div className="topbar-inline" style={{ justifyContent: 'flex-end' }}>
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
          <button className="btn-primary btn-orange" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Nova despesa
          </button>
        </div>
      </div>

      {/* --- KPIs --- */}
      <div className="fd-grid">
        <div className="col-4">
          <div className="kpi kpi-wide" style={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-orange" style={{ background: 'rgba(245,124,0,0.1)' }}><ArrowUp size={20} /></div>
              <div className="kpi-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                Despesas do período
                <CardInfoTooltip content="Soma das despesas pagas, pendentes e atrasadas no mês selecionado." />
              </div>
            </div>
            <div className="kpi-val">
              <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 26, fontWeight: 800 }}>
                <span className="cur" style={{ fontSize: 16 }}>R$</span>{brl(totalPeriodo)}
              </span>
            </div>
            <div className="kpi-foot">
              <span className="mut" style={{ fontSize: 12 }}>{currentItems.length} despesa{currentItems.length !== 1 ? 's' : ''} registrada{currentItems.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="kpi kpi-wide" style={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-green" style={{ background: 'rgba(40,167,69,0.1)' }}><CheckCircle2 size={20} /></div>
              <div className="kpi-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                Pagas
                <CardInfoTooltip content="Total de despesas que já foram quitadas neste período." />
              </div>
            </div>
            <div className="kpi-val">
              <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 26, fontWeight: 800, color: 'var(--green)' }}>
                <span className="cur" style={{ fontSize: 16 }}>R$</span>{brl(pagos)}
              </span>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="kpi kpi-wide" style={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div className="kpi-top">
              <div className="kpi-ic" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}><AlertTriangle size={20} /></div>
              <div className="kpi-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                Pendentes/Atrasadas
                <CardInfoTooltip content="Total que ainda precisa ser pago, incluindo contas pendentes e atrasadas." />
              </div>
            </div>
            <div className="kpi-val" style={{ color: pendentes > 0 ? '#EF4444' : 'inherit' }}>
              <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 26, fontWeight: 800 }}>
                <span className="cur" style={{ fontSize: 16 }}>R$</span>{brl(pendentes)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- CARDS --- */}
      <div className="fd-grid">
        {/* Score de Controle */}
        <div className="col-4">
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card-title" style={{ marginBottom: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={16} color="var(--gold)" /> Controle de Gastos</div>
              <CardInfoTooltip content="Nota de 0 a 100 que indica se suas despesas estão sob controle." />
            </div>
            {totalPeriodo > 0 && prevTotal > 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 16px' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--surface-2)" strokeWidth="4" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--gold)' : 'var(--neg)'} strokeWidth="4" strokeDasharray={`${score}, 100`} style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: 'var(--ink)' }}>
                    {Math.round(score)}
                  </div>
                </div>
                <h4 style={{ margin: 0, color: 'var(--ink)', fontSize: 16, fontWeight: 700 }}>{score >= 70 ? 'Muito Bom!' : score >= 40 ? 'Atenção' : 'Cuidado!'}</h4>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>Score comparativo de saúde.</p>
              </div>
            ) : (
              <p className="empty-msg" style={{ padding: '40px 0' }}>Sem dados do mês anterior.</p>
            )}
          </div>
        </div>

        {/* Risco de Estouro */}
        <div className="col-4">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={16} color="var(--orange)" /> Risco de Estouro</div>
              <CardInfoTooltip content="Estima se seus gastos podem ficar acima do seu padrão recente." />
            </div>
            {totalPeriodo > 0 && prevTotal > 0 ? (
              <div style={{ padding: '24px 0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Projeção no mês</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: riskPct >= 100 ? 'var(--neg)' : 'var(--muted)' }}>{riskPct}%</span>
                </div>
                <div style={{ width: '100%', height: 16, borderRadius: 8, background: 'var(--surface-2)', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ width: `${Math.min(100, riskPct)}%`, height: '100%', background: riskPct >= 100 ? 'var(--neg)' : riskPct >= 80 ? 'var(--orange)' : 'var(--green)', transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 20, background: 'var(--surface-2)', padding: '12px', borderRadius: 8 }}>
                  No ritmo atual, você gastará <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontWeight: 700, color: 'var(--ink)' }}>R$ {brl(projection)}</span> (vs R$ {brl(prevTotal)} anterior).
                </div>
              </div>
            ) : (
              <p className="empty-msg" style={{ padding: '40px 0' }}>Sem base para projeção.</p>
            )}
          </div>
        </div>

        {/* Histórico 4 meses */}
        <div className="col-4">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingDown size={16} color="var(--orange)" /> Histórico (4 meses)</div>
              <CardInfoTooltip content="Compara suas despesas recentes para identificar aumento, queda ou estabilidade." />
            </div>
            {history4m.reduce((s, m) => s + m.total, 0) > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 120, padding: '0 4px', borderBottom: '1px solid var(--line-soft)', paddingBottom: 8 }}>
                {history4m.map((m, i) => {
                  const barH = maxHVal > 0 ? Math.max(8, Math.round((m.total / maxHVal) * 80)) : 8
                  const isCurrent = i === 3
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '22%' }}>
                      {m.total > 0 && (
                        <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? 'var(--orange-ink)' : 'var(--muted)', background: isCurrent ? 'rgba(245,124,0,0.05)' : 'transparent', padding: '2px 4px', borderRadius: 4 }}>
                          {m.total >= 1000 ? `${(m.total/1000).toFixed(1)}k` : brl(m.total)}
                        </span>
                      )}
                      <div style={{ width: '100%', maxWidth: 36, height: barH, background: isCurrent ? 'var(--orange)' : 'var(--surface-3)', borderRadius: '6px 6px 0 0', transition: 'height 0.5s' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: isCurrent ? 'var(--ink)' : 'var(--faint)', textTransform: 'capitalize' }}>{m.label}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="empty-msg" style={{ padding: '40px 0' }}>Poucos dados para histórico.</p>
            )}
          </div>
        </div>
      </div>

      <div className="fd-grid">
        {/* Categorias que mais pesaram */}
        <div className="col-8">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Categorias que mais pesaram
              <CardInfoTooltip content="Ranking das categorias com maior impacto nas despesas do mês." />
            </div>
            {catRanking.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {catRanking.map(([catName, val]) => {
                  const pct = totalPeriodo > 0 ? Math.round((val / totalPeriodo) * 100) : 0
                  const catColor = categories.find(c => c.name === catName)?.color || '#EF4444'
                  return (
                    <div key={catName} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 5, background: catColor }} /> {catName || 'Sem categoria'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>R$ {brl(val)}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', width: 36, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: catColor, borderRadius: 3, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="empty-msg">Nenhuma despesa registrada.</p>
            )}
          </div>
        </div>

        {/* Finnly IA */}
        <div className="col-4">
          <div className="card" style={{ height: '100%', background: 'linear-gradient(145deg, #fdfbf7, #fdf6f5)', border: '1px solid rgba(245,124,0,0.1)' }}>
            <div className="card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#991B1B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: '#EF4444', padding: 6, borderRadius: 8 }}><Sparkles size={16} color="white" /></div>
                Finnly IA
              </div>
              <CardInfoTooltip content="Sugestões inteligentes para entender seus gastos e encontrar economia." />
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.4 }}>Entenda seus gastos e encontre oportunidades de economia.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="ia-action-btn" onClick={() => onAsk?.("Onde posso economizar este mês?")}>
                <TrendingDown size={16} color="var(--green)" /> Onde posso economizar?
              </button>
              <button className="ia-action-btn" onClick={() => onAsk?.("Gostaria de analisar meus gastos recentes.")}>
                <Search size={16} color="var(--orange)" /> Analisar gastos
              </button>
              <button className="ia-action-btn" onClick={() => onAsk?.("Como está minha proporção de gastos fixos vs variáveis?")}>
                <PieChart size={16} color="var(--gold)" /> Gastos fixos vs variáveis
              </button>
              <button className="ia-action-btn" onClick={() => onAsk?.("Qual o meu risco financeiro para este mês?")}>
                <AlertTriangle size={16} color="var(--neg)" /> Risco do mês
              </button>
            </div>
            
            <style jsx>{`
              .ia-action-btn {
                display: flex;
                align-items: center;
                gap: 12px;
                width: 100%;
                padding: 12px 16px;
                background: white;
                border: 1px solid var(--line-soft);
                border-radius: 12px;
                font-size: 13px;
                font-weight: 600;
                color: var(--ink);
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0,0,0,0.02);
              }
              .ia-action-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border-color: var(--orange);
                color: #991B1B;
              }
            `}</style>
          </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <section className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px 24px 0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div className="card-title">Detalhamento das Saídas</div>
              <div className="card-sub" style={{ marginTop: 4 }}>
                {filteredItems.length} resultado{filteredItems.length !== 1 ? 's' : ''} 
                {filterState.period !== 'global' && <span style={{ color: 'var(--orange)', fontWeight: 700, marginLeft: 6 }}>· Filtro ativo</span>}
              </div>
            </div>
            {filteredItems.length > 0 && (
              <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange-ink)', background: 'rgba(245,124,0,0.05)', padding: '6px 12px', borderRadius: 16 }}>
                R$ {brl(filteredItems.reduce((s, i) => s + Number(i.amount), 0))} filtrado
              </div>
            )}
          </div>

          <div className="filter-bar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 20, borderBottom: '1px solid var(--line-soft)' }}>
            <div className="search-input" style={{ flex: '1 1 200px', maxWidth: 300, background: 'var(--surface-2)', borderRadius: 12, border: 'none' }}>
              <Search size={14} className="search-icon" style={{ color: 'var(--muted)' }} />
              <input
                placeholder="Buscar despesa…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: 'var(--faint)' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="hide-scrollbar">
              <button 
                className={`btn-ghost ${statusTab === 'all' ? 'active-chip' : ''}`}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 20, background: statusTab === 'all' ? 'var(--ink)' : 'var(--surface)', color: statusTab === 'all' ? 'white' : 'var(--muted)', whiteSpace: 'nowrap', cursor: 'pointer' }}
                onClick={() => setStatusTab('all')}
              >
                Todas
              </button>
              <button 
                className={`btn-ghost ${statusTab === 'received' ? 'active-chip' : ''}`}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 20, background: statusTab === 'received' ? 'rgba(40,167,69,0.1)' : 'var(--surface)', color: statusTab === 'received' ? 'var(--green)' : 'var(--muted)', whiteSpace: 'nowrap', cursor: 'pointer' }}
                onClick={() => setStatusTab('received')}
              >
                Pagas
              </button>
              <button 
                className={`btn-ghost ${statusTab === 'pending' ? 'active-chip' : ''}`}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 20, background: statusTab === 'pending' ? 'rgba(239,68,68,0.1)' : 'var(--surface)', color: statusTab === 'pending' ? '#EF4444' : 'var(--muted)', whiteSpace: 'nowrap', cursor: 'pointer' }}
                onClick={() => setStatusTab('pending')}
              >
                Pendentes
              </button>
            </div>
            
            <button 
              className="btn-secondary" 
              style={{ padding: '8px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, background: activeFilterCount > 0 ? 'rgba(245, 124, 0, 0.1)' : 'var(--surface)', color: activeFilterCount > 0 ? 'var(--orange-ink)' : 'var(--ink)', marginLeft: 'auto' }}
              onClick={() => setIsDrawerOpen(true)}
            >
              <Filter size={15} /> Filtros
              {activeFilterCount > 0 && <div style={{ background: 'var(--orange)', color: 'white', borderRadius: 10, padding: '2px 6px', fontSize: 10, fontWeight: 800 }}>{activeFilterCount}</div>}
            </button>
            
            <TransactionsFilterDrawer 
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              type="expense"
              activeFilters={filterState}
              onApply={setFilterState}
              categories={categories}
              accounts={accounts}
              cards={creditCards}
            />
          </div>
          
          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 0', borderBottom: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>Filtros ativos:</span>
              {filterState.period !== 'global' && (
                <div className="filter-pill">
                  Período: {
                    filterState.period === 'this_month' ? 'Este mês' :
                    filterState.period === 'last_month' ? 'Mês passado' :
                    filterState.period === 'last_7' ? 'Últimos 7 dias' :
                    filterState.period === 'last_30' ? 'Últimos 30 dias' :
                    filterState.period === 'custom' ? 'Personalizado' :
                    filterState.period
                  }
                </div>
              )}
              {filterState.categoryId !== 'all' && (
                <div className="filter-pill">
                  Categoria: {categories.find(c => c.id === filterState.categoryId)?.name || filterState.categoryId}
                </div>
              )}
              {filterState.accountId !== 'all' && (
                <div className="filter-pill">
                  Conta: {accounts.find(a => a.id === filterState.accountId)?.name || filterState.accountId}
                </div>
              )}
              {filterState.creditCardId !== 'all' && (
                <div className="filter-pill">
                  Cartão: {creditCards.find(c => c.id === filterState.creditCardId)?.name || filterState.creditCardId}
                </div>
              )}
              {filterState.transactionType !== 'all' && (
                <div className="filter-pill">
                  Tipo: {filterState.transactionType === 'fixed' ? 'Fixa' : 'Variável'}
                </div>
              )}
              {filterState.tags && filterState.tags.length > 0 && (
                <div className="filter-pill">
                  Tags: {filterState.tags.join(', ')}
                </div>
              )}
              {(filterState.minAmount || filterState.maxAmount) && (
                <div className="filter-pill">
                  Valor: {filterState.minAmount ? `>= R$ ${filterState.minAmount}` : ''} {filterState.maxAmount ? `<= R$ ${filterState.maxAmount}` : ''}
                </div>
              )}
              <button style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--orange)', cursor: 'pointer', fontWeight: 600, padding: '2px 8px' }} onClick={() => setFilterState(defaultFilterState)}>Limpar</button>
              
              <style jsx>{`
                .filter-pill {
                  font-size: 11px;
                  font-weight: 600;
                  background: rgba(245,124,0,0.08);
                  color: var(--orange-ink);
                  padding: 4px 10px;
                  border-radius: 12px;
                }
              `}</style>
            </div>
          )}
        </div>
        
        <div style={{ padding: '0 24px 24px 24px' }}>
          {loading ? (
            <p className="empty-msg" style={{ padding: '40px 0' }}>Carregando...</p>
          ) : filteredItems.length === 0 ? (
            <div className="empty-list" style={{ padding: '60px 0' }}>
              <Search size={32} color="var(--line-strong)" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Nenhuma despesa encontrada.</p>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Tente ajustar os filtros ou a busca.</p>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              {filteredItems.map(item => {
                const catColor = categories.find(c => c.name === item.category)?.color ?? '#90A4AE'
                return (
                  <div key={item.id} className="row-item" style={{ borderBottom: '1px solid var(--line-soft)', padding: '16px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 20, background: catColor + '15', color: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ArrowUp size={18} />
                    </div>
                    
                    <div className="row-main" style={{ flex: 1, minWidth: 0 }}>
                      <div className="row-name" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.description || item.category}
                        </span>
                        {(() => {
                          const status = getTransactionStatus(item.payment_status, item.date)
                          if (status === 'paid') {
                            return <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'rgba(40,167,69,0.1)', padding: '2px 8px', borderRadius: 12 }}>Pago</span>
                          } else if (status === 'overdue') {
                            return <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--neg)', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 12 }}>Atrasado</span>
                          } else {
                            return <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 12 }}>Pendente</span>
                          }
                        })()}
                      </div>
                      
                      <div className="row-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                        <span>{item.category}</span>
                        <span style={{ color: 'var(--line-strong)' }}>•</span>
                        <span>{formatDate(item.date)}</span>
                        
                        {item.tags && item.tags.length > 0 && (
                          <>
                            <span style={{ color: 'var(--line-strong)' }}>•</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {item.tags.map(t => <span key={t} style={{ fontSize: 10, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 6, color: 'var(--faint)' }}>{t}</span>)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="row-amt neg-amt" style={{ textAlign: 'right' }}>
                      <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                        – R$ {brl(Number(item.amount))}
                      </div>
                    </div>
                    
                    <button 
                      className="icon-btn" 
                      style={{ background: 'var(--surface)', color: 'var(--muted)', marginRight: 4 }} 
                      onClick={() => {
                        const cloned = {
                          ...item,
                          id: undefined as unknown as string,
                          created_at: undefined as unknown as string,
                          updated_at: undefined as unknown as string,
                          paid_at: null,
                          payment_status: false,
                          paid_account_id: null,
                          payment_method: null,
                          installment_group_id: undefined
                        }
                        setEditExpense(cloned)
                      }} 
                      disabled={isPending} 
                      title="Duplicar"
                    >
                      <Copy size={14} />
                    </button>
                    <button className="icon-btn" style={{ background: 'var(--surface)', color: 'var(--muted)' }} onClick={() => setEditExpense(item)} disabled={isPending} title="Editar">
                      <Pencil size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {(showForm || editExpense) && (
        <PremiumExpenseModal 
          expense={editExpense}
          categories={categories}
          accounts={accounts}
          creditCards={creditCards}
          onClose={() => { setShowForm(false); setEditExpense(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
