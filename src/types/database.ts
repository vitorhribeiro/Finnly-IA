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
  dashboard_layout: DashboardLayout | null
  created_at: string
  updated_at: string
}

export interface DashboardLayout {
  visibility: Record<string, boolean>
  leftOrder: string[]
  rightOrder: string[]
  generalOrder?: string[]
}

export interface Income {
  id: string
  user_id: string
  amount: number
  category: string
  description: string | null
  date: string
  is_recurring: boolean
  notes: string | null
  tags: string[] | null
  account_id?: string | null
  installment_number?: number | null
  installments_total?: number | null
  payment_status?: boolean
  received_at?: string | null
  income_type?: 'fixed' | 'variable'
  income_method?: 'pix' | 'transfer' | 'cash' | 'boleto' | 'deposit' | 'card' | 'other' | null
  created_at: string
  updated_at?: string
}

export interface IncomeCategory {
  id: string
  user_id: string | null
  name: string
  color: string
  icon: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  category: string
  description: string | null
  date: string
  account_id?: string | null
  credit_card_id?: string | null
  installment_number?: number | null
  installments_total?: number | null
  payment_status?: boolean
  paid_at?: string | null
  payment_method?: 'pix' | 'debit' | 'cash' | 'transfer' | 'boleto' | 'other' | null
  paid_account_id?: string | null
  notes?: string | null
  tags?: string[] | null
  expense_type?: 'fixed' | 'variable'
  created_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: 'corrente' | 'poupanca' | 'investimento' | 'carteira' | 'outros'
  balance: number
  initial_balance?: number
  color: string
  created_at: string
  updated_at: string
}

export interface CreditCard {
  id: string
  user_id: string
  name: string
  limit: number
  closing_day: number
  due_day: number
  color: string
  created_at: string
  updated_at: string
}

export interface Transfer {
  id: string
  user_id: string
  amount: number
  source_account_id: string
  destination_account_id: string
  date: string
  description: string | null
  created_at: string
}

export interface Investment {
  id: string
  user_id: string
  name: string
  type: 'renda_fixa' | 'acoes' | 'fiis' | 'cripto' | 'fundos' | 'outros'
  amount: number
  yield_rate: number
  date: string
  created_at: string
  updated_at: string
}

export interface ExpenseCategory {
  id: string
  user_id: string | null
  name: string
  color: string
  icon: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface UserStreak {
  id: string
  user_id: string
  current_streak: number
  longest_streak: number
  last_active_date: string
  updated_at: string
}

export interface Achievement {
  id: string
  user_id: string
  achievement_key: string
  unlocked_at: string
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

export interface Subscription {
  id: string
  user_id: string
  name: string
  amount: number
  due_day: number
  category: string
  last_paid_month: string | null
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
  type: 'income' | 'expense' | 'transfer'
  name: string
  subtitle: string
  amount: number
  category: string
  date: string
  account_id?: string | null
  credit_card_id?: string | null
  destination_account_id?: string | null
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
  subscriptions: Subscription[]
  accounts: Account[]
  creditCards: (CreditCard & { currentInvoice: number })[]
  investments: Investment[]
  streaks: UserStreak | null
  achievements: string[]
  futureBalanceProjection?: { date: string; balance: number }[]
  futureBalanceInsight?: string
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
