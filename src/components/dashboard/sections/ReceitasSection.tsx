'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, X, Pencil, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  ArrowDown, Search, Filter, CalendarClock, CheckCircle2, Sparkles, AlertCircle, AlertTriangle, Percent, PieChart, Copy, Users, Info,
  HeartPulse, Wallet, MoreHorizontal, Trash2, Check, Calendar, Shield,
  ShoppingCart, User, Globe, PiggyBank, Coins, DollarSign, CalendarDays,
  QrCode, ArrowRightLeft, Banknote, Barcode, Landmark, CreditCard, HelpCircle
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { CardInfoTooltip } from '@/components/ui/CardInfoTooltip'
import { getTransactionStatus } from '@/lib/utils'
import { calculateIncomeHealthScore } from '@/utils/financialHealth'
import { updateIncome, deleteIncome, getAllIncomes } from '@/app/dashboard/actions/incomes'
import { getIncomeCategories } from '@/app/dashboard/actions/income-categories'
import { getAccounts } from '@/app/dashboard/actions/accounts'
import type { Income, IncomeCategory, Account } from '@/types/database'
import { PremiumIncomeModal } from './PremiumIncomeModal'
import { DeleteRevenueModal } from './DeleteRevenueModal'
import { UnmarkRevenueModal } from './UnmarkRevenueModal'
import TransactionsFilterDrawer, { FilterState, defaultFilterState } from '@/components/dashboard/filters/TransactionsFilterDrawer'
import { IncomeInsightDrawer } from '@/components/dashboard/drawers/IncomeInsightDrawer'
import { buildRevenueAIModel, RevenueAICard } from './revenue-ai-card'

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

function formatShortDate(dStr: string) {
  return formatDate(dStr)
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

export function ReceitasSection({ hidden, onAsk }: { hidden: boolean; onAsk?: (question: string, context?: any) => void }) {
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

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; revenue: Income | null }>({ open: false, revenue: null })
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Unmark Modal
  const [unmarkModal, setUnmarkModal] = useState<{ open: boolean; revenue: Income | null }>({ open: false, revenue: null })
  const [isUpdatingRevenueStatus, setIsUpdatingRevenueStatus] = useState(false)
  const [unmarkError, setUnmarkError] = useState<string | null>(null)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)

  // State to track item being toggled
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  // State to track active menu row
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [openSwipeRowId, setOpenSwipeRowId] = useState<string | null>(null)

  // Group collapsing state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // Focus search input on keyboard "/" key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        const input = document.getElementById('search-incomes-input')
        input?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  function requestDelete(income: Income) {
    setDeleteModal({ open: true, revenue: income })
    setActiveMenuId(null)
    setOpenSwipeRowId(null)
  }

  function handleCloseDeleteModal() {
    if (isDeleting) return
    setDeleteModal(curr => ({ ...curr, open: false }))
  }

  async function handleConfirmDelete() {
    if (!deleteModal.revenue) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteIncome(deleteModal.revenue.id)
      await load() // atualiza listagem e KPIs
      setDeleteModal(curr => ({ ...curr, open: false }))
      // A receita não é removida daqui do state até a animação de saída concluir.
    } catch (err: unknown) {
      setDeleteError('Não foi possível excluir esta receita. Tente novamente.')
      setIsDeleting(false)
    }
  }

  function handleExitCompleteDelete() {
    setDeleteModal({ open: false, revenue: null })
    setIsDeleting(false)
    setDeleteError(null)
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

  function requestUnmark(income: Income) {
    setUnmarkModal({ open: true, revenue: income })
    setActiveMenuId(null)
    setOpenSwipeRowId(null)
  }

  function handleCloseUnmarkModal() {
    if (isUpdatingRevenueStatus) return
    setUnmarkModal(curr => ({ ...curr, open: false }))
  }

  async function handleConfirmUnmarkRevenue() {
    const income = unmarkModal.revenue
    if (!income) return
    setIsUpdatingRevenueStatus(true)
    setUnmarkError(null)

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
      setUnmarkModal(curr => ({ ...curr, open: false }))
    } catch (err: unknown) {
      setUnmarkError('Não foi possível desmarcar esta receita. Tente novamente.')
      setIsUpdatingRevenueStatus(false)
    }
  }

  function handleUnmarkModalExitComplete() {
    setUnmarkModal({ open: false, revenue: null })
    setIsUpdatingRevenueStatus(false)
    setUnmarkError(null)
  }

  function handleToggleStatusToUnpaid(income: Income) {
    requestUnmark(income)
  }

  // --- KPIs and Metrics (Based on Global selectedMonth) ---
  const currentIncomes = useMemo(() => allIncomes.filter(i => i.date.slice(0, 7) === selectedMonth), [allIncomes, selectedMonth])
  const totalPeriodo = currentIncomes.reduce((s, i) => s + Number(i.amount), 0)
  const recebido = currentIncomes.filter(i => getTransactionStatus(i.payment_status, i.date) === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const pendente = currentIncomes.filter(i => getTransactionStatus(i.payment_status, i.date) === 'pending').reduce((s, i) => s + Number(i.amount), 0)
  const atrasado = currentIncomes.filter(i => getTransactionStatus(i.payment_status, i.date) === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  const overdueCount = currentIncomes.filter(i => getTransactionStatus(i.payment_status, i.date) === 'overdue').length

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

  // Counts for each filter tab (Todas, Recebidas, Pendentes, Atrasadas)
  const tabCounts = useMemo(() => {
    const baseItems = allIncomes.filter(inc => {
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
      
      if (filterState.categoryId && filterState.categoryId !== 'all') {
        const cat = categories.find(c => c.id === filterState.categoryId)
        if (cat && inc.category !== cat.name) return false
      }

      if (filterState.accountId && filterState.accountId !== 'all') {
        if (inc.account_id !== filterState.accountId) return false
      }

      if (filterState.paymentMethod && filterState.paymentMethod !== 'all') {
        if (inc.income_method !== filterState.paymentMethod) return false
      }

      if (filterState.transactionType !== 'all' && inc.income_type !== filterState.transactionType) return false
      
      if (filterState.tags && filterState.tags.length > 0) {
        const incTags = inc.tags || []
        if (!filterState.tags.every(t => incTags.includes(t))) return false
      }

      if (filterState.minAmount) {
        const cleanMin = parseFloat(filterState.minAmount.replace(/\./g, '').replace(',', '.'))
        if (!isNaN(cleanMin) && Number(inc.amount) < cleanMin) return false
      }
      if (filterState.maxAmount) {
        const cleanMax = parseFloat(filterState.maxAmount.replace(/\./g, '').replace(',', '.'))
        if (!isNaN(cleanMax) && Number(inc.amount) > cleanMax) return false
      }

      return true
    })

    let all = 0, received = 0, pending = 0, overdue = 0
    baseItems.forEach(i => {
      all++
      const status = getTransactionStatus(i.payment_status, i.date)
      if (status === 'paid') received++
      else if (status === 'overdue') overdue++
      else pending++
    })

    return { all, received, pending, overdue }
  }, [allIncomes, searchQuery, filterState, selectedMonth, categories])

  // Upcoming Receipts calculations (sorted overdue first, limited to 3)
  const upcomingReceipts = useMemo(() => {
    const filtered = allIncomes.filter(inc => {
      if (inc.date.slice(0, 7) !== selectedMonth) return false
      const status = getTransactionStatus(inc.payment_status, inc.date)
      return status !== 'paid'
    })

    return filtered.sort((a, b) => {
      const statusA = getTransactionStatus(a.payment_status, a.date)
      const statusB = getTransactionStatus(b.payment_status, b.date)
      
      const isOverdueA = statusA === 'overdue'
      const isOverdueB = statusB === 'overdue'
      
      if (isOverdueA && !isOverdueB) return -1
      if (!isOverdueA && isOverdueB) return 1
      
      return a.date.localeCompare(b.date)
    }).slice(0, 3)
  }, [allIncomes, selectedMonth])

  // Total sum of displayed upcoming items
  const totalUpcomingAmount = useMemo(() => {
    return upcomingReceipts.reduce((s, i) => s + Number(i.amount), 0)
  }, [upcomingReceipts])

  // Interval range label calculation for footer
  const footerRangeLabel = useMemo(() => {
    if (upcomingReceipts.length === 0) return 'Neste mês'
    const hasOverdue = upcomingReceipts.some(inc => getTransactionStatus(inc.payment_status, inc.date) === 'overdue')
    
    const lastItem = upcomingReceipts[upcomingReceipts.length - 1]
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [y, m, d] = lastItem.date.split('-').map(Number)
    const targetDate = new Date(y, m - 1, d)
    targetDate.setHours(0, 0, 0, 0)
    
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) {
      return hasOverdue ? 'Atrasados / Pendentes' : 'Neste mês'
    }
    return `Próximos ${diffDays} dias`
  }, [upcomingReceipts])

  // Subtext priority resolver: 1. notes, 2. category, 3. income_method, 4. income_type, 5. empty
  function getUpcomingSubtext(item: Income) {
    if (item.notes && item.notes.trim()) {
      return item.notes.length > 25 ? item.notes.slice(0, 25) + '...' : item.notes
    }
    if (item.category && item.category.trim()) {
      return item.category
    }
    if (item.income_method) {
      const methods: Record<string, string> = {
        pix: 'Pix',
        transfer: 'TED',
        cash: 'Dinheiro',
        boleto: 'Boleto',
        deposit: 'Depósito',
        card: 'Cartão',
        other: 'Outro'
      }
      return methods[item.income_method] || item.income_method.toUpperCase()
    }
    if (item.income_type) {
      return item.income_type === 'fixed' ? 'Fixa' : 'Variável'
    }
    return ''
  }

  // Category Icon Mapper with secure Coins fallback
  function getCategoryIcon(category: string, description: string | null) {
    const name = ((description || '') + ' ' + (category || '')).toLowerCase()
    if (name.includes('venda') || name.includes('comércio') || name.includes('loja') || name.includes('e-commerce') || name.includes('produto') || name.includes('mercado') || name.includes('shopping')) {
      return ShoppingCart
    }
    if (name.includes('consultoria') || name.includes('serviço') || name.includes('aula') || name.includes('curso') || name.includes('mentor') || name.includes('suporte')) {
      return User
    }
    if (name.includes('freela') || name.includes('desenvolvimento') || name.includes('site') || name.includes('plataforma') || name.includes('app') || name.includes('sistema') || name.includes('globe') || name.includes('web')) {
      return Globe
    }
    if (name.includes('investimento') || name.includes('dividendo') || name.includes('rendimento') || name.includes('ações') || name.includes('fii') || name.includes('tesouro') || name.includes('poupanca')) {
      return PiggyBank
    }
    return Coins
  }

  function getRelativeDateLabel(dateStr: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const [y, m, d] = dateStr.split('-').map(Number)
    const targetDate = new Date(y, m - 1, d)
    targetDate.setHours(0, 0, 0, 0)
    
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      const days = Math.abs(diffDays)
      return { 
        label: `Atrasado há ${days} dia${days > 1 ? 's' : ''}`, 
        color: 'var(--neg)', 
        bg: 'rgba(239, 68, 68, 0.08)',
        valueColor: 'var(--neg)'
      }
    }
    if (diffDays === 0) {
      return { 
        label: 'Hoje', 
        color: 'var(--orange-ink)', 
        bg: 'rgba(245, 124, 0, 0.08)',
        valueColor: 'var(--orange-ink)'
      }
    }
    if (diffDays === 1) {
      return { 
        label: 'Amanhã', 
        color: 'var(--teal-900)', 
        bg: 'rgba(1, 88, 76, 0.08)',
        valueColor: 'var(--teal-900)'
      }
    }
    return { 
      label: `Em ${diffDays} dias`, 
      color: 'var(--muted)', 
      bg: 'rgba(0, 0, 0, 0.04)',
      valueColor: 'var(--teal-900)'
    }
  }

  // Pagination calculations
  const ITEMS_PER_PAGE = 4
  const totalItems = filteredIncomes.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const activePage = Math.min(currentPage, totalPages)

  const pageNumbers = useMemo(() => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      if (activePage > 3) pages.push('ellipsis')
      
      const start = Math.max(2, activePage - 1)
      const end = Math.min(totalPages - 1, activePage + 1)
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (activePage < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }, [totalPages, activePage])

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

  const incomeConcentrationPercentage = useMemo(() => {
    if (totalPeriodo === 0 || catRanking.length === 0) return 0
    return Math.round((catRanking[0][1] / totalPeriodo) * 100)
  }, [totalPeriodo, catRanking])

  const comparisonWithPreviousMonth = useMemo(() => {
    if (history4m.length < 2) return 0
    const lastMonth = history4m[1]?.total || 0
    if (lastMonth === 0) return 0
    return Math.round(((totalPeriodo - lastMonth) / lastMonth) * 100)
  }, [totalPeriodo, history4m])

  const revenueAIModel = useMemo(() => {
    return buildRevenueAIModel({
      hasRevenueData: allIncomes.length > 0,
      totalPeriodo,
      recebido,
      pendente,
      atrasado,
      overdueCount,
      pctRealizacaoRaw,
      saudeScore: saudeMetrics.score,
      incomeConcentrationPercentage,
      comparisonWithPreviousMonth
    })
  }, [allIncomes.length, totalPeriodo, recebido, pendente, atrasado, overdueCount, pctRealizacaoRaw, saudeMetrics.score, incomeConcentrationPercentage, comparisonWithPreviousMonth])

  const revenueAIContextPayload = useMemo(() => ({
    source: 'revenue-ai-card' as const,
    tone: revenueAIModel.tone,
    period: selectedMonth,
    expectedAmount: totalPeriodo,
    receivedAmount: recebido,
    pendingAmount: pendente,
    pendingPercentage: totalPeriodo > 0 ? (pendente / totalPeriodo) * 100 : 0,
    overdueAmount: atrasado,
    overdueCount,
    realizationPercentage: pctRealizacaoRaw,
    incomeConcentrationPercentage,
    comparisonWithPreviousMonth
  }), [revenueAIModel.tone, selectedMonth, totalPeriodo, recebido, pendente, atrasado, overdueCount, pctRealizacaoRaw, incomeConcentrationPercentage, comparisonWithPreviousMonth])


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
      <section id="detalhamento-entradas" className="card fade-up" style={{ 
        padding: '24px 20px', 
        overflow: 'hidden', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: '#FCFAF8',
        border: '1px solid var(--line-soft)',
        borderRadius: '24px',
        boxShadow: '0 4px 24px -4px rgba(13, 61, 55, 0.04)'
      }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 12, 
                background: 'var(--teal)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(1, 88, 76, 0.15)'
              }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Detalhamento das Entradas</h2>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0 0' }}>Acompanhe todas as entradas registradas no período.</p>
              </div>
            </div>
          </div>
          
          <div className="filter-bar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid var(--line-soft)', marginBottom: 16 }}>
            <div className="search-wrapper" style={{
              position: 'relative',
              flex: '1 1 200px',
              maxWidth: 300
            }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                id="search-incomes-input"
                placeholder="Buscar receita..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  borderRadius: 99,
                  border: '1px solid var(--line)',
                  padding: '8px 36px 8px 34px',
                  fontSize: 13,
                  color: 'var(--ink)',
                  outline: 'none',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease'
                }}
              />
              <span className="search-shortcut" style={{
                position: 'absolute',
                right: searchQuery ? 28 : 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--faint)',
                background: 'var(--surface-2)',
                border: '1px solid var(--line-soft)',
                padding: '1px 5px',
                borderRadius: 4,
                pointerEvents: 'none'
              }}>/</span>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: 2,
                  color: 'var(--muted)'
                }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="hide-scrollbar">
              {[
                { key: 'all', label: 'Todas', count: tabCounts.all },
                { key: 'received', label: 'Recebidas', count: tabCounts.received },
                { key: 'pending', label: 'Pendentes', count: tabCounts.pending },
                { key: 'overdue', label: 'Atrasadas', count: tabCounts.overdue },
              ].map(chip => {
                const isActive = statusTab === chip.key
                return (
                  <button
                    key={chip.key}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 99,
                      background: isActive ? 'var(--teal-900)' : 'var(--surface)',
                      color: isActive ? 'white' : 'var(--muted)',
                      border: isActive ? '1px solid var(--teal-900)' : '1px solid var(--line-soft)',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? 'var(--shadow-sm)' : 'none'
                    }}
                    onClick={() => setStatusTab(chip.key as any)}
                  >
                    <span>{chip.label}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 99,
                      background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'var(--surface-2)',
                      color: isActive ? 'white' : 'var(--ink)'
                    }}>
                      {chip.count}
                    </span>
                  </button>
                )
              })}
            </div>
            
            <button 
              className="btn-secondary" 
              style={{
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 99,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: activeFilterCount > 0 ? 'rgba(1, 88, 76, 0.08)' : 'var(--surface)',
                color: activeFilterCount > 0 ? 'var(--teal-900)' : 'var(--ink)',
                border: '1px solid var(--line)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
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
            <div style={{ display: 'flex', gap: 6, padding: '0 0 16px 0', borderBottom: '1px solid var(--line-soft)', flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>Filtros ativos:</span>
              {filterState.period !== 'global' && (
                <div className="filter-pill" style={{ fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '2px 8px', borderRadius: 12, color: 'var(--muted)' }}>
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
                <div className="filter-pill" style={{ fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '2px 8px', borderRadius: 12, color: 'var(--muted)' }}>
                  Categoria: {categories.find(c => c.id === filterState.categoryId)?.name || filterState.categoryId}
                </div>
              )}
              {filterState.accountId && filterState.accountId !== 'all' && (
                <div className="filter-pill" style={{ fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '2px 8px', borderRadius: 12, color: 'var(--muted)' }}>
                  Conta: {accounts.find(a => a.id === filterState.accountId)?.name || filterState.accountId}
                </div>
              )}
              {filterState.paymentMethod && filterState.paymentMethod !== 'all' && (
                <div className="filter-pill" style={{ fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '2px 8px', borderRadius: 12, color: 'var(--muted)' }}>
                  Método: {
                    filterState.paymentMethod === 'pix' ? 'Pix' :
                    filterState.paymentMethod === 'boleto' ? 'Boleto' :
                    filterState.paymentMethod === 'credit_card' ? 'Cartão de Crédito' :
                    filterState.paymentMethod === 'money' ? 'Dinheiro' :
                    filterState.paymentMethod === 'transfer' ? 'Transferência' :
                    filterState.paymentMethod === 'deposit' ? 'Depósito' :
                    filterState.paymentMethod === 'other' ? 'Outro' :
                    filterState.paymentMethod
                  }
                </div>
              )}
              {filterState.transactionType !== 'all' && (
                <div className="filter-pill" style={{ fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '2px 8px', borderRadius: 12, color: 'var(--muted)' }}>
                  Tipo: {filterState.transactionType === 'fixed' ? 'Fixa' : 'Variável'}
                </div>
              )}
              {filterState.tags && filterState.tags.length > 0 && (
                <div className="filter-pill" style={{ fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '2px 8px', borderRadius: 12, color: 'var(--muted)' }}>
                  Tags: {filterState.tags.join(', ')}
                </div>
              )}
              {(filterState.minAmount || filterState.maxAmount) && (
                <div className="filter-pill" style={{ fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', padding: '2px 8px', borderRadius: 12, color: 'var(--muted)' }}>
                  Valor: {filterState.minAmount ? `>= R$ ${filterState.minAmount}` : ''} {filterState.maxAmount ? `<= R$ ${filterState.maxAmount}` : ''}
                </div>
              )}
              <button style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--orange)', cursor: 'pointer', fontWeight: 600, padding: '2px 6px' }} onClick={() => setFilterState(defaultFilterState)}>Limpar</button>
            </div>
          )}

          {/* Intelligent Summary below Toolbar */}
          <div className="intelligent-summary" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            background: 'var(--surface)',
            border: '1px solid var(--line-soft)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-sm)',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(1, 88, 76, 0.05)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CalendarClock size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  {filteredIncomes.length} resultado{filteredIncomes.length !== 1 ? 's' : ''} encontrado{filteredIncomes.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Mostrando {filteredIncomes.length > 0 ? `${Math.min(totalItems, (activePage - 1) * ITEMS_PER_PAGE + 1)}–${Math.min(totalItems, activePage * ITEMS_PER_PAGE)}` : '0'} de {totalItems} receitas
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="summary-stats-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Filtrado</span>
                  <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 15, fontWeight: 800, color: 'var(--teal-900)' }}>
                    R$ {brl(filteredIncomes.reduce((s, i) => s + Number(i.amount), 0))}
                  </span>
                </div>
                
                {filteredIncomes.length > 0 && (
                  <>
                    <div style={{ width: 1, height: 28, background: 'var(--line)' }} className="summary-divider" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }} className="summary-media-col">
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Média por Entrada</span>
                      <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 15, fontWeight: 800, color: 'var(--teal-900)' }}>
                        R$ {brl(filteredIncomes.reduce((s, i) => s + Number(i.amount), 0) / filteredIncomes.length)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }} className="hide-scrollbar">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 8 }}>
              <div className="spinner-small" style={{ width: 18, height: 18, borderTopColor: 'var(--teal)' }} />
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Carregando...</p>
            </div>
          ) : filteredIncomes.length === 0 ? (
            searchQuery.trim() || activeFilterCount > 0 ? (
              <div className="premium-empty-state" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '48px 24px',
                background: 'var(--surface)',
                border: '1px dashed var(--line)',
                borderRadius: '16px',
                margin: '20px 0'
              }}>
                <div className="icon-container" style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'rgba(1, 88, 76, 0.03)',
                  border: '1px dashed rgba(13, 61, 55, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  color: 'var(--muted)'
                }}>
                  <Search size={24} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal-900)', margin: '0 0 6px 0' }}>Nenhuma entrada encontrada</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 20px 0', maxWidth: 280, lineHeight: 1.5 }}>
                  Ajuste a busca ou limpe os filtros para visualizar seus lançamentos.
                </p>
                <div className="actions-row" style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 99,
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }} onClick={() => { setSearchQuery(''); setFilterState(defaultFilterState); }}>Limpar filtros</button>
                  <button className="btn-primary" style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 99,
                    background: 'var(--teal)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(1, 88, 76, 0.15)'
                  }} onClick={() => setShowIncomeModal(true)}>Nova receita</button>
                </div>
              </div>
            ) : (
              <div className="premium-empty-state" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '48px 24px',
                background: 'var(--surface)',
                border: '1px dashed var(--line)',
                borderRadius: '16px',
                margin: '20px 0'
              }}>
                <div className="icon-container" style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'rgba(1, 88, 76, 0.03)',
                  border: '1px dashed rgba(13, 61, 55, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  color: 'var(--muted)'
                }}>
                  <CalendarClock size={24} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal-900)', margin: '0 0 6px 0' }}>Nenhuma entrada cadastrada</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 20px 0', maxWidth: 280, lineHeight: 1.5 }}>
                  Cadastre uma receita para acompanhar seus recebimentos neste mês.
                </p>
                <div className="actions-row" style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 99,
                    background: 'var(--teal)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(1, 88, 76, 0.15)'
                  }} onClick={() => setShowIncomeModal(true)}>Nova receita</button>
                </div>
              </div>
            )
          ) : (
            <div className="premium-list-container">
              {/* Header removido em favor dos cards auto-explicativos */}

              <div className="premium-rows-container">
                {groupedIncomes.map(group => {
                  const isCollapsed = collapsedGroups[group.date] ?? false
                  const groupTotal = group.items.reduce((s, i) => s + Number(i.amount), 0)
                  return (
                    <div key={group.date} className="date-group-card">
                      <div className="group-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: 'transparent',
                        borderBottom: isCollapsed ? 'none' : '1px solid var(--line-soft)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background 0.2s ease'
                      }} onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.date]: !isCollapsed }))}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: '#073F36',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(7, 63, 54, 0.15)'
                          }}>
                            <Calendar size={16} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="group-date" style={{ fontSize: 15, fontWeight: 700, color: '#133C36' }}>
                              {formatGroupDate(group.date)}
                            </span>
                            <div className="group-summary-subtitle" style={{ fontSize: 12, color: '#71817E', marginTop: 1 }}>
                              {group.items.length} receita{group.items.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#71817E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total do dia</span>
                            <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 15, fontWeight: 700, color: '#133C36', marginTop: 1 }}>
                              R$ {brl(groupTotal)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'white', border: '1px solid var(--line-soft)', color: '#133C36', boxShadow: '0 2px 8px rgba(19, 60, 54, 0.04)' }}>
                            {isCollapsed ? <ChevronRight size={14} /> : <ArrowDown size={14} />}
                          </div>
                        </div>
                      </div>
                      
                      {!isCollapsed && (
                        <div className="group-items">
                          {group.items.map(item => {
                            const cat = categories.find(c => c.name === item.category)
                            const catColor = cat?.color ?? '#90A4AE'
                            const status = getTransactionStatus(item.payment_status, item.date)
                            const account = accounts.find(a => a.id === item.account_id)
                            
                            // details for subtext
                            const descriptionSubtext = status === 'paid' 
                              ? `Recebido em ${item.received_at ? formatShortDate(item.received_at) : formatShortDate(item.date)}` 
                              : status === 'overdue' 
                                ? `Venceu em ${formatShortDate(item.date)}` 
                                : `Previsto para ${formatShortDate(item.date)}`
                            
                            let valSub = ''
                            if (item.installment_number) valSub = `Parcela ${item.installment_number}/${item.installments_total}`
                            else if (item.is_recurring) valSub = 'Recorrente'
                            
                            return (
                                <div key={item.id}>
                                  {/* Desktop/Tablet Row */}
                                  <div className="swipeable-container desktop-tablet-only">
                                    <div className="swipe-actions-bg">
                                      {status !== 'paid' ? (
                                        <button 
                                          className="swipe-action-btn check"
                                          onClick={() => handleToggleStatus(item)}
                                          disabled={savingItemId !== null}
                                        >
                                          {savingItemId === item.id ? <div className="spinner-small" style={{ borderTopColor: 'white' }} /> : <CheckCircle2 size={16} />}
                                          <span>Receber</span>
                                        </button>
                                      ) : (
                                        <button 
                                          className="swipe-action-btn uncheck"
                                          onClick={() => handleToggleStatusToUnpaid(item)}
                                          disabled={savingItemId !== null}
                                        >
                                          {savingItemId === item.id ? <div className="spinner-small" style={{ borderTopColor: 'white' }} /> : <X size={16} />}
                                          <span>Desmarcar</span>
                                        </button>
                                      )}
                                      <button 
                                        className="swipe-action-btn edit"
                                        onClick={() => setEditIncome(item)}
                                      >
                                        <Pencil size={16} />
                                        <span>Editar</span>
                                      </button>
                                      <button 
                                        className="swipe-action-btn delete"
                                        onClick={() => {
                                          requestDelete(item)
                                        }}
                                      >
                                        <Trash2 size={16} />
                                        <span>Excluir</span>
                                      </button>
                                    </div>

                                    <motion.div 
                                      drag="x"
                                      dragDirectionLock
                                      dragConstraints={{ left: -180, right: 0 }}
                                      dragElastic={{ left: 0.1, right: 0.1 }}
                                      animate={{ x: openSwipeRowId === item.id ? -180 : 0 }}
                                      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                                      onDragEnd={(event, info) => {
                                        if (info.offset.x < -60) {
                                          setOpenSwipeRowId(item.id)
                                        } else if (info.offset.x > 60) {
                                          setOpenSwipeRowId(null)
                                        } else {
                                          if (info.velocity.x < -100) {
                                            setOpenSwipeRowId(item.id)
                                          } else if (info.velocity.x > 100) {
                                            setOpenSwipeRowId(null)
                                          }
                                        }
                                      }}
                                      onClick={() => setOpenSwipeRowId(openSwipeRowId === item.id ? null : item.id)}
                                      className="premium-table-row swipe-front-row"
                                      style={{
                                        borderLeft: status === 'pending'
                                          ? '3.5px solid var(--gold)'
                                          : status === 'overdue'
                                            ? '3.5px solid var(--neg)'
                                            : '3.5px solid transparent',
                                        backgroundColor: 'var(--surface)',
                                        backgroundImage: status === 'pending'
                                          ? 'linear-gradient(rgba(255, 179, 0, 0.03), rgba(255, 179, 0, 0.03))'
                                          : status === 'overdue'
                                            ? 'linear-gradient(rgba(239, 68, 68, 0.03), rgba(239, 68, 68, 0.03))'
                                            : 'none'
                                      }}
                                    >
                                      <div className="cell-sit" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                                        <span className={`status-badge-premium ${status}`} style={{ width: '100%', justifyContent: 'center' }}>
                                          {status === 'paid' && '✓ Recebido'}
                                          {status === 'pending' && '○ Pendente'}
                                          {status === 'overdue' && '! Atrasado'}
                                        </span>
                                        <span className="status-badge-premium variable" style={{ width: '100%', justifyContent: 'center', background: 'var(--orange-soft, #FFF5EB)', color: 'var(--orange, #E97819)' }}>
                                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange, #E97819)' }} />
                                          {item.income_type === 'fixed' ? 'Fixa' : 'Variável'}
                                        </span>
                                      </div>
                                      
                                      <div style={{ width: 1, alignSelf: 'stretch', height: 'auto', background: '#EDE5D9', margin: '12px 0' }} />

                                      <div className="cell-desc" style={{ paddingLeft: 8 }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#133C36', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.description || item.category}>
                                          {item.description || item.category}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#71817E', marginTop: 4 }}>
                                          {descriptionSubtext}
                                        </div>
                                      </div>

                                      <div className="cell-cat" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                                        <span className="category-badge-premium" style={{ backgroundColor: catColor + '10', color: catColor }}>
                                          {cat?.icon ? (
                                            (() => {
                                              const IconComp = (LucideIcons as any)[cat.icon]
                                              return IconComp ? <IconComp size={12} strokeWidth={3} /> : <span className="category-dot" style={{ backgroundColor: catColor }} />
                                            })()
                                          ) : (
                                            <span className="category-dot" style={{ backgroundColor: catColor }} />
                                          )}
                                          {item.category}
                                        </span>
                                        {item.income_method && (
                                         <span className="method-badge-premium" style={{ background: 'var(--surface-2)', border: '1px solid #EDE5D9', color: '#71817E' }}>
                                           <div style={{ width: 12, display: 'flex', justifyContent: 'center' }}>
                                             {item.income_method === 'pix' ? <QrCode size={10} /> :
                                              item.income_method === 'transfer' ? <ArrowRightLeft size={10} /> :
                                              item.income_method === 'cash' ? <Banknote size={10} /> :
                                              item.income_method === 'boleto' ? <Barcode size={10} /> :
                                              item.income_method === 'deposit' ? <Landmark size={10} /> :
                                              item.income_method === 'card' ? <CreditCard size={10} /> :
                                              item.income_method === 'other' ? <Plus size={10} /> :
                                              <HelpCircle size={10} />}
                                           </div>
                                           {item.income_method === 'pix' ? 'Pix' :
                                            item.income_method === 'transfer' ? 'TED' :
                                            item.income_method === 'cash' ? 'Dinheiro' :
                                            item.income_method === 'boleto' ? 'Boleto' :
                                            item.income_method === 'deposit' ? 'Depósito' :
                                            item.income_method === 'card' ? 'Cartão' :
                                            item.income_method === 'other' ? 'Outro' :
                                            item.income_method}
                                         </span>
                                        )}
                                      </div>

                                      <div className="cell-acc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {item.account_id ? (
                                          account ? (
                                            <span className="account-badge-premium active" style={{ background: 'transparent', border: '1px solid #EDE5D9', color: '#133C36' }}>
                                              <Wallet size={12} style={{ color: '#8A05BE' }} />
                                              {account.name}
                                            </span>
                                          ) : (
                                            <span className="account-badge-premium warning">
                                              <AlertTriangle size={12} />
                                              Conta não encontrada
                                            </span>
                                          )
                                        ) : (
                                          <span className="account-badge-premium warning">
                                            <Shield size={12} />
                                            Sem conta
                                          </span>
                                        )}
                                      </div>

                                      <div className="cell-val" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                                        <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 16, fontWeight: 700, color: status === 'paid' ? '#16A34A' : status === 'overdue' ? '#DC503C' : '#D99800' }}>
                                          + R$ {brl(Number(item.amount))}
                                        </div>
                                        {valSub && (
                                          <div style={{ fontSize: 11, color: '#71817E', marginTop: 4 }}>{valSub}</div>
                                        )}
                                      </div>
                                      </motion.div>
                                  </div>

                                  {/* Mobile Card */}
                                  <div className="swipeable-container mobile-only">
                                    <div className="swipe-actions-bg">
                                      {status !== 'paid' ? (
                                        <button 
                                          className="swipe-action-btn check"
                                          onClick={() => handleToggleStatus(item)}
                                          disabled={savingItemId !== null}
                                        >
                                          {savingItemId === item.id ? <div className="spinner-small" style={{ borderTopColor: 'white' }} /> : <CheckCircle2 size={16} />}
                                          <span>Receber</span>
                                        </button>
                                      ) : (
                                        <button 
                                          className="swipe-action-btn uncheck"
                                          onClick={() => handleToggleStatusToUnpaid(item)}
                                          disabled={savingItemId !== null}
                                        >
                                          {savingItemId === item.id ? <div className="spinner-small" style={{ borderTopColor: 'white' }} /> : <X size={16} />}
                                          <span>Desmarcar</span>
                                        </button>
                                      )}
                                      <button 
                                        className="swipe-action-btn edit"
                                        onClick={() => setEditIncome(item)}
                                      >
                                        <Pencil size={16} />
                                        <span>Editar</span>
                                      </button>
                                      <button 
                                        className="swipe-action-btn delete"
                                        onClick={() => {
                                          requestDelete(item)
                                        }}
                                      >
                                        <Trash2 size={16} />
                                        <span>Excluir</span>
                                      </button>
                                    </div>

                                    <motion.div 
                                      drag="x"
                                      dragDirectionLock
                                      dragConstraints={{ left: -180, right: 0 }}
                                      dragElastic={{ left: 0.1, right: 0.1 }}
                                      animate={{ x: openSwipeRowId === item.id ? -180 : 0 }}
                                      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                                      onDragEnd={(event, info) => {
                                        if (info.offset.x < -60) {
                                          setOpenSwipeRowId(item.id)
                                        } else if (info.offset.x > 60) {
                                          setOpenSwipeRowId(null)
                                        } else {
                                          if (info.velocity.x < -100) {
                                            setOpenSwipeRowId(item.id)
                                          } else if (info.velocity.x > 100) {
                                            setOpenSwipeRowId(null)
                                          }
                                        }
                                      }}
                                      className="premium-mobile-card swipe-front-row"
                                      style={{
                                        borderLeft: status === 'pending'
                                          ? '4px solid var(--gold)'
                                          : status === 'overdue'
                                            ? '4px solid var(--neg)'
                                            : '1px solid var(--line-soft)',
                                        backgroundColor: 'var(--surface)',
                                        backgroundImage: status === 'pending'
                                          ? 'linear-gradient(rgba(255, 179, 0, 0.03), rgba(255, 179, 0, 0.03))'
                                          : status === 'overdue'
                                            ? 'linear-gradient(rgba(239, 68, 68, 0.03), rgba(239, 68, 68, 0.03))'
                                            : 'none'
                                      }}
                                    >
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        {/* Top row: Status, Nature and Value */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span className={`status-badge-premium ${status}`} style={{ padding: '4px 10px' }}>
                                              {status === 'paid' && '✓ Recebido'}
                                              {status === 'pending' && '○ Pendente'}
                                              {status === 'overdue' && '! Atrasado'}
                                            </span>
                                            <span className="status-badge-premium variable" style={{ padding: '4px 10px', background: 'var(--orange-soft, #FFF5EB)', color: 'var(--orange, #E97819)' }}>
                                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange, #E97819)' }} />
                                              {item.income_type === 'fixed' ? 'Fixa' : 'Variável'}
                                            </span>
                                          </div>
                                          <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 16, fontWeight: 700, color: status === 'paid' ? '#16A34A' : status === 'overdue' ? '#DC503C' : '#D99800', textAlign: 'right' }}>
                                            + R$ {brl(Number(item.amount))}
                                            {valSub && <div style={{ fontSize: 11, color: '#71817E', marginTop: 2, fontWeight: 500 }}>{valSub}</div>}
                                          </div>
                                        </div>
                                        
                                        {/* Middle: Desc and Date */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                          <span style={{ fontSize: 15, fontWeight: 700, color: '#133C36' }}>
                                            {item.description || item.category}
                                          </span>
                                          <span style={{ fontSize: 12, color: '#71817E' }}>
                                            {descriptionSubtext}
                                          </span>
                                        </div>

                                        {/* Bottom row: Category, Method, Account */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: 'transparent', padding: 0 }}>
                                          <span className="category-badge-premium" style={{ backgroundColor: catColor + '10', color: catColor }}>
                                            {cat?.icon ? (
                                              (() => {
                                                const IconComp = (LucideIcons as any)[cat.icon]
                                                return IconComp ? <IconComp size={12} strokeWidth={3} /> : <span className="category-dot" style={{ backgroundColor: catColor }} />
                                              })()
                                            ) : (
                                              <span className="category-dot" style={{ backgroundColor: catColor }} />
                                            )}
                                            {item.category}
                                          </span>
                                          {item.income_method && (
                                           <span className="method-badge-premium" style={{ background: 'var(--surface-2)', border: '1px solid #EDE5D9', color: '#71817E' }}>
                                             <div style={{ width: 12, display: 'flex', justifyContent: 'center' }}>
                                               {item.income_method === 'pix' ? <QrCode size={10} /> :
                                                item.income_method === 'transfer' ? <ArrowRightLeft size={10} /> :
                                                item.income_method === 'cash' ? <Banknote size={10} /> :
                                                item.income_method === 'boleto' ? <Barcode size={10} /> :
                                                item.income_method === 'deposit' ? <Landmark size={10} /> :
                                                item.income_method === 'card' ? <CreditCard size={10} /> :
                                                item.income_method === 'other' ? <Plus size={10} /> :
                                                <HelpCircle size={10} />}
                                             </div>
                                             {item.income_method === 'pix' ? 'Pix' :
                                              item.income_method === 'transfer' ? 'TED' :
                                              item.income_method === 'cash' ? 'Dinheiro' :
                                              item.income_method === 'boleto' ? 'Boleto' :
                                              item.income_method === 'deposit' ? 'Depósito' :
                                              item.income_method === 'card' ? 'Cartão' :
                                              item.income_method === 'other' ? 'Outro' :
                                              item.income_method}
                                           </span>
                                          )}
                                          {item.account_id ? (
                                            account ? (
                                              <span className="account-badge-premium active" style={{ background: 'transparent', border: '1px solid #EDE5D9', color: '#133C36' }}>
                                                <Wallet size={12} style={{ color: '#8A05BE' }} />
                                                {account.name}
                                              </span>
                                            ) : (
                                              <span className="account-badge-premium warning">
                                                <AlertTriangle size={12} />
                                                Conta não encontrada
                                              </span>
                                            )
                                          ) : (
                                            <span className="account-badge-premium warning">
                                              <Shield size={12} />
                                              Sem conta
                                            </span>
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
                                              requestDelete(item)
                                              setActiveMenuId(null)
                                            }}>
                                              <Trash2 size={13} style={{ marginRight: 6 }} /> Excluir
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  </div>
                                </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(0,0,0,0.01)', borderRadius: '0 0 24px 24px' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
              Mostrando {Math.min(totalItems, (activePage - 1) * ITEMS_PER_PAGE + 1)}–{Math.min(totalItems, activePage * ITEMS_PER_PAGE)} de {totalItems} receitas
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button 
                className="pagination-btn" 
                disabled={activePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                title="Página anterior"
              >
                <ChevronLeft size={15} />
              </button>
              
              {pageNumbers.map((page, index) => {
                if (page === 'ellipsis') {
                  return (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                      ...
                    </span>
                  )
                }
                
                return (
                  <button
                    key={page}
                    className={`pagination-btn ${activePage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page as number)}
                  >
                    {page}
                  </button>
                )
              })}

              <button 
                className="pagination-btn" 
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                title="Próxima página"
              >
                <ChevronRight size={15} />
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
          /* Pagination styles */
          .pagination-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 99px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            background: var(--surface);
            color: var(--ink);
            border: 1px solid var(--line-soft);
            font-family: inherit;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: var(--shadow-sm);
          }
          .pagination-btn:hover:not(:disabled) {
            background: var(--surface-2);
            color: var(--teal-900);
            border-color: rgba(13, 61, 55, 0.2);
            transform: translateY(-1px);
          }
          .pagination-btn.active {
            background: var(--teal-900);
            color: white !important;
            border-color: var(--teal-900) !important;
            box-shadow: 0 4px 12px rgba(13, 61, 55, 0.18);
            transform: translateY(0) !important;
          }
          .pagination-btn.active:hover {
            transform: translateY(0) !important;
            background: var(--teal-900);
            border-color: var(--teal-900) !important;
            color: white !important;
          }
          .pagination-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            background: var(--surface-2);
            border-color: var(--line-soft);
            color: var(--muted);
            box-shadow: none;
            transform: none !important;
          }
          .pagination-ellipsis {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            color: var(--muted);
            font-size: 13px;
            font-weight: 600;
          }
          .premium-table-header {
            display: grid;
            grid-template-columns: 120px 2fr 1.2fr 1.2fr 100px 120px;
            gap: 12px;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid var(--line-soft);
            font-size: 11px;
            font-weight: 700;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(0,0,0,0.01);
          }
          .group-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            background: var(--surface-2);
            border-bottom: 1px solid var(--line-soft);
            cursor: pointer;
            user-select: none;
            transition: background 0.2s ease;
          }
          .group-header:hover {
            background: rgba(1, 88, 76, 0.02);
          }
          .group-date {
            text-transform: capitalize;
            font-weight: 700;
            color: var(--ink);
          }
          .date-group-card {
            background: #FFFCF8;
            border: 1px solid #EDE5D9;
            border-radius: 22px;
            box-shadow: 0 8px 28px rgba(19, 60, 54, 0.06);
            margin-bottom: 24px;
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .date-group-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px -2px rgba(13, 61, 55, 0.06);
          }
          :global(.premium-table-row) {
            display: grid;
            grid-template-columns: 120px 1px 2.5fr 1.5fr 1.5fr 130px;
            gap: 12px;
            align-items: center;
            padding: 14px 16px;
            border-bottom: 1px solid var(--line-soft);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            background: var(--surface);
            position: relative;
            cursor: pointer;
          }
          :global(.premium-table-row::after) {
            content: '';
            position: absolute;
            inset: 0;
            background-color: rgba(1, 88, 76, 0.02);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
          }
          :global(.premium-table-row:hover::after) {
            opacity: 1;
          }
          .status-badge-premium {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            font-size: 9.5px;
            font-weight: 500;
            padding: 4px 8px;
            border-radius: 8px;
            white-space: nowrap;
            border: 1px solid transparent;
            width: 82px;
          }
          .status-badge-premium.paid {
            color: var(--green);
            background: rgba(40,167,69,0.06);
            border-color: rgba(40,167,69,0.15);
          }
          .status-badge-premium.pending {
            color: #A06E00;
            background: rgba(255,179,0,0.06);
            border-color: rgba(255,179,0,0.15);
          }
          .status-badge-premium.overdue {
            color: var(--neg);
            background: rgba(239,68,68,0.06);
            border-color: rgba(239,68,68,0.15);
          }
          .status-badge-premium.fixed {
            color: var(--teal);
            background: rgba(1, 88, 76, 0.06);
            border-color: rgba(1, 88, 76, 0.15);
          }
          .status-badge-premium.variable {
            color: var(--orange-ink);
            background: rgba(245, 124, 0, 0.06);
            border-color: rgba(245, 124, 0, 0.15);
          }
          .category-badge-premium {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 12px;
            width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            border: 1px solid transparent;
          }
          .method-badge-premium {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 12px;
            width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--muted);
            background: rgba(94, 111, 105, 0.05);
            border: 1px solid rgba(94, 111, 105, 0.12);
          }
          .category-dot {
            width: 6px;
            height: 6px;
            border-radius: 3px;
            flex-shrink: 0;
          }
          .account-badge-premium {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 12px;
            width: 130px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            border: 1px solid transparent;
          }
          .account-badge-premium.active {
            color: var(--ink);
            background: var(--surface-2);
            border-color: var(--line-soft);
          }
          .account-badge-premium.warning {
            color: #A06E00;
            background: rgba(255,179,0,0.06);
            border-color: rgba(255,179,0,0.15);
          }
          .account-badge-premium.muted {
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
            transform: translateY(-1px);
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
          
          .search-wrapper input:focus {
            border-color: rgba(1, 88, 76, 0.4) !important;
            box-shadow: 0 0 0 3px rgba(1, 88, 76, 0.08) !important;
          }

          @media (max-width: 767px) {
            .desktop-tablet-only {
              display: none !important;
            }
            .mobile-only {
              display: flex !important;
            }
            :global(.premium-mobile-card) {
              border: 1px solid var(--line-soft);
              border-radius: 16px;
              background: var(--surface);
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 12px;
              box-shadow: 0 2px 8px -2px rgba(13, 61, 55, 0.03);
              position: relative;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            :global(.premium-mobile-card:hover) {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px -2px rgba(13, 61, 55, 0.06);
            }
            .mobile-actions-row {
              display: flex;
              gap: 8px;
              position: relative;
            }
            .mobile-action-btn {
              font-size: 12px;
              font-weight: 600;
              padding: 8px 12px;
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
              width: 36px;
              height: 36px;
              padding: 0;
            }
            .intelligent-summary {
              flex-direction: column;
              align-items: flex-start !important;
              gap: 12px;
            }
            .summary-stats-right {
              width: 100%;
              justify-content: space-between;
              margin-top: 4px;
            }
            .summary-media-col {
              display: none !important;
            }
            .summary-divider {
              display: none !important;
            }
          }
          @media (min-width: 768px) and (max-width: 1023px) {
            .premium-table-header {
              grid-template-columns: 120px 2.2fr 110px 120px !important;
            }
            :global(.premium-table-row) {
              grid-template-columns: 120px 2.2fr 110px 120px !important;
            }
            .col-cat, .col-acc, .cell-cat, .cell-acc {
              display: none !important;
            }
            .tablet-only-inline {
              display: inline !important;
            }
          }

          /* Premium Transitions & Animations */
          :global(.card) {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease;
          }
          :global(.card:hover) {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(1, 88, 76, 0.05);
            border-color: rgba(1, 88, 76, 0.15);
          }

          .upcoming-row {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .upcoming-row:hover {
            transform: translateY(-1.5px);
            background-color: rgba(1, 88, 76, 0.01) !important;
            border-color: rgba(1, 88, 76, 0.2) !important;
            box-shadow: 0 4px 12px rgba(1, 88, 76, 0.05);
          }

          @media (max-width: 767px) {
            .upcoming-timeline-line {
              display: none !important;
            }
            .upcoming-timeline-dot {
              display: none !important;
            }
            .upcoming-timeline-row {
              gap: 0 !important;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .date-group-card, :global(.premium-table-row), :global(.premium-mobile-card) {
              transition: none !important;
              transform: none !important;
            }
          }

          .swipeable-container {
            position: relative;
            overflow: hidden;
            background: #EAEAEA;
            border-radius: 16px;
          }
          .swipeable-container.desktop-tablet-only {
            border-radius: 0;
            background: #EAEAEA;
          }
          .swipeable-container.mobile-only {
            margin-bottom: 12px;
            background: #EAEAEA;
          }
          .swipe-actions-bg {
            position: absolute;
            top: 1px;
            right: 1px;
            bottom: 1px;
            display: flex;
            align-items: stretch;
            z-index: 1;
            border-radius: 0 15px 15px 0;
          }
          .swipe-action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 60px;
            border: none;
            color: white;
            cursor: pointer;
            gap: 4px;
            font-size: 10px;
            font-weight: 700;
            font-family: inherit;
            transition: background-color 0.2s ease;
          }
          .swipe-action-btn.check {
            background: #10B981;
          }
          .swipe-action-btn.check:hover {
            background: #059669;
          }
          .swipe-action-btn.uncheck {
            background: #D97706;
          }
          .swipe-action-btn.uncheck:hover {
            background: #B45309;
          }
          .swipe-action-btn.edit {
            background: #3B82F6;
          }
          .swipe-action-btn.edit:hover {
            background: #2563EB;
          }
          .swipe-action-btn.delete {
            background: #EF4444;
          }
          .swipe-action-btn.delete:hover {
            background: #DC2626;
          }
          :global(.swipe-front-row) {
            position: relative;
            z-index: 2;
            touch-action: pan-y;
            transition: none !important;
          }
        `}</style>
      </section>

        </div>
        <div className="receitas-rail-col">
          {/* Card Compacto: Receitas do Período */}
          <div className="compact-insight-card period-card">            <div className="compact-card-header">
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
              
              <div className="compact-progress-bar premium-bar" style={{ height: 8, gap: 3, background: 'var(--surface-2)', overflow: 'visible' }}>
                {propRecebido > 0 && <div style={{ width: `${propRecebido}%`, background: 'linear-gradient(90deg, #10B981, #059669)', borderRadius: 4, height: '100%', transition: 'width 0.5s ease' }} />}
                {propPendente > 0 && <div style={{ width: `${propPendente}%`, background: 'linear-gradient(90deg, #FBBF24, #D97706)', borderRadius: 4, height: '100%', transition: 'width 0.5s ease' }} />}
                {propAtrasado > 0 && <div style={{ width: `${propAtrasado}%`, background: 'linear-gradient(90deg, #EF4444, #DC2626)', borderRadius: 4, height: '100%', transition: 'width 0.5s ease' }} />}
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

              <div className="compact-progress-bar premium-bar" style={{ height: 8, background: 'var(--surface-2)' }}>
                <div style={{ width: `${pctBar}%`, height: '100%', background: `linear-gradient(90deg, ${realizacaoState.color}, var(--teal))`, borderRadius: 4, transition: 'width 0.5s ease' }} />
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

          {/* Card Compacto: Finnly IA */}
          <RevenueAICard
            model={revenueAIModel}
            contextPayloadBase={revenueAIContextPayload}
            onAsk={(question, context) => onAsk?.(question, context)}
          />        </div>
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
          <div className="card" style={{ height: '100%', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'rgba(1, 88, 76, 0.08)', padding: 6, borderRadius: 8, color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HeartPulse size={16} />
                </div>
                <div className="card-title" style={{ fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
                  Saúde da Receita
                </div>
              </div>
              <CardInfoTooltip content="Qualidade geral e previsibilidade das entradas." />
            </div>
            
            {/* Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {/* Top Section: Gauge + Badge/Description */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Circular Gauge */}
                <div style={{ width: 76, height: 76, position: 'relative', flexShrink: 0 }}>
                  <svg viewBox="0 0 76 76" style={{ width: 76, height: 76, transform: 'rotate(-90deg)', filter: 'drop-shadow(0px 2px 6px rgba(1, 107, 76, 0.15))' }}>
                    <circle cx="38" cy="38" r="31" fill="none" stroke="var(--surface-2)" strokeWidth="5.5" />
                    <circle 
                      cx="38" cy="38" r="31" fill="none" 
                      stroke={strokeColor} strokeWidth="5.5" 
                      strokeDasharray="194.78"
                      strokeDashoffset={`${194.78 * (1 - saudeMetrics.score / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 'auto' }}>
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
            <div className="compact-insight-footer" style={{ marginTop: 20 }}>
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

      <DeleteRevenueModal
        open={deleteModal.open}
        revenue={deleteModal.revenue}
        categories={categories}
        accounts={accounts}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        onExitComplete={handleExitCompleteDelete}
      />

      <UnmarkRevenueModal
        open={unmarkModal.open}
        revenue={unmarkModal.revenue}
        categories={categories}
        accounts={accounts}
        isUpdating={isUpdatingRevenueStatus}
        error={unmarkError}
        onClose={handleCloseUnmarkModal}
        onConfirm={handleConfirmUnmarkRevenue}
        onExitComplete={handleUnmarkModalExitComplete}
      />
    </div>
  )
}
