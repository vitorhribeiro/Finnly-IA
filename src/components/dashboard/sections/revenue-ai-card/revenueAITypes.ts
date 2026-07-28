import { LucideIcon } from 'lucide-react'

export type RevenueAITone = 'critical' | 'attention' | 'neutral' | 'positive' | 'empty'

export type FinnlyAISuggestion = {
  id: string
  label: string
  prompt: string
  priority: 'primary' | 'secondary'
  category?: 'collection' | 'projection' | 'diversification' | 'comparison' | 'planning' | 'opportunity' | 'stability' | 'risk'
  icon?: LucideIcon
}

export type RevenueAIInsightModel = {
  tone: RevenueAITone
  badge: string
  title: string
  description: string
  insight: string
  highlightedMetric?: string
  primaryAction: FinnlyAISuggestion
  secondaryActions: FinnlyAISuggestion[]
}

export type RevenueAIContextPayload = {
  source: 'revenue-ai-card'
  tone: RevenueAITone
  period: string
  expectedAmount: number
  receivedAmount: number
  pendingAmount: number
  pendingPercentage: number
  overdueAmount: number
  overdueCount: number
  realizationPercentage: number
  incomeConcentrationPercentage: number
  comparisonWithPreviousMonth: number
  selectedSuggestionId: string
}
