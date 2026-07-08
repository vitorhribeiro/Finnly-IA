import type { Income } from '@/types/database'

export interface IncomeHealthResult {
  score: number
  status: 'healthy' | 'light_attention' | 'attention' | 'critical' | 'empty'
  label: string
  description: string
  indicators: {
    predictability: {
      label: string
      description: string
      level: 'good' | 'medium' | 'bad'
    }
    delays: {
      label: string
      description: string
      level: 'good' | 'medium' | 'bad'
    }
    diversification: {
      label: string
      description: string
      level: 'good' | 'medium' | 'bad'
    }
  }
  metrics: {
    totalExpected: number
    receivedTotal: number
    pendingTotal: number
    overdueTotal: number
    fixedTotal: number
    variableTotal: number
    fixedRatio: number
    variableRatio: number
    topSourceRatio: number
    sourceCount: number
  }
}

function getPreviousMonthString(ym: string, offset: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 - offset, 1)
  return d.toISOString().slice(0, 7)
}

export function calculateIncomeHealthScore(
  incomes: Income[],
  selectedMonth: string,
  historicalIncomes: Income[]
): IncomeHealthResult {
  // Filhas incomes for selected month
  const currentIncomes = incomes.filter(i => i.date.slice(0, 7) === selectedMonth)
  const totalExpected = currentIncomes.reduce((sum, i) => sum + Number(i.amount), 0)

  if (totalExpected <= 0) {
    return {
      score: 0,
      status: 'empty',
      label: 'SEM DADOS',
      description: 'Ainda não há receitas suficientes neste período para calcular a saúde.',
      indicators: {
        predictability: {
          label: 'Sem dados',
          description: 'Nenhuma receita registrada.',
          level: 'medium'
        },
        delays: {
          label: 'Sem dados',
          description: 'Nenhuma pendência relevante.',
          level: 'medium'
        },
        diversification: {
          label: 'Sem dados',
          description: 'Nenhuma fonte identificada.',
          level: 'medium'
        }
      },
      metrics: {
        totalExpected: 0,
        receivedTotal: 0,
        pendingTotal: 0,
        overdueTotal: 0,
        fixedTotal: 0,
        variableTotal: 0,
        fixedRatio: 0,
        variableRatio: 0,
        topSourceRatio: 0,
        sourceCount: 0
      }
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  // Status mapping
  const receivedTotal = currentIncomes
    .filter(i => i.payment_status)
    .reduce((sum, i) => sum + Number(i.amount), 0)

  const pendingTotal = currentIncomes
    .filter(i => !i.payment_status && i.date >= todayStr)
    .reduce((sum, i) => sum + Number(i.amount), 0)

  const overdueIncomes = currentIncomes.filter(i => !i.payment_status && i.date < todayStr)
  const overdueTotal = overdueIncomes.reduce((sum, i) => sum + Number(i.amount), 0)
  const overdueCount = overdueIncomes.length

  const fixedTotal = currentIncomes
    .filter(i => i.income_type === 'fixed')
    .reduce((sum, i) => sum + Number(i.amount), 0)

  const variableTotal = currentIncomes
    .filter(i => i.income_type === 'variable')
    .reduce((sum, i) => sum + Number(i.amount), 0)

  const fixedRatio = fixedTotal / totalExpected
  const variableRatio = variableTotal / totalExpected

  // Group by category/source
  const catMap: Record<string, number> = {}
  currentIncomes.forEach(i => {
    catMap[i.category] = (catMap[i.category] ?? 0) + Number(i.amount)
  })
  const sourceCount = Object.values(catMap).filter(v => v > 0).length
  const topSourceValue = sourceCount > 0 ? Math.max(...Object.values(catMap)) : 0
  const topSourceRatio = topSourceValue / totalExpected

  // Start with 100 points
  let score = 100

  // 1. Overdue Penalties
  const overdueRatio = overdueTotal / totalExpected
  let delaysLevel: 'good' | 'medium' | 'bad' = 'good'
  let delaysLabel = 'Sem atrasos'
  let delaysDesc = 'Pagamentos em dia.'

  if (overdueTotal > 0) {
    if (overdueRatio > 0.25) {
      score -= 28
      delaysLevel = 'bad'
      delaysLabel = 'Atrasos graves'
      delaysDesc = 'Mais de 25% da renda atrasada.'
    } else if (overdueRatio > 0.1) {
      score -= 16
      delaysLevel = 'bad'
      delaysLabel = 'Há atrasos'
      delaysDesc = 'Mais de 10% da renda atrasada.'
    } else {
      score -= 8
      delaysLevel = 'medium'
      delaysLabel = 'Atraso leve'
      delaysDesc = 'Pequena parte da renda em atraso.'
    }

    if (overdueCount >= 3) {
      score -= 5
    }
  }

  // 2. Predictability Penalties
  let predictabilityLevel: 'good' | 'medium' | 'bad' = 'good'
  let predictabilityLabel = 'Previsibilidade alta'
  let predictabilityDesc = 'Receitas recorrentes sólidas.'

  if (fixedRatio >= 0.60) {
    // predictability alta, no penalty
  } else if (fixedRatio >= 0.35) {
    score -= 8
    predictabilityLevel = 'medium'
    predictabilityLabel = 'Previsibilidade média'
    predictabilityDesc = 'Mescla de fixas e variáveis.'
  } else {
    score -= 18
    predictabilityLevel = 'bad'
    predictabilityLabel = 'Previsibilidade baixa'
    predictabilityDesc = 'Renda concentrada em variáveis.'
  }

  // 3. Diversificação Penalties
  let diversificationLevel: 'good' | 'medium' | 'bad' = 'good'
  let diversificationLabel = 'Boa diversificação'
  let diversificationDesc = 'Receita bem distribuída.'

  if (topSourceRatio < 0.50) {
    // good diversification, no penalty
    diversificationLevel = 'good'
    diversificationLabel = 'Boa diversificação'
    diversificationDesc = 'Receita bem distribuída.'
  } else if (topSourceRatio >= 0.50 && topSourceRatio < 0.70) {
    score -= 10
    diversificationLevel = 'medium'
    diversificationLabel = 'Concentração moderada'
    diversificationDesc = `Principal fonte até ${Math.round(topSourceRatio * 100)}%.`
  } else {
    score -= 18
    diversificationLevel = 'bad'
    diversificationLabel = 'Alta concentração'
    diversificationDesc = `Principal fonte representa ${Math.round(topSourceRatio * 100)}%.`
  }

  if (sourceCount <= 1) {
    score -= 12
  }

  // 4. Historical Trends Penalties
  const m1 = getPreviousMonthString(selectedMonth, 1)
  const m2 = getPreviousMonthString(selectedMonth, 2)
  const m3 = getPreviousMonthString(selectedMonth, 3)

  const m1Total = historicalIncomes.filter(i => i.date.slice(0, 7) === m1).reduce((sum, i) => sum + Number(i.amount), 0)
  const m2Total = historicalIncomes.filter(i => i.date.slice(0, 7) === m2).reduce((sum, i) => sum + Number(i.amount), 0)
  const m3Total = historicalIncomes.filter(i => i.date.slice(0, 7) === m3).reduce((sum, i) => sum + Number(i.amount), 0)

  const hasHistory = m1Total > 0 || m2Total > 0 || m3Total > 0
  const media3Meses = (m1Total + m2Total + m3Total) / 3

  if (hasHistory && media3Meses > 0) {
    const quedaPercentual = (media3Meses - totalExpected) / media3Meses
    if (quedaPercentual > 0.50) {
      score -= 18
    } else if (quedaPercentual > 0.30) {
      score -= 10
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)))

  // Score states mapping
  let status: 'healthy' | 'light_attention' | 'attention' | 'critical'
  let label = 'SAUDÁVEL'
  let description = 'Sua receita está saudável, com boa previsibilidade e sem atrasos relevantes.'

  if (score >= 80) {
    status = 'healthy'
    label = 'SAUDÁVEL'
    description = 'Receita saudável e com boa previsibilidade.'
  } else if (score >= 60) {
    status = 'light_attention'
    label = 'ESTÁVEL'
    description = 'Estável, mas com pontos de atenção.'
  } else if (score >= 40) {
    status = 'attention'
    label = 'ATENÇÃO'
    description = 'Requer atenção: atrasos ou concentração elevada.'
  } else {
    status = 'critical'
    label = 'CRÍTICO'
    description = 'Estado crítico. Revise pendências e fontes de renda.'
  }

  return {
    score,
    status,
    label,
    description,
    indicators: {
      predictability: {
        label: predictabilityLabel,
        description: predictabilityDesc,
        level: predictabilityLevel
      },
      delays: {
        label: delaysLabel,
        description: delaysDesc,
        level: delaysLevel
      },
      diversification: {
        label: diversificationLabel,
        description: diversificationDesc,
        level: diversificationLevel
      }
    },
    metrics: {
      totalExpected,
      receivedTotal,
      pendingTotal,
      overdueTotal,
      fixedTotal,
      variableTotal,
      fixedRatio,
      variableRatio,
      topSourceRatio,
      sourceCount
    }
  }
}
