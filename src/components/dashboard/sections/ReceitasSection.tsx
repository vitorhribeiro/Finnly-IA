'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import {
  Plus, X, Pencil, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  ArrowDown, Search, Filter, CalendarClock, CheckCircle2, Sparkles, AlertCircle, AlertTriangle, Percent, PieChart, Copy, Users, Info,
  HeartPulse, Wallet, MoreHorizontal, Trash2, Check
} from 'lucide-react'
import { CardInfoTooltip } from '@/components/ui/CardInfoTooltip'
import { getTransactionStatus } from '@/lib/utils'
import { calculateIncomeHealthScore } from '@/utils/financialHealth'
import { updateIncome, deleteIncome, getAllIncomes } from '@/app/dashboard/actions/incomes'
import { getIncomeCategories } from '@/app/dashboard/actions/income-categories'
import { getAccounts } from '@/app/dashboard/actions/accounts'
import type { Income, IncomeCategory, Account } from '@/types/database'
import { PremiumIncomeModal } from './PremiumIncomeModal'
import TransactionsFilterDrawer, { FilterState, defaultFilterState } from '@/components/dashboard/filters/TransactionsFilterDrawer'
import { IncomeInsightDrawer } from '@/components/dashboard/drawers/IncomeInsightDrawer'

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

function formatShortDate(dStr: string) {
  if (!dStr) return ''
  const cleanStr = dStr.slice(0, 10)
  const [y, m, d] = cleanStr.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${day} ${month}`
}

function formatMainDate(dStr: string) {
  if (!dStr) return ''
  const cleanStr = dStr.slice(0, 10)
  const [y, m, d] = cleanStr.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  const year = dateObj.getFullYear()
  return `${day} ${month}. ${year}`
}

function formatGroupDate(dStr: string) {
  if (!dStr) return ''
  const cleanStr = dStr.slice(0, 10)
  const [y, m, d] = cleanStr.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = dateObj.toLocaleDateString('pt-BR', { month: 'long' })
  const year = dateObj.getFullYear()
  return `${day} de ${month} de ${year}`
}

function getGroupSummary(items: Income[]) {
  let paid = 0
  let pending = 0
  let overdue = 0
  items.forEach(i => {
    const amt = Number(i.amount)
    const status = getTransactionStatus(i.payment_status, i.date)
    if (status === 'paid') paid += amt
    else if (status === 'overdue') overdue += amt
    else pending += amt
  })

  const parts = []
  if (paid > 0) parts.push(`R$ ${brl(paid)} recebido`)
  if (pending > 0) parts.push(`R$ ${brl(pending)} pendente`)
  if (overdue > 0) parts.push(`R$ ${brl(overdue)} atrasado`)
  
  if (parts.length === 1) {
    return parts[0] + ' neste dia'
  }
  
  const total = paid + pending + overdue
  return `R$ ${brl(total)} em entradas`
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
  const [statusTab, setStatusTab] = useState<'all' | 'received' | 'pending' | 'overdue'>('all')

  // Insight Drawer
  const [insightDrawerOpen, setInsightDrawerOpen] = useState(false)
  const [insightDrawerType, setInsightDrawerType] = useState<'period' | 'realization' | 'health' | null>(null)

  // Modals
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [editIncome, setEditIncome] = useState<Income | null>(null)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)

  // State to track item being toggled
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  // State to track active menu row
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null)
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  // Reset page when filters or selection changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1)
  }, [selectedMonth, searchQuery, filterState, statusTab])

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

  function handleToggleStatus(income: Income) {
    if (!income.account_id) {
      alert("Escolha uma conta de destino antes de marcar como recebida.")
      setEditIncome(income)
      setInsightDrawerOpen(false)
      return
    }
    setSavingItemId(income.id)
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('amount', String(income.amount))
        fd.append('category', income.category)
        if (income.description) fd.append('description', income.description)
        fd.append('date', income.date)
        fd.append('is_recurring', String(income.is_recurring))
        if (income.notes) fd.append('notes', income.notes)
        if (income.account_id) fd.append('account_id', income.account_id)
        fd.append('payment_status', 'true')
        if (income.income_type) fd.append('income_type', income.income_type)
        if (income.income_method) fd.append('income_method', income.income_method)
        if (income.tags && income.tags.length > 0) fd.append('tags', income.tags.join(','))
        
        await updateIncome(income.id, fd)
        await load()
      } catch (err) {
        console.error(err)
      } finally {
        setSavingItemId(null)
      }
    })
  }

  function handleToggleStatusToUnpaid(income: Income) {
    if (!confirm("Tem certeza que deseja desmarcar esta receita como recebida?")) return
    setSavingItemId(income.id)
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('amount', String(income.amount))
        fd.append('category', income.category)
        if (income.description) fd.append('description', income.description)
        fd.append('date', income.date)
        fd.append('is_recurring', String(income.is_recurring))
        if (income.notes) fd.append('notes', income.notes)
        if (income.account_id) fd.append('account_id', income.account_id)
        fd.append('payment_status', 'false')
        if (income.income_type) fd.append('income_type', income.income_type)
        if (income.income_method) fd.append('income_method', income.income_method)
        if (income.tags && income.tags.length > 0) fd.append('tags', income.tags.join(','))
        
        await updateIncome(income.id, fd)
        await load()
      } catch (err) {
        console.error(err)
      } finally {
        setSavingItemId(null)
      }
    })
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
  const hasPreviousHistory = history4m.slice(0, 3).some(m => m.total > 0)

  // --- Saúde da Receita Calculations ---
  const saudeMetrics = useMemo(() => {
    return calculateIncomeHealthScore(allIncomes, selectedMonth, allIncomes)
  }, [allIncomes, selectedMonth])

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'var(--teal)'
    if (status === 'light_attention') return 'var(--gold)'
    if (status === 'attention') return 'var(--orange)'
    if (status === 'critical') return 'var(--neg)'
    return 'rgba(13, 61, 55, 0.15)'
  }

  const strokeColor = getStatusColor(saudeMetrics.status)

  // --- Realização do Mês Calculations ---
  const hasForecast = totalPeriodo > 0
  const pctRealizacaoRaw = hasForecast ? (recebido / totalPeriodo) * 100 : 0
  const pctRealizacaoDisplayVal = Math.round(pctRealizacaoRaw)
  const pctBar = Math.min(100, Math.max(0, pctRealizacaoRaw))
  const faltante = Math.max(0, totalPeriodo - recebido)

  const formatSmartPercentage = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return '0'
    if (value > 0 && value < 1) {
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    }
    return `${Math.round(value)}`
  }

  const pctRealizacaoDisplayStr = useMemo(() => {
    return formatSmartPercentage(pctRealizacaoRaw)
  }, [pctRealizacaoRaw])

  const realizacaoState = useMemo(() => {
    if (!hasForecast) {
      return {
        status: 'empty',
        badgeClass: 'status-empty',
        badgeText: 'Sem dados',
        text: 'Aguardando lançamentos.',
        bannerClass: 'banner-empty',
        bannerTitle: 'Sem previsão cadastrada.',
        color: 'var(--muted)'
      }
    }

    if (recebido <= 0) {
      return {
        status: 'not_started',
        badgeClass: 'status-not-started',
        badgeText: 'Não iniciado',
        text: 'Aguardando recebimento.',
        bannerClass: 'banner-not-started',
        bannerTitle: 'Nenhuma receita prevista foi recebida ainda.',
        color: 'var(--faint)'
      }
    }

    if (pctRealizacaoDisplayVal >= 100) {
      const isOver = pctRealizacaoDisplayVal > 100
      return {
        status: 'completed',
        badgeClass: 'status-completed',
        badgeText: isOver ? 'Acima do previsto' : 'Concluído',
        text: isOver ? 'Meta superada.' : 'Receita recebida.',
        bannerClass: 'banner-completed',
        bannerTitle: 'Meta mensal concluída.',
        color: 'var(--green)'
      }
    }

    if (pctRealizacaoDisplayVal < 50) {
      return {
        status: 'below_expectations',
        badgeClass: 'status-below',
        badgeText: 'Abaixo do esperado',
        text: 'Receita abaixo do previsto.',
        bannerClass: 'banner-below',
        bannerTitle: `Faltam R$ ${brl(faltante)} para concluir.`,
        color: 'var(--orange-ink)'
      }
    }

    return {
      status: 'in_progress',
      badgeClass: 'status-in-progress',
      badgeText: 'Em andamento',
      text: 'Recebimento em andamento.',
      bannerClass: 'banner-in-progress',
      bannerTitle: `Faltam R$ ${brl(faltante)} para concluir.`,
      color: 'var(--gold)'
    }
  }, [hasForecast, recebido, pctRealizacaoDisplayVal, faltante])

  // --- Receitas do Período Calculations ---
  const propRecebido = totalPeriodo > 0 ? (recebido / totalPeriodo) * 100 : 0
  const propPendente = totalPeriodo > 0 ? (pendente / totalPeriodo) * 100 : 0
  const propAtrasado = totalPeriodo > 0 ? (atrasado / totalPeriodo) * 100 : 0

  const periodoState = useMemo(() => {
    if (totalPeriodo <= 0) {
      return {
        status: 'empty',
        bannerClass: 'banner-empty',
        title: 'Cadastre receitas para acompanhar o período.'
      }
    }
    if (atrasado > 0) {
      return {
        status: 'atrasado',
        bannerClass: 'banner-atrasado',
        title: `R$ ${brl(atrasado)} atrasados neste período.`
      }
    }
    if (pendente > 0) {
      return {
        status: 'pendente',
        bannerClass: 'banner-pendente',
        title: `R$ ${brl(pendente)} pendentes para receber.`
      }
    }
    return {
      status: 'recebido',
      bannerClass: 'banner-recebido',
      title: 'Receita totalmente recebida neste período.'
    }
  }, [totalPeriodo, pendente, atrasado])

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
      
      // 1. Category Filter (match UUID in filterState.categoryId to categories name)
      if (filterState.categoryId && filterState.categoryId !== 'all') {
        const cat = categories.find(c => c.id === filterState.categoryId)
        if (cat && inc.category !== cat.name) return false
      }

      // 2. Account Filter
      if (filterState.accountId && filterState.accountId !== 'all') {
        if (inc.account_id !== filterState.accountId) return false
      }

      // 3. Status Tab Filter (from Quick Toolbar Tabs)
      const status = getTransactionStatus(inc.payment_status, inc.date)
      if (statusTab === 'received' && status !== 'paid') return false
      if (statusTab === 'pending' && status !== 'pending') return false
      if (statusTab === 'overdue' && status !== 'overdue') return false

      // 4. Receipt Method Filter (from Drawer)
      if (filterState.paymentMethod && filterState.paymentMethod !== 'all') {
        if (inc.income_method !== filterState.paymentMethod) return false
      }

      // 5. Type Filter
      if (filterState.transactionType !== 'all' && inc.income_type !== filterState.transactionType) return false
      
      // 6. Tags Filter
      if (filterState.tags && filterState.tags.length > 0) {
        const incTags = inc.tags || []
        if (!filterState.tags.every(t => incTags.includes(t))) return false
      }

      // 7. Amount Filters (parse Brazilian format)
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
  }, [allIncomes, searchQuery, filterState, selectedMonth, statusTab, categories])

  // Get statistics for the filtered entries list
  const filteredStats = useMemo(() => {
    let rec = 0, pen = 0, atr = 0
    filteredIncomes.forEach(i => {
      const status = getTransactionStatus(i.payment_status, i.date)
      const amt = Number(i.amount)
      if (status === 'paid') rec += amt
      else if (status === 'overdue') atr += amt
      else pen += amt
    })
    return { rec, pen, atr }
  }, [filteredIncomes])

  const activeFilterCount = Object.values(filterState).filter(v => v && v !== 'all' && v !== 'global' && v !== 'newest' && (!Array.isArray(v) || v.length > 0)).length

  // Pagination calculations
  const ITEMS_PER_PAGE = 7
  const totalItems = filteredIncomes.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const activePage = Math.min(currentPage, totalPages)

  const paginatedIncomes = useMemo(() => {
    const start = (activePage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return filteredIncomes.slice(start, end)
  }, [filteredIncomes, activePage])

  // Group paginated items by date
  const groupedIncomes = useMemo(() => {
    const groups: { date: string; items: Income[] }[] = []
    paginatedIncomes.forEach(item => {
      const existing = groups.find(g => g.date === item.date)
      if (existing) {
        existing.items.push(item)
      } else {
        groups.push({ date: item.date, items: [item] })
      }
    })
    return groups
  }, [paginatedIncomes])

  return (
    <div className="fd-stack fade-up" style={{ gap: 16 }}>
      <div className="topbar-inline" style={{ marginBottom: 8, justifyContent: 'flex-end' }}>
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

      {/* --- PRIMEIRA DOBRA: GRID PRINCIPAL --- */}
      <div className="receitas-primary-grid fade-up" style={{ marginBottom: 16 }}>
        <div className="receitas-main-col" style={{ height: '100%' }}>
      <section id="detalhamento-entradas" className="card fade-up" style={{ padding: 0, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 0 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div className="card-title" style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Detalhamento das Entradas</div>
              <div className="card-sub" style={{ marginTop: 4, fontSize: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span>{filteredIncomes.length} resultado{filteredIncomes.length !== 1 ? 's' : ''}</span>
                {filterState.period !== 'global' && <span style={{ color: 'var(--orange-ink)', fontWeight: 700 }}>· Filtro ativo</span>}
              </div>
            </div>
            {filteredIncomes.length > 0 && (
              <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal-900)', background: 'rgba(1,88,76,0.08)', padding: '6px 14px', borderRadius: 20 }}>
                R$ {brl(filteredIncomes.reduce((s, i) => s + Number(i.amount), 0))} filtrado
              </div>
            )}
          </div>
          
          <div className="filter-bar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid var(--line-soft)' }}>
            <div className="search-input" style={{
              flex: '1 1 200px',
              maxWidth: 300,
              background: 'var(--surface-2)',
              borderRadius: 8,
              border: '1px solid var(--line-soft)',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Search size={14} className="search-icon" style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <input
                placeholder="Buscar receita..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--ink)',
                  width: '100%'
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: 'var(--muted)' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="hide-scrollbar">
              {[
                { key: 'all', label: 'Todas', activeColor: 'var(--teal-900)' },
                { key: 'received', label: 'Recebidas', activeColor: 'var(--teal-900)' },
                { key: 'pending', label: 'Pendentes', activeColor: 'var(--teal-900)' },
                { key: 'overdue', label: 'Atrasadas', activeColor: 'var(--teal-900)' },
              ].map(chip => {
                const isActive = statusTab === chip.key
                return (
                  <button
                    key={chip.key}
                    className={`btn-ghost ${isActive ? 'active-chip' : ''}`}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 16,
                      background: isActive ? chip.activeColor : 'var(--surface)',
                      color: isActive ? 'white' : 'var(--muted)',
                      border: isActive ? `1px solid ${chip.activeColor}` : '1px solid var(--line-soft)',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setStatusTab(chip.key as any)}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>
            
            <button 
              className="btn-secondary" 
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: activeFilterCount > 0 ? 'rgba(1, 88, 76, 0.08)' : 'var(--surface)',
                color: activeFilterCount > 0 ? 'var(--teal-900)' : 'var(--ink)',
                border: '1px solid var(--line-soft)',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
              onClick={() => setIsDrawerOpen(true)}
            >
              <Filter size={14} /> Filtros {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
            
            <TransactionsFilterDrawer 
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              type="income"
              activeFilters={filterState}
              onApply={setFilterState}
              categories={categories}
              accounts={accounts}
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
            </div>
          )}
        </div>
        
        <div style={{ padding: '0 20px', flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p className="empty-msg" style={{ padding: '30px 0', fontSize: 13 }}>Carregando...</p>
          ) : filteredIncomes.length === 0 ? (
            searchQuery.trim() || activeFilterCount > 0 ? (
              <div className="premium-empty-state">
                <div className="icon-container">
                  <Search size={24} />
                </div>
                <h3>Nenhuma entrada encontrada</h3>
                <p>Ajuste a busca ou limpe os filtros para visualizar seus lançamentos.</p>
                <div className="actions-row">
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: '1px solid var(--line-soft)', cursor: 'pointer' }} onClick={() => { setSearchQuery(''); setFilterState(defaultFilterState); }}>Limpar filtros</button>
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, background: 'var(--teal)', color: 'white', border: 'none', cursor: 'pointer' }} onClick={() => setShowIncomeModal(true)}>Nova receita</button>
                </div>
              </div>
            ) : (
              <div className="premium-empty-state">
                <div className="icon-container">
                  <CalendarClock size={24} />
                </div>
                <h3>Nenhuma entrada cadastrada</h3>
                <p>Cadastre uma receita para acompanhar seus recebimentos neste mês.</p>
                <div className="actions-row">
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, background: 'var(--teal)', color: 'white', border: 'none', cursor: 'pointer' }} onClick={() => setShowIncomeModal(true)}>Nova receita</button>
                </div>
              </div>
            )
          ) : (
            <div className="premium-list-container">
              {/* Header (desktop/tablet only) */}
              <div className="premium-table-header desktop-tablet-only">
                <div className="col-sit">Situação</div>
                <div className="col-date sortable" onClick={() => setFilterState(prev => ({ ...prev, order: prev.order === 'newest' ? 'oldest' : 'newest' }))}>
                  Data {filterState.order === 'newest' ? '↓' : filterState.order === 'oldest' ? '↑' : ''}
                </div>
                <div className="col-desc">Descrição</div>
                <div className="col-cat" style={{ textAlign: 'center' }}>Categoria</div>
                <div className="col-acc">Conta</div>
                <div className="col-val" style={{ textAlign: 'right' }}>Valor</div>
                <div className="col-actions" style={{ textAlign: 'right' }}>Ações</div>
              </div>

              <div className="premium-rows-container">
                {groupedIncomes.map(group => {
                  return (
                    <div key={group.date} className="date-group">
                      <div className="group-header">
                        <span className="group-date">{formatGroupDate(group.date)}</span>
                        <span className="group-summary">{getGroupSummary(group.items)}</span>
                      </div>
                      <div className="group-items">
                        {group.items.map(item => {
                          const cat = categories.find(c => c.name === item.category)
                          const catColor = cat?.color ?? '#90A4AE'
                          const status = getTransactionStatus(item.payment_status, item.date)
                          const account = accounts.find(a => a.id === item.account_id)
                          
                          // details for subtext
                          const subParts: string[] = []
                          if (item.is_recurring) subParts.push('Recorrente')
                          if (item.installment_number && item.installments_total) {
                            subParts.push(`Parcela ${item.installment_number}/${item.installments_total}`)
                          }
                          const descriptionSubtext = subParts.join(' · ')
                          
                          let valSub = ''
                          if (item.installment_number) valSub = `Parcela ${item.installment_number}/${item.installments_total}`
                          else if (item.is_recurring) valSub = 'Recorrente'
                          
                          return (
                            <div key={item.id}>
                              {/* Desktop/Tablet Row */}
                              <div className="premium-table-row desktop-tablet-only">
                                <div className="cell-sit">
                                  <span className={`status-badge ${status}`}>
                                    {status === 'paid' && '✓ Recebido'}
                                    {status === 'pending' && '○ Pendente'}
                                    {status === 'overdue' && '! Atrasado'}
                                  </span>
                                </div>
                                <div className="cell-date">
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{formatShortDate(item.date)}</div>
                                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                    {status === 'paid' ? `Recebido em ${item.received_at ? formatShortDate(item.received_at) : formatShortDate(item.date)}` :
                                     status === 'overdue' ? `Venceu em ${formatShortDate(item.date)}` : `Previsto para ${formatShortDate(item.date)}`}
                                  </div>
                                </div>
                                <div className="cell-desc">
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.description || item.category}>
                                    {item.description || item.category}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                    {descriptionSubtext}
                                  </div>
                                </div>
                                 <div className="cell-cat" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                                   <span className="category-badge" style={{ backgroundColor: catColor + '10', color: catColor }}>
                                     <span className="category-dot" style={{ backgroundColor: catColor }} />
                                     {item.category}
                                   </span>
                                   <span 
                                     style={{ 
                                       display: 'inline-flex',
                                       alignItems: 'center',
                                       fontSize: '9px', 
                                       fontWeight: 800,
                                       textTransform: 'uppercase',
                                       letterSpacing: '0.05em',
                                       padding: '2px 6px',
                                       borderRadius: '6px',
                                       background: item.income_type === 'fixed' ? 'rgba(1, 88, 76, 0.05)' : 'rgba(245, 124, 0, 0.05)',
                                       color: item.income_type === 'fixed' ? 'var(--teal)' : 'var(--orange-ink)',
                                       border: item.income_type === 'fixed' ? '1px solid rgba(1, 88, 76, 0.12)' : '1px solid rgba(245, 124, 0, 0.12)'
                                     }}
                                   >
                                     {item.income_type === 'fixed' ? 'Fixa' : 'Variável'}
                                   </span>
                                </div>
                                <div className="cell-acc">
                                  {item.account_id ? (
                                    account ? (
                                      <span className="account-badge active">{account.name}</span>
                                    ) : (
                                      <span className="account-badge warning">Conta não encontrada</span>
                                    )
                                  ) : (
                                    <span className={`account-badge ${status !== 'paid' ? 'warning' : 'muted'}`}>Sem conta</span>
                                  )}
                                </div>
                                <div className="cell-val" style={{ textAlign: 'right' }}>
                                  <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 13, fontWeight: 700, color: status === 'paid' ? 'var(--green)' : status === 'overdue' ? 'var(--neg)' : 'var(--teal-900)' }}>
                                    + R$ {brl(Number(item.amount))}
                                  </div>
                                  {valSub && (
                                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{valSub}</div>
                                  )}
                                </div>
                                <div className="cell-actions" style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', position: 'relative' }} onClick={e => e.stopPropagation()}>
                                    {status !== 'paid' && (
                                      <button 
                                        className="action-btn check-btn"
                                        onClick={() => handleToggleStatus(item)}
                                        disabled={savingItemId !== null}
                                        title="Marcar como recebida"
                                      >
                                        {savingItemId === item.id ? <div className="spinner-small" /> : <CheckCircle2 size={12} />}
                                      </button>
                                    )}
                                    
                                    <button 
                                      className="action-btn"
                                      onClick={() => setEditIncome(item)}
                                      title="Editar"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    
                                    <button 
                                      className="action-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveMenuId(activeMenuId === item.id ? null : item.id)
                                      }}
                                      title="Mais opções"
                                    >
                                      <MoreHorizontal size={12} />
                                    </button>
                                    
                                    {activeMenuId === item.id && (
                                      <div className="premium-dropdown">
                                        <button className="dropdown-item" onClick={() => {
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
                                          setActiveMenuId(null)
                                        }}>
                                          <Copy size={13} style={{ marginRight: 6 }} /> Duplicar
                                        </button>
                                        {status === 'paid' && (
                                          <button className="dropdown-item warning" onClick={() => {
                                            handleToggleStatusToUnpaid(item)
                                            setActiveMenuId(null)
                                          }}>
                                            <X size={13} style={{ marginRight: 6 }} /> Desmarcar recebida
                                          </button>
                                        )}
                                        <button className="dropdown-item danger" onClick={() => {
                                          if (confirm("Tem certeza que deseja excluir esta receita?")) {
                                            handleDelete(item.id)
                                          }
                                          setActiveMenuId(null)
                                        }}>
                                          <Trash2 size={13} style={{ marginRight: 6 }} /> Excluir
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Mobile Card */}
                              <div className="premium-mobile-card mobile-only">
                                <div className="mobile-top-row">
                                  <span className="mobile-desc-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                                    {item.description || item.category}
                                  </span>
                                  <span className={`mobile-amount ${status} tabnums${hidden ? ' priv' : ''}`}>
                                    + R$ {brl(Number(item.amount))}
                                  </span>
                                </div>
                                
                                <div className="mobile-badge-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span className={`status-badge ${status}`}>
                                    {status === 'paid' && '✓ Recebido'}
                                    {status === 'pending' && '○ Pendente'}
                                    {status === 'overdue' && '! Atrasado'}
                                  </span>
                                  {valSub && (
                                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{valSub}</span>
                                  )}
                                </div>
                                
                                <div className="mobile-meta-row">
                                  <div>{formatMainDate(item.date)} · <span className="cat-text">{item.category}</span> · <span 
                                     style={{ 
                                       display: 'inline-flex',
                                       alignItems: 'center',
                                       fontSize: '8.5px', 
                                       fontWeight: 800,
                                       textTransform: 'uppercase',
                                       letterSpacing: '0.04em',
                                       padding: '1px 5px',
                                       borderRadius: '4px',
                                       background: item.income_type === 'fixed' ? 'rgba(1, 88, 76, 0.05)' : 'rgba(245, 124, 0, 0.05)',
                                       color: item.income_type === 'fixed' ? 'var(--teal)' : 'var(--orange-ink)',
                                       border: item.income_type === 'fixed' ? '1px solid rgba(1, 88, 76, 0.1)' : '1px solid rgba(245, 124, 0, 0.1)'
                                     }}
                                   >
                                     {item.income_type === 'fixed' ? 'Fixa' : 'Variável'}
                                   </span></div>
                                  <div className="acc-text">
                                    {item.account_id ? (
                                      account ? (
                                        <span className="account-badge active">{account.name}</span>
                                      ) : (
                                        <span className="account-badge warning">Conta não encontrada</span>
                                      )
                                    ) : (
                                      <span className={`account-badge ${status !== 'paid' ? 'warning' : 'muted'}`}>Sem conta</span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mobile-actions-row" onClick={e => e.stopPropagation()}>
                                  {status !== 'paid' ? (
                                    <button 
                                      className="mobile-action-btn primary"
                                      onClick={() => handleToggleStatus(item)}
                                      disabled={savingItemId !== null}
                                      style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                    >
                                      {savingItemId === item.id ? <div className="spinner-small" style={{ borderTopColor: 'white' }} /> : <CheckCircle2 size={12} />} 
                                      Marcar recebida
                                    </button>
                                  ) : null}
                                  <button 
                                    className="mobile-action-btn secondary"
                                    onClick={() => setEditIncome(item)}
                                  >
                                    Editar
                                  </button>
                                  <button 
                                    className="mobile-action-btn icon"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveMenuId(activeMenuId === item.id ? null : item.id)
                                    }}
                                  >
                                    <MoreHorizontal size={14} />
                                  </button>
                                  
                                  {activeMenuId === item.id && (
                                    <div className="premium-dropdown" style={{ bottom: '100%', top: 'auto', right: 0 }}>
                                      <button className="dropdown-item" onClick={() => {
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
                                        setActiveMenuId(null)
                                      }}>
                                        <Copy size={13} style={{ marginRight: 6 }} /> Duplicar
                                      </button>
                                      {status === 'paid' && (
                                        <button className="dropdown-item warning" onClick={() => {
                                          handleToggleStatusToUnpaid(item)
                                          setActiveMenuId(null)
                                        }}>
                                          <X size={13} style={{ marginRight: 6 }} /> Desmarcar recebida
                                        </button>
                                      )}
                                      <button className="dropdown-item danger" onClick={() => {
                                        if (confirm("Tem certeza que deseja excluir esta receita?")) {
                                          handleDelete(item.id)
                                        }
                                        setActiveMenuId(null)
                                      }}>
                                        <Trash2 size={13} style={{ marginRight: 6 }} /> Excluir
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(0,0,0,0.01)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
              Mostrando {Math.min(totalItems, (activePage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(totalItems, activePage * ITEMS_PER_PAGE)} de {totalItems}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                className="icon-btn" 
                disabled={activePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: 'none', cursor: activePage === 1 ? 'not-allowed' : 'pointer', opacity: activePage === 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={14} color="var(--ink)" />
              </button>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-900)', minWidth: 60, textAlign: 'center' }}>
                {activePage} / {totalPages}
              </span>
              <button 
                className="icon-btn" 
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: 'none', cursor: activePage === totalPages ? 'not-allowed' : 'pointer', opacity: activePage === totalPages ? 0.5 : 1 }}
              >
                <ChevronRight size={14} color="var(--ink)" />
              </button>
            </div>
          </div>
        )}

        <style jsx>{`
          .premium-list-container {
            display: flex;
            flex-direction: column;
            width: 100%;
          }
          .premium-table-header {
            display: grid;
            grid-template-columns: 100px 100px 1.8fr 1.2fr 1.2fr 100px 120px;
            gap: 12px;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid var(--line-soft);
            font-size: 11px;
            font-weight: 600;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(0,0,0,0.01);
          }
          .premium-table-header > div:not(:last-child) {
            position: relative;
            padding-right: 12px;
          }
          .premium-table-header > div:not(:last-child)::after {
            content: "";
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 1px;
            height: 12px;
            background-color: var(--line);
            opacity: 0.8;
          }
          .col-date.sortable {
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .col-date.sortable:hover {
            color: var(--ink);
          }
          .group-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 12px 6px 12px;
            font-size: 11px;
            font-weight: 700;
            color: var(--muted);
            border-bottom: 1px solid rgba(0,0,0,0.02);
            margin-top: 8px;
          }
          .group-date {
            text-transform: capitalize;
            font-weight: 700;
            color: var(--ink);
          }
          .group-summary {
            background: var(--surface-2);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
            color: var(--muted);
          }
          .premium-table-row {
            display: grid;
            grid-template-columns: 100px 100px 1.8fr 1.2fr 1.2fr 100px 120px;
            gap: 12px;
            align-items: center;
            padding: 14px 12px;
            border-bottom: 1px solid var(--line-soft);
            transition: background-color 0.2s ease;
          }
          .premium-table-row:hover {
            background-color: rgba(1, 88, 76, 0.02);
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 12px;
            white-space: nowrap;
          }
          .status-badge.paid {
            color: var(--green);
            background: rgba(40,167,69,0.08);
          }
          .status-badge.pending {
            color: #A06E00;
            background: rgba(255,179,0,0.08);
          }
          .status-badge.overdue {
            color: var(--neg);
            background: rgba(239,68,68,0.08);
          }
          .category-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 12px;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .category-dot {
            width: 6px;
            height: 6px;
            border-radius: 3px;
            flex-shrink: 0;
          }
          .account-badge {
            display: inline-flex;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 8px;
            white-space: nowrap;
          }
          .account-badge.active {
            color: var(--ink);
            background: var(--surface-2);
          }
          .account-badge.warning {
            color: #A06E00;
            background: rgba(255,179,0,0.08);
          }
          .account-badge.muted {
            color: var(--muted);
            background: rgba(0,0,0,0.03);
          }
          .action-btn {
            width: 28px;
            height: 28px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--line-soft);
            background: var(--surface);
            color: var(--muted);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .action-btn:hover {
            background: var(--surface-2);
            color: var(--ink);
            border-color: var(--line-strong);
          }
          .action-btn.check-btn {
            color: var(--green);
            border-color: rgba(40,167,69,0.2);
          }
          .action-btn.check-btn:hover {
            background: rgba(40,167,69,0.05);
            border-color: var(--green);
          }
          .spinner-small {
            width: 12px;
            height: 12px;
            border: 2px solid rgba(40, 167, 69, 0.2);
            border-top-color: var(--green);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .premium-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            background: var(--surface);
            border: 1px solid var(--line-soft);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            z-index: 100;
            min-width: 155px;
            padding: 4px;
            margin-top: 4px;
            display: flex;
            flex-direction: column;
          }
          .dropdown-item {
            background: none;
            border: none;
            padding: 8px 12px;
            font-size: 12px;
            text-align: left;
            cursor: pointer;
            color: var(--ink);
            display: flex;
            align-items: center;
            border-radius: 6px;
            width: 100%;
            font-weight: 500;
          }
          .dropdown-item:hover {
            background: var(--surface-2);
          }
          .dropdown-item.warning {
            color: var(--orange-ink);
          }
          .dropdown-item.danger {
            color: var(--neg);
          }
          .dropdown-item.danger:hover {
            background: rgba(239,68,68,0.05);
          }
          .premium-empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 48px 24px;
          }
          .premium-empty-state .icon-container {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: rgba(1, 88, 76, 0.03);
            border: 1px dashed rgba(13, 61, 55, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            color: var(--muted);
          }
          .premium-empty-state h3 {
            font-size: 15px;
            font-weight: 700;
            color: var(--teal-900);
            margin: 0 0 6px 0;
          }
          .premium-empty-state p {
            font-size: 12px;
            color: var(--muted);
            margin: 0 0 20px 0;
            max-width: 280px;
            line-height: 1.5;
          }
          .premium-empty-state .actions-row {
            display: flex;
            gap: 8px;
          }
          .tablet-only-inline {
            display: none;
          }
          .mobile-only {
            display: none !important;
          }
          @media (max-width: 767px) {
            .desktop-tablet-only {
              display: none !important;
            }
            .mobile-only {
              display: flex !important;
            }
            .premium-mobile-card {
              border: 1px solid var(--line-soft);
              border-radius: 12px;
              background: var(--surface);
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 12px;
              margin-bottom: 12px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.01);
              position: relative;
            }
            .mobile-top-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .mobile-desc-title {
              font-size: 13px;
              font-weight: 600;
              color: var(--ink);
            }
            .mobile-amount {
              font-size: 13px;
              font-weight: 700;
            }
            .mobile-amount.paid {
              color: var(--green);
            }
            .mobile-amount.pending {
              color: var(--teal-900);
            }
            .mobile-amount.overdue {
              color: var(--neg);
            }
            .mobile-meta-row {
              font-size: 11px;
              color: var(--muted);
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .cat-text {
              font-weight: 600;
            }
            .mobile-actions-row {
              display: flex;
              gap: 8px;
              position: relative;
            }
            .mobile-action-btn {
              font-size: 12px;
              font-weight: 600;
              padding: 6px 12px;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s ease;
              border: 1px solid var(--line-soft);
            }
            .mobile-action-btn.primary {
              background: var(--teal);
              color: white;
              border-color: var(--teal);
              flex: 2;
            }
            .mobile-action-btn.primary:hover {
              background: var(--teal-900);
            }
            .mobile-action-btn.secondary {
              background: var(--surface);
              color: var(--ink);
              flex: 1;
            }
            .mobile-action-btn.icon {
              background: var(--surface);
              color: var(--muted);
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              padding: 6px 0;
            }
          }
          @media (min-width: 768px) and (max-width: 1023px) {
            .premium-table-header {
              grid-template-columns: 100px 100px 1.8fr 100px 120px;
            }
            .premium-table-row {
              grid-template-columns: 100px 100px 1.8fr 100px 120px;
            }
            .col-cat, .col-acc, .cell-cat, .cell-acc {
              display: none !important;
            }
            .tablet-only-inline {
              display: inline;
            }
          }
        `}</style>
      </section>
        </div>
        <div className="receitas-rail-col">
          {/* Card Compacto: Receitas do Período */}
          <div className="compact-insight-card period-card">
            <div className="compact-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(1, 88, 76, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={14} className="compact-card-icon" />
                </div>
                <span className="compact-card-title">RECEITAS DO PERÍODO</span>
              </div>
              <CardInfoTooltip content="Mostra o total de receitas previstas no período." />
            </div>
            
            <div className="compact-card-body">
              <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 30, fontWeight: 800, color: 'var(--teal-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>
                R$ {brl(totalPeriodo)}
              </div>
              
              <div className="compact-progress-bar premium-bar">
                {propRecebido > 0 && <div style={{ width: `max(5px, ${propRecebido}%)`, backgroundColor: 'var(--green)' }} />}
                {propPendente > 0 && <div style={{ width: `max(5px, ${propPendente}%)`, backgroundColor: 'var(--gold)' }} />}
                {propAtrasado > 0 && <div style={{ width: `max(5px, ${propAtrasado}%)`, backgroundColor: 'var(--neg)' }} />}
              </div>
              
              <div className="compact-card-subtitle period-legend">
                {totalPeriodo <= 0 ? (
                  <span>Nenhuma receita prevista</span>
                ) : (
                  <>
                    <span className={hidden ? 'priv' : ''}>
                      <span className="legend-dot" style={{ background: 'var(--green)' }} /> R$ {brl(recebido)} recebido
                    </span>
                    <span className="legend-sep">·</span>
                    <span className={hidden ? 'priv' : ''}>
                      <span className="legend-dot" style={{ background: 'var(--gold)' }} /> R$ {brl(pendente)} pendente
                    </span>
                    {atrasado > 0 && (
                      <>
                        <span className="legend-sep">·</span>
                        <span className={hidden ? 'priv' : ''} style={{ color: 'var(--neg)' }}>
                          <span className="legend-dot" style={{ background: 'var(--neg)' }} /> R$ {brl(atrasado)} atrasado
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="compact-insight-footer">
              <button 
                className="compact-card-action premium-action"
                style={{ margin: 0 }}
                onClick={() => { setInsightDrawerType('period'); setInsightDrawerOpen(true); }}
                aria-label="Ver detalhes de Receitas do Período"
              >
                Ver mais <div className="action-icon-wrapper"><ChevronRight size={12} /></div>
              </button>
            </div>
          </div>

          {/* Card Compacto: Realização do Mês */}
          <div className="compact-insight-card period-card">
            {/* Header */}
            <div className="compact-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(245, 124, 0, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Percent size={14} style={{ color: 'var(--orange)' }} />
                </div>
                <span className="compact-card-title">REALIZAÇÃO DO MÊS</span>
              </div>
              <CardInfoTooltip content="Progresso do recebimento frente ao previsto." />
            </div>

            <div className="compact-card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 30, fontWeight: 800, color: 'var(--teal-900)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  {pctRealizacaoDisplayStr}%
                </div>
                <div style={{ background: realizacaoState.color === 'var(--neg)' ? 'rgba(239,68,68,0.1)' : realizacaoState.color === 'var(--green)' ? 'rgba(34,197,94,0.1)' : 'rgba(245, 124, 0, 0.08)', color: realizacaoState.color, padding: '4px 8px', borderRadius: 12, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
                  {realizacaoState.badgeText === 'Abaixo do esperado' ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                  {realizacaoState.badgeText}
                </div>
              </div>

              <div className="compact-progress-bar premium-bar">
                <div style={{ width: `max(4px, ${pctBar}%)`, height: '100%', background: realizacaoState.color, borderRadius: 3 }} />
              </div>

              <div className="compact-card-subtitle period-legend">
                <span className={hidden ? 'priv' : ''}>
                  <strong style={{ color: 'var(--teal-900)' }}>R$ {brl(recebido)}</strong> de <strong style={{ color: 'var(--teal-900)' }}>R$ {brl(totalPeriodo)}</strong> recebidos
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="compact-insight-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              {faltante > 0 ? (
                <div style={{ background: 'rgba(245, 124, 0, 0.08)', color: 'var(--orange-ink)', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} style={{ color: 'var(--orange)' }} /> Faltam <span className={hidden ? 'priv' : ''}>R$ {brl(faltante)}</span>
                </div>
              ) : (
                <div />
              )}
              <button 
                className="compact-card-action premium-action"
                style={{ margin: 0 }}
                onClick={() => { setInsightDrawerType('realization'); setInsightDrawerOpen(true); }}
                aria-label="Ver detalhes de Realização do Mês"
              >
                Ver mais <div className="action-icon-wrapper"><ChevronRight size={12} /></div>
              </button>
            </div>
          </div>

          {/* Card Compacto: Saúde da Receita */}
          <div className="compact-insight-card period-card">
            {/* Header */}
            <div className="compact-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(1, 88, 76, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HeartPulse size={14} style={{ color: 'var(--teal)' }} />
                </div>
                <span className="compact-card-title">SAÚDE DA RECEITA</span>
              </div>
              <CardInfoTooltip content="Qualidade geral e previsibilidade das entradas." />
            </div>
            
            {/* Body */}
            <div className="compact-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Top Section: Gauge + Badge/Description */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Circular Gauge */}
                <div style={{ width: 76, height: 76, position: 'relative', flexShrink: 0 }}>
                  <svg viewBox="0 0 76 76" style={{ width: 76, height: 76, transform: 'rotate(-90deg)' }}>
                    <circle cx="38" cy="38" r="31" fill="none" stroke="var(--surface-2)" strokeWidth="5.5" />
                    <circle 
                      cx="38" cy="38" r="31" fill="none" 
                      stroke={strokeColor} strokeWidth="5.5" 
                      strokeDasharray="194.78"
                      strokeDashoffset={`${194.78 * (1 - saudeMetrics.score / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', inset: 0 }}>
                    <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 21, fontWeight: 900, color: 'var(--teal-900)', lineHeight: 1 }}>{saudeMetrics.score}</span>
                    <span style={{ fontSize: 9.5, color: 'var(--muted)', fontWeight: 700, marginTop: 0.5 }}>/100</span>
                  </div>
                </div>

                {/* Status Badge + Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  {/* Status Badge */}
                  {(() => {
                    const getBadgeDetails = (status: string) => {
                      if (status === 'healthy') {
                        return {
                          text: 'SAUDÁVEL',
                          bg: 'rgba(40,167,69,0.08)',
                          color: 'var(--green)',
                          icon: <CheckCircle2 size={8} />
                        }
                      }
                      if (status === 'light_attention') {
                        return {
                          text: 'ATENÇÃO LEVE',
                          bg: 'rgba(255,179,0,0.08)',
                          color: '#A06E00',
                          icon: <AlertTriangle size={8} />
                        }
                      }
                      if (status === 'attention') {
                        return {
                          text: 'ATENÇÃO MODERADA',
                          bg: 'rgba(255,179,0,0.08)',
                          color: '#A06E00',
                          icon: <AlertTriangle size={8} />
                        }
                      }
                      if (status === 'critical') {
                        return {
                          text: 'CRÍTICO',
                          bg: 'rgba(239,68,68,0.08)',
                          color: 'var(--neg)',
                          icon: <AlertTriangle size={8} />
                        }
                      }
                      return {
                        text: 'SEM DADOS',
                        bg: 'var(--surface-2)',
                        color: 'var(--muted)',
                        icon: <Info size={8} />
                      }
                    }
                    const badge = getBadgeDetails(saudeMetrics.status)
                    return (
                      <span 
                        style={{ 
                          fontSize: 8, 
                          padding: '2px 6px', 
                          borderRadius: 6, 
                          fontWeight: 800, 
                          background: badge.bg, 
                          color: badge.color,
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 3, 
                          letterSpacing: '0.05em',
                          alignSelf: 'flex-start'
                        }}
                      >
                        {badge.icon}
                        {badge.text}
                      </span>
                    )
                  })()}

                  <p className="compact-card-subtitle" style={{ fontSize: 11.5, color: 'var(--ink)', fontWeight: 600, margin: 0, lineHeight: 1.3, whiteSpace: 'normal' }}>
                    {saudeMetrics.description}
                  </p>
                </div>
              </div>

              {/* Bottom Section: 3 Indicators */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {/* Previsibilidade */}
                {(() => {
                  const level = saudeMetrics.indicators.predictability.level
                  const isGood = level === 'good'
                  const isMedium = level === 'medium'
                  const color = isGood ? 'var(--green)' : isMedium ? '#A06E00' : 'var(--neg)'
                  const bg = isGood ? 'rgba(40,167,69,0.04)' : isMedium ? 'rgba(255,179,0,0.04)' : 'rgba(239,68,68,0.04)'
                  const text = isGood ? 'alta' : isMedium ? 'média' : 'baixa'
                  return (
                    <div style={{ background: bg, border: '1px solid rgba(0,0,0,0.02)', borderRadius: 10, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <div style={{ color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isGood ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Previsibilidade</span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: color, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{text}</span>
                      </div>
                    </div>
                  )
                })()}

                {/* Concentração */}
                {(() => {
                  const level = saudeMetrics.indicators.diversification.level
                  const isGood = level === 'good'
                  const isMedium = level === 'medium'
                  const color = isGood ? 'var(--green)' : isMedium ? '#A06E00' : 'var(--neg)'
                  const bg = isGood ? 'rgba(40,167,69,0.04)' : isMedium ? 'rgba(255,179,0,0.04)' : 'rgba(239,68,68,0.04)'
                  const text = isGood ? 'baixa' : isMedium ? 'moderada' : 'alta'
                  return (
                    <div style={{ background: bg, border: '1px solid rgba(0,0,0,0.02)', borderRadius: 10, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <div style={{ color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={11} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Concentração</span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: color, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{text}</span>
                      </div>
                    </div>
                  )
                })()}

                {/* Atrasos */}
                {(() => {
                  const level = saudeMetrics.indicators.delays.level
                  const isGood = level === 'good'
                  const isMedium = level === 'medium'
                  const color = isGood ? 'var(--green)' : isMedium ? '#A06E00' : 'var(--neg)'
                  const bg = isGood ? 'rgba(40,167,69,0.04)' : isMedium ? 'rgba(255,179,0,0.04)' : 'rgba(239,68,68,0.04)'
                  const text = isGood ? 'controlados' : isMedium ? 'leves' : 'graves'
                  return (
                    <div style={{ background: bg, border: '1px solid rgba(0,0,0,0.02)', borderRadius: 10, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <div style={{ color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle2 size={11} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Atrasos</span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: color, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{text}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="compact-insight-footer">
              <button 
                className="compact-card-action premium-action"
                style={{ margin: 0 }}
                onClick={() => { setInsightDrawerType('health'); setInsightDrawerOpen(true); }}
                aria-label="Ver detalhes de Saúde da Receita"
              >
                Ver mais <div className="action-icon-wrapper"><ChevronRight size={12} /></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- SEGUNDA DOBRA: ANÁLISES COMPLEMENTARES --- */}
      <div className="fd-grid fade-up" style={{ rowGap: 16, marginBottom: 16 }}>
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
              <CardInfoTooltip content="Mostra quanto a maior fonte representa da receita prevista no período." />
            </div>
            {catRanking.length > 0 ? (
              (() => {
                const topCat = catRanking[0];
                const pct = Math.round((topCat[1] / totalPeriodo) * 100);
                let statusText = 'Saudável';
                let statusColor = 'var(--teal)';
                let statusBg = 'rgba(1,88,76,0.1)';
                let msg = 'Receita bem distribuída.';
                if (pct > 70) {
                  statusText = 'Alta dependência';
                  statusColor = 'var(--neg)';
                  statusBg = 'rgba(239,68,68,0.1)';
                  msg = `concentra ${pct}% da receita prevista.`;
                } else if (pct > 40) {
                  statusText = 'Atenção';
                  statusColor = 'var(--orange-ink)';
                  statusBg = 'rgba(245,124,0,0.1)';
                  msg = 'tem peso relevante na sua renda.';
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
                      <strong>{topCat[0]}</strong> {msg}
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
            {hasPreviousHistory ? (
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 8px', textAlign: 'center' }}>
                <div style={{ background: 'rgba(13, 61, 55, 0.03)', border: '1px dashed rgba(13, 61, 55, 0.1)', borderRadius: '12px', padding: '10px', marginBottom: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarClock size={20} style={{ opacity: 0.5 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Ainda há pouco histórico
                </span>
                <p style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4, margin: 0, maxWidth: 180 }}>
                  Continue registrando receitas para comparar tendências.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- TERCEIRA DOBRA: OUTRAS ANÁLISES --- */}
      <div className="fd-grid fade-up" style={{ rowGap: 16 }}>
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

      {(showIncomeModal || editIncome) && (
        <PremiumIncomeModal
          income={editIncome}
          categories={categories}
          accounts={accounts}
          onClose={() => { setShowIncomeModal(false); setEditIncome(null) }}
          onSaved={handleSaved}
          onRequestNewCategory={() => {}}
          defaultDate={selectedMonth === new Date().toISOString().slice(0, 7) ? undefined : `${selectedMonth}-01`}
        />
      )}

      <IncomeInsightDrawer 
        isOpen={insightDrawerOpen} 
        onClose={() => setInsightDrawerOpen(false)}
        type={insightDrawerType}
        data={{
          period: { totalPeriodo, recebido, pendente, atrasado, propRecebido, propPendente, propAtrasado, periodoState, hidden, currentIncomes, categories },
          realization: { pctRealizacaoDisplayStr, realizacaoState, pctBar, recebido, totalPeriodo, faltante, hidden, currentIncomes, categories, atrasado, pendente, selectedMonth },
          health: { saudeMetrics, hidden, currentIncomes, selectedMonth, allIncomes, categories }
        }}
        onEdit={(inc) => { setEditIncome(inc); setInsightDrawerOpen(false); }}
        onToggle={handleToggleStatus}
        onViewAll={() => {
          setInsightDrawerOpen(false)
          const el = document.getElementById("detalhamento-entradas")
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          } else {
            window.scrollTo({ top: 400, behavior: 'smooth' })
          }
        }}
        onAdd={() => {
          setEditIncome({ income_type: 'fixed', is_recurring: true } as unknown as Income)
          setShowIncomeModal(true)
          setInsightDrawerOpen(false)
        }}
      />
    </div>
  )
}
