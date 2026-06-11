export interface Profile {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface FinancialProfile {
  id: string
  user_id: string
  monthly_income: number | null
  income_frequency: 'mensal' | 'quinzenal' | 'semanal' | 'irregular' | null
  main_goal: string | null
  has_emergency_fund: boolean
  has_debts: boolean
  preferred_usage: 'app' | 'whatsapp' | 'ambos' | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Income {
  id: string
  user_id: string
  amount: number
  category: string
  description: string | null
  date: string
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  category: string
  description: string | null
  date: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  icon: string
  color: string
  created_at: string
  updated_at: string
}

export interface AiConversation {
  id: string
  user_id: string
  question: string
  answer: string
  created_at: string
}

// ---- Agregados usados no dashboard ----

export interface CategorySummary {
  name: string
  amount: number
  percentage: number
  color: string
}

export interface Transaction {
  id: string
  type: 'income' | 'expense'
  name: string
  subtitle: string
  amount: number
  category: string
  date: string
}

export interface DashboardData {
  monthlyIncome: number
  monthlyExpenses: number
  monthlySavings: number
  score: number
  scoreChange: number
  categories: CategorySummary[]
  recentTransactions: Transaction[]
  goals: Goal[]
  financialProfile: FinancialProfile | null
}

// ---- Categorias disponíveis ----

export const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Comissão',
  'Dividendos',
  'Transferência recebida',
  'Outros',
] as const

export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Cartões',
  'Assinaturas',
  'Outros',
] as const

export const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: '#F57C00',
  Transporte: '#FFB300',
  Moradia: '#01584C',
  Saúde: '#28A745',
  Educação: '#0288D1',
  Lazer: '#7B1FA2',
  Cartões: '#B9842F',
  Assinaturas: '#455A64',
  Outros: '#90A4AE',
}
