
'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import {
  Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight,
  ArrowUp, Search, Filter, AlertTriangle, ShieldCheck, Tag, CheckCircle2, Sparkles, TrendingDown,
  PieChart
} from 'lucide-react'
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
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
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
  const pagos = currentItems.filter(i => i.payment_status).reduce((s, i) => s + Number(i.amount), 0)
  const pendentes = currentItems.filter(i => !i.payment_status).reduce((s, i) => s + Number(i.amount), 0)

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
      
      if (filterState.accountId && filterState.accountId !== 'all') {
         if (inc.account_id !== filterState.accountId && inc.paid_account_id !== filterState.accountId) return false
      }
      if (filterState.creditCardId && filterState.creditCardId !== 'all') {
         if (inc.credit_card_id !== filterState.creditCardId) return false
      }
      
      if (filterState.paymentMethod === 'received' && !inc.payment_status) return false // received for expenses means paid
      if (filterState.paymentMethod === 'pending' && inc.payment_status) return false
      if (filterState.transactionType !== 'all' && inc.expense_type !== filterState.transactionType) return false
      
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
  }, [items, searchQuery, filterState, selectedMonth])

  const activeFilterCount = Object.values(filterState).filter(v => v && v !== 'all' && v !== 'global' && v !== 'newest' && (!Array.isArray(v) || v.length > 0)).length

  return (
    <div className="fd-stack fade-up">
      <div className="topbar-inline">
        <div>
          <h2 className="section-title">Despesas</h2>
          <p className="section-sub">Acompanhe seus gastos e analise riscos</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="icon-btn" onClick={() => {
              const [y, m] = selectedMonth.split('-').map(Number)
              const d = new Date(y, m - 2, 1)
              setSelectedMonth(d.toISOString().slice(0, 7))
            }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 120, textAlign: 'center' }}>{getMonthLabel(selectedMonth)}</span>
            <button className="icon-btn" onClick={() => {
              const [y, m] = selectedMonth.split('-').map(Number)
              const d = new Date(y, m, 1)
              setSelectedMonth(d.toISOString().slice(0, 7))
            }}>
              <ChevronRight size={16} />
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
          <div className="kpi kpi-wide" style={{ height: '100%' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-orange"><ArrowUp size={20} /></div>
              <div className="kpi-label">Despesas do período</div>
            </div>
            <div className="kpi-val">
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(totalPeriodo)}
              </span>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="kpi kpi-wide" style={{ height: '100%' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-green"><CheckCircle2 size={20} /></div>
              <div className="kpi-label">Pagas</div>
            </div>
            <div className="kpi-val">
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(pagos)}
              </span>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="kpi kpi-wide" style={{ height: '100%' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-orange" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}><AlertTriangle size={20} /></div>
              <div className="kpi-label">Pendentes/Atrasadas</div>
            </div>
            <div className="kpi-val" style={{ color: pendentes > 0 ? '#EF4444' : 'inherit' }}>
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(pendentes)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- CARDS --- */}
      <div className="fd-grid">
        {/* Score de Controle */}
        <div className="col-4">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Controle de Gastos</div>
            {totalPeriodo > 0 && prevTotal > 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--surface-2)" strokeWidth="3.5" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--gold)' : 'var(--neg)'} strokeWidth="3.5" strokeDasharray={`${score}, 100`} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900 }}>
                    {Math.round(score)}
                  </div>
                </div>
                <h4 style={{ margin: 0, color: 'var(--ink)' }}>{score >= 70 ? 'Muito Bom!' : score >= 40 ? 'Atenção' : 'Cuidado!'}</h4>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>Comparado ao mês passado.</p>
              </div>
            ) : (
              <p className="empty-msg" style={{ padding: '30px 0' }}>Sem dados suficientes para gerar o score.</p>
            )}
          </div>
        </div>

        {/* Risco de Estouro */}
        <div className="col-4">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Risco de Estouro</div>
            {totalPeriodo > 0 && prevTotal > 0 ? (
              <div style={{ padding: '20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Projeção de gastos</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: riskPct >= 100 ? 'var(--neg)' : 'var(--muted)' }}>{riskPct}%</span>
                </div>
                <div style={{ width: '100%', height: 10, borderRadius: 5, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, riskPct)}%`, height: '100%', background: riskPct >= 100 ? 'var(--neg)' : riskPct >= 80 ? 'var(--orange)' : 'var(--green)', transition: 'width 0.5s' }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 12 }}>
                  Baseado no ritmo atual, você projetará R$ {brl(projection)} neste mês (vs R$ {brl(prevTotal)} anterior).
                </p>
              </div>
            ) : (
              <p className="empty-msg" style={{ padding: '30px 0' }}>Sem dados suficientes.</p>
            )}
          </div>
        </div>

        {/* Histórico 4 meses */}
        <div className="col-4">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Histórico (4 meses)</div>
            {history4m.reduce((s, m) => s + m.total, 0) > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100, padding: '0 4px' }}>
                {history4m.map((m, i) => {
                  const barH = maxHVal > 0 ? Math.max(4, Math.round((m.total / maxHVal) * 80)) : 4
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>
                        {m.total >= 1000 ? `${(m.total/1000).toFixed(0)}k` : brl(m.total)}
                      </span>
                      <div style={{ width: '100%', maxWidth: 30, height: barH, background: 'var(--orange)', borderRadius: '4px 4px 0 0', opacity: i === 3 ? 1 : 0.6 }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--faint)' }}>{m.label}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="empty-msg" style={{ padding: '20px 0' }}>Poucos dados para histórico.</p>
            )}
          </div>
        </div>
      </div>

      <div className="fd-grid">
        {/* Categorias que mais pesaram */}
        <div className="col-8">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Categorias que mais pesaram</div>
            {catRanking.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {catRanking.map(([catName, val]) => {
                  const pct = totalPeriodo > 0 ? Math.round((val / totalPeriodo) * 100) : 0
                  const catColor = categories.find(c => c.name === catName)?.color || '#EF4444'
                  return (
                    <div key={catName} className="cat-row">
                      <div className="cat-name"><span className="cat-dot" style={{ background: catColor }} /> {catName || 'Sem categoria'}</div>
                      <div>
                        <div className="cat-track"><i style={{ width: `${pct}%`, background: catColor }} /></div>
                        <div className="cat-pct" style={{ marginTop: 5 }}>{pct}%</div>
                      </div>
                      <div className="cat-val"><span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(val)}</span></div>
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
          <div className="card" style={{ height: '100%', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(245, 124, 0, 0.05))' }}>
            <div className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#991B1B' }}>
              <Sparkles size={18} color="var(--orange)" /> Finnly IA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-secondary" style={{ justifyContent: 'flex-start', background: 'var(--surface)' }} onClick={() => onAsk?.("Onde posso economizar este mês?")}>Onde posso economizar?</button>
              <button className="btn-secondary" style={{ justifyContent: 'flex-start', background: 'var(--surface)' }} onClick={() => onAsk?.("Gostaria de analisar meus gastos recentes.")}>Analisar gastos</button>
              <button className="btn-secondary" style={{ justifyContent: 'flex-start', background: 'var(--surface)' }} onClick={() => onAsk?.("Como está minha proporção de gastos fixos vs variáveis?")}>Gastos fixos vs variáveis</button>
              <button className="btn-secondary" style={{ justifyContent: 'flex-start', background: 'var(--surface)' }} onClick={() => onAsk?.("Qual o meu risco financeiro para este mês?")}>Risco do mês</button>
            </div>
          </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="filter-bar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 24, paddingBottom: 16, borderBottom: '1px solid var(--line-soft)' }}>
        <button 
          className="btn-secondary" 
          style={{ padding: '8px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, background: activeFilterCount > 0 ? 'rgba(245, 124, 0, 0.1)' : 'var(--surface)', color: activeFilterCount > 0 ? 'var(--orange-ink)' : 'var(--ink)' }}
          onClick={() => setIsDrawerOpen(true)}
        >
          <Filter size={15} /> Filtros avançados
          {activeFilterCount > 0 && <div style={{ background: 'var(--orange)', color: 'white', borderRadius: 10, padding: '2px 6px', fontSize: 10, fontWeight: 800 }}>{activeFilterCount}</div>}
        </button>

        <div className="search-input">
          <Search size={14} className="search-icon" />
          <input
            placeholder="Buscar despesa…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: 'var(--faint)' }}>
              <X size={13} />
            </button>
          )}
        </div>
        
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

      <section className="card fade-up">
        <div className="card-head">
          <div className="card-title">Detalhamento das Saídas</div>
          <div className="card-sub">{filteredItems.length} resultado{filteredItems.length !== 1 ? 's' : ''} {filterState.period !== 'global' && <span style={{ color: 'var(--orange)', fontWeight: 700 }}>· Filtro ativo</span>}</div>
        </div>
        
        {loading ? (
          <p className="empty-msg">Carregando...</p>
        ) : filteredItems.length === 0 ? (
          <div className="empty-list">
            <Search size={32} color="var(--line-strong)" />
            <p>Nenhuma despesa encontrada.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const catColor = categories.find(c => c.name === item.category)?.color ?? '#90A4AE'
            return (
              <div key={item.id} className="row-item" style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: 12, marginBottom: 12 }}>
                <div className="row-ic" style={{ background: catColor + '22', color: catColor }}>
                  <ArrowUp size={19} />
                </div>
                <div className="row-main">
                  <div className="row-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {item.description || item.category}
                    {item.payment_status ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'rgba(40,167,69,0.1)', padding: '2px 6px', borderRadius: 6 }}>Pago</span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 6 }}>Pendente</span>
                    )}
                  </div>
                  <div className="row-sub">
                    {item.category} · {formatDate(item.date)}
                    {item.tags && item.tags.length > 0 && (
                      <div style={{ display: 'inline-flex', gap: 4, marginLeft: 8 }}>
                        {item.tags.map(t => <span key={t} style={{ fontSize: 10, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="row-amt neg-amt">
                  <span className={`tabnums${hidden ? ' priv' : ''}`}>
                    – R$ {brl(Number(item.amount))}
                  </span>
                </div>
                <button className="icon-btn" onClick={() => setEditExpense(item)} disabled={isPending} title="Editar">
                  <Pencil size={15} />
                </button>
              </div>
            )
          })
        )}
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
