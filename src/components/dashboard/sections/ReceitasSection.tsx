
'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import {
  Plus, X, Pencil, Trash2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  ArrowDown, Search, Filter, CalendarClock, Tag, CheckCircle2, Sparkles, AlertCircle, Percent
} from 'lucide-react'
import { addIncome, updateIncome, deleteIncome, getAllIncomes } from '@/app/dashboard/actions/incomes'
import { getIncomeCategories } from '@/app/dashboard/actions/income-categories'
import type { Income, IncomeCategory } from '@/types/database'
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
    const [data, cats] = await Promise.all([
      getAllIncomes(), // Assuming an action like this exists, else fetch from supabase
      getIncomeCategories()
    ])
    setAllIncomes(data as Income[])
    setCategories(cats)
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
  const recebido = currentIncomes.filter(i => i.payment_status).reduce((s, i) => s + Number(i.amount), 0)
  const pendente = currentIncomes.filter(i => !i.payment_status).reduce((s, i) => s + Number(i.amount), 0)

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
    <div className="fd-stack fade-up">
      <div className="topbar-inline">
        <div>
          <h2 className="section-title">Receitas</h2>
          <p className="section-sub">Acompanhe suas entradas e projeções</p>
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
          <button className="btn-primary btn-orange" onClick={() => setShowIncomeModal(true)}>
            <Plus size={18} /> Nova receita
          </button>
        </div>
      </div>

      {/* --- KPIs --- */}
      <div className="fd-grid">
        <div className="col-4">
          <div className="kpi kpi-wide" style={{ height: '100%' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-green"><ArrowDown size={20} /></div>
              <div className="kpi-label">Total do período</div>
            </div>
            <div className="kpi-val">
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(totalPeriodo)}
              </span>
            </div>
            <div className="kpi-foot">
              <span className="mut">{currentIncomes.length} entradas registradas</span>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="kpi kpi-wide" style={{ height: '100%' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-teal"><CheckCircle2 size={20} /></div>
              <div className="kpi-label">Já recebido</div>
            </div>
            <div className="kpi-val">
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(recebido)}
              </span>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="kpi kpi-wide" style={{ height: '100%' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-orange"><AlertCircle size={20} /></div>
              <div className="kpi-label">Pendente</div>
            </div>
            <div className="kpi-val" style={{ color: pendente > 0 ? 'var(--orange-ink)' : 'inherit' }}>
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(pendente)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- CARDS --- */}
      <div className="fd-grid">
        {/* Previsão */}
        <div className="col-4">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Previsão</div>
            {pendente === 0 && recebido > 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={32} color="var(--green)" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ margin: 0, color: 'var(--ink)' }}>Realização do mês</h4>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>Tudo recebido!</p>
              </div>
            ) : pendente > 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CalendarClock size={32} color="var(--orange)" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ margin: 0, color: 'var(--ink)' }}>Falta receber</h4>
                <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange-ink)', marginTop: 8 }}>
                  R$ {brl(pendente)}
                </div>
              </div>
            ) : (
              <p className="empty-msg">Nenhuma receita prevista.</p>
            )}
          </div>
        </div>

        {/* Composição */}
        <div className="col-4">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Composição da Receita</div>
            {totalPeriodo > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', width: '100%', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${pctFixa}%`, background: 'var(--teal)' }} />
                  <div style={{ width: `${pctVar}%`, background: 'var(--gold)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--teal)' }} /> Fixa
                    </div>
                    <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>R$ {brl(receitaFixa)} ({pctFixa}%)</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', fontSize: 13, fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--gold)' }} /> Variável
                    </div>
                    <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>R$ {brl(receitaVar)} ({pctVar}%)</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="empty-msg">Sem composição.</p>
            )}
          </div>
        </div>

        {/* Histórico */}
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
                      <div style={{ width: '100%', maxWidth: 30, height: barH, background: 'var(--teal)', borderRadius: '4px 4px 0 0', opacity: i === 3 ? 1 : 0.6 }} />
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
        {/* Fontes */}
        <div className="col-8">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Fontes de Receita (Ranking)</div>
            {catRanking.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {catRanking.map(([catName, val]) => {
                  const pct = totalPeriodo > 0 ? Math.round((val / totalPeriodo) * 100) : 0
                  const catColor = categories.find(c => c.name === catName)?.color || '#90A4AE'
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
              <p className="empty-msg">Nenhuma receita registrada.</p>
            )}
          </div>
        </div>

        {/* Finnly IA */}
        <div className="col-4">
          <div className="card" style={{ height: '100%', background: 'linear-gradient(135deg, rgba(1, 88, 76, 0.05), rgba(245, 124, 0, 0.05))' }}>
            <div className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--teal-900)' }}>
              <Sparkles size={18} color="var(--orange)" /> Finnly IA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-secondary" style={{ justifyContent: 'flex-start', background: 'var(--surface)' }} onClick={() => onAsk?.("Gostaria de analisar minhas receitas.")}>Analisar receitas</button>
              <button className="btn-secondary" style={{ justifyContent: 'flex-start', background: 'var(--surface)' }} onClick={() => onAsk?.("Minha renda está muito concentrada?")}>Minha renda está concentrada?</button>
              <button className="btn-secondary" style={{ justifyContent: 'flex-start', background: 'var(--surface)' }} onClick={() => onAsk?.("Qual a previsão de receitas para este mês?")}>Previsão do mês</button>
              <button className="btn-secondary" style={{ justifyContent: 'flex-start', background: 'var(--surface)' }} onClick={() => onAsk?.("Como posso aumentar minha renda?")}>Como aumentar renda?</button>
            </div>
          </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="filter-bar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 24, paddingBottom: 16, borderBottom: '1px solid var(--line-soft)' }}>
        <button 
          className="btn-secondary" 
          style={{ padding: '8px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, background: activeFilterCount > 0 ? 'rgba(1, 88, 76, 0.1)' : 'var(--surface)', color: activeFilterCount > 0 ? 'var(--teal)' : 'var(--ink)' }}
          onClick={() => setIsDrawerOpen(true)}
        >
          <Filter size={15} /> Filtros avançados
          {activeFilterCount > 0 && <div style={{ background: 'var(--teal)', color: 'white', borderRadius: 10, padding: '2px 6px', fontSize: 10, fontWeight: 800 }}>{activeFilterCount}</div>}
        </button>

        <div className="search-input">
          <Search size={14} className="search-icon" />
          <input
            placeholder="Buscar receita…"
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
          type="income"
          activeFilters={filterState}
          onApply={setFilterState}
          categories={categories}
          accounts={[]}
          cards={[]}
        />
      </div>

      <section className="card fade-up">
        <div className="card-head">
          <div className="card-title">Detalhamento das Entradas</div>
          <div className="card-sub">{filteredIncomes.length} resultado{filteredIncomes.length !== 1 ? 's' : ''} {filterState.period !== 'global' && <span style={{ color: 'var(--orange)', fontWeight: 700 }}>· Filtro ativo</span>}</div>
        </div>
        
        {loading ? (
          <p className="empty-msg">Carregando...</p>
        ) : filteredIncomes.length === 0 ? (
          <div className="empty-list">
            <Search size={32} color="var(--line-strong)" />
            <p>Nenhuma receita encontrada.</p>
          </div>
        ) : (
          filteredIncomes.map(item => {
            const cat = categories.find(c => c.name === item.category)
            const catColor = cat?.color ?? '#90A4AE'
            return (
              <div key={item.id} className="row-item" style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: 12, marginBottom: 12 }}>
                <div className="row-ic" style={{ background: catColor + '22', color: catColor }}>
                  <ArrowDown size={19} />
                </div>
                <div className="row-main">
                  <div className="row-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {item.description || item.category}
                    {item.payment_status ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'rgba(40,167,69,0.1)', padding: '2px 6px', borderRadius: 6 }}>Recebido</span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--orange)', background: 'rgba(245,124,0,0.1)', padding: '2px 6px', borderRadius: 6 }}>Pendente</span>
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
                <div className="row-amt pos">
                  <span className={`tabnums${hidden ? ' priv' : ''}`}>
                    + R$ {brl(Number(item.amount))}
                  </span>
                </div>
                <button className="icon-btn" onClick={() => setEditIncome(item)} disabled={isPending} title="Editar">
                  <Pencil size={15} />
                </button>
              </div>
            )
          })
        )}
      </section>

      {(showIncomeModal || editIncome) && (
        <PremiumIncomeModal
          income={editIncome}
          categories={categories}
          onClose={() => { setShowIncomeModal(false); setEditIncome(null) }}
          onSaved={handleSaved}
          onRequestNewCategory={() => {}}
        />
      )}
    </div>
  )
}
