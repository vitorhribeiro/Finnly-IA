import { createClient } from '@/utils/supabase/server'
import type { DashboardData, CategorySummary, Transaction, Goal, FinancialProfile } from '@/types/database'
import { CATEGORY_COLORS } from '@/types/database'

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

function calcScore(params: {
  monthlyIncome: number
  monthlyExpenses: number
  hasEmergencyFund: boolean
  hasDebts: boolean
  goals: Goal[]
}): { score: number; change: number } {
  const { monthlyIncome, monthlyExpenses, hasEmergencyFund, hasDebts, goals } = params
  let score = 40

  if (monthlyIncome > 0) {
    const savingsRate = (monthlyIncome - monthlyExpenses) / monthlyIncome
    if (savingsRate >= 0.3) score += 20
    else if (savingsRate >= 0.2) score += 15
    else if (savingsRate >= 0.1) score += 10
    else if (savingsRate > 0) score += 5
  }

  if (hasEmergencyFund) score += 15
  if (!hasDebts) score += 15

  const goalsWithProgress = goals.filter(g => g.current_amount / g.target_amount >= 0.2)
  if (goalsWithProgress.length > 0) score += 10

  return { score: Math.min(100, Math.max(0, score)), change: 4 }
}

export async function getFinancialProfile(userId: string): Promise<FinancialProfile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('financial_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient()
  const { start, end } = currentMonthRange()

  const [incomesRes, expensesRes, goalsRes, profileRes] = await Promise.all([
    supabase
      .from('incomes')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false }),
    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false }),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('financial_profiles')
      .select('*')
      .eq('user_id', userId)
      .single(),
  ])

  const incomes = incomesRes.data ?? []
  const expenses = expensesRes.data ?? []
  const goals: Goal[] = goalsRes.data ?? []
  const financialProfile: FinancialProfile | null = profileRes.data ?? null

  const monthlyIncome = incomes.reduce((s, r) => s + Number(r.amount), 0)
  const monthlyExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0)
  const monthlySavings = monthlyIncome - monthlyExpenses

  // Categories from expenses
  const catMap: Record<string, number> = {}
  for (const exp of expenses) {
    catMap[exp.category] = (catMap[exp.category] ?? 0) + Number(exp.amount)
  }
  const categories: CategorySummary[] = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: monthlyExpenses > 0 ? Math.round((amount / monthlyExpenses) * 100) : 0,
      color: CATEGORY_COLORS[name] ?? '#90A4AE',
    }))

  // Recent transactions (last 8, combined)
  const txIncomes: Transaction[] = incomes.slice(0, 8).map(r => ({
    id: r.id,
    type: 'income' as const,
    name: r.description ?? r.category,
    subtitle: `${r.category} · ${formatDate(r.date)}`,
    amount: Number(r.amount),
    category: r.category,
    date: r.date,
  }))

  const txExpenses: Transaction[] = expenses.slice(0, 8).map(r => ({
    id: r.id,
    type: 'expense' as const,
    name: r.description ?? r.category,
    subtitle: `${r.category} · ${formatDate(r.date)}`,
    amount: -Number(r.amount),
    category: r.category,
    date: r.date,
  }))

  const recentTransactions = [...txIncomes, ...txExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  const { score, change: scoreChange } = calcScore({
    monthlyIncome,
    monthlyExpenses,
    hasEmergencyFund: financialProfile?.has_emergency_fund ?? false,
    hasDebts: financialProfile?.has_debts ?? false,
    goals,
  })

  return {
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    score,
    scoreChange,
    categories,
    recentTransactions,
    goals,
    financialProfile,
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ---- Para o contexto da IA ----
export async function getAIContext(userId: string): Promise<string> {
  const supabase = await createClient()
  const { start, end } = currentMonthRange()
  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const [incomesRes, expensesRes, goalsRes, profileRes] = await Promise.all([
    supabase.from('incomes').select('amount,category,description,date').eq('user_id', userId).gte('date', start).lte('date', end),
    supabase.from('expenses').select('amount,category,description,date').eq('user_id', userId).gte('date', start).lte('date', end),
    supabase.from('goals').select('name,target_amount,current_amount,target_date').eq('user_id', userId),
    supabase.from('financial_profiles').select('*').eq('user_id', userId).single(),
  ])

  const incomes = incomesRes.data ?? []
  const expenses = expensesRes.data ?? []
  const goals = goalsRes.data ?? []
  const profile = profileRes.data

  const totalIncome = incomes.reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0)

  const catMap: Record<string, number> = {}
  for (const e of expenses) catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount)
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([cat, val]) => `${cat}: R$ ${val.toFixed(2)}`).join(', ')

  const goalsStr = goals.map(g => {
    const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0
    const remaining = g.target_amount - g.current_amount
    return `${g.name} (${pct}% concluída, faltam R$ ${remaining.toFixed(2)}${g.target_date ? `, prazo: ${g.target_date}` : ''})`
  }).join('; ')

  return `
Mês atual: ${monthName}
Renda do mês: R$ ${totalIncome.toFixed(2)}
Despesas do mês: R$ ${totalExpenses.toFixed(2)}
Saldo disponível: R$ ${(totalIncome - totalExpenses).toFixed(2)}
${topCats ? `Gastos por categoria: ${topCats}` : ''}
${goalsStr ? `Metas: ${goalsStr}` : ''}
${profile ? `Perfil: renda mensal declarada R$ ${profile.monthly_income ?? 'não informada'}, objetivo: ${profile.main_goal ?? 'não definido'}, reserva de emergência: ${profile.has_emergency_fund ? 'sim' : 'não'}, dívidas: ${profile.has_debts ? 'sim' : 'não'}` : ''}
`.trim()
}
