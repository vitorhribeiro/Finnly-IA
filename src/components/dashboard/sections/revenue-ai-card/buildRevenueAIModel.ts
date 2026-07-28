import { RevenueAITone, RevenueAIInsightModel, FinnlyAISuggestion } from './revenueAITypes'

// Fast formatter for the insights
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export type BuildModelParams = {
  hasRevenueData: boolean
  totalPeriodo: number
  recebido: number
  pendente: number
  atrasado: number
  overdueCount: number
  pctRealizacaoRaw: number
  saudeScore: number
  incomeConcentrationPercentage: number
  comparisonWithPreviousMonth: number
}

function resolveRevenueAITone(data: BuildModelParams): RevenueAITone {
  if (!data.hasRevenueData || data.totalPeriodo <= 0) {
    return 'empty'
  }

  // 1. Atrasados sempre ativam crítico (Maior prioridade)
  if (data.atrasado > 0 || data.overdueCount > 0) {
    return 'critical'
  }

  // 2. Alta concentração (>=70%) ou pendência crítica (>=50%)
  if (data.incomeConcentrationPercentage >= 70 || (data.totalPeriodo > 0 && data.pendente / data.totalPeriodo >= 0.5)) {
    return 'attention'
  }

  // 3. Abaixo da expectativa e caindo em comparação ao mês anterior
  if (data.pctRealizacaoRaw < 100 && data.comparisonWithPreviousMonth < 0) {
    return 'neutral'
  }

  // 4. Cenário de sucesso
  return 'positive'
}

export function buildRevenueAIModel(data: BuildModelParams): RevenueAIInsightModel {
  const tone = resolveRevenueAITone(data)
  const pct = Math.round(data.pctRealizacaoRaw)
  const pendentePct = data.totalPeriodo > 0 ? Math.round((data.pendente / data.totalPeriodo) * 100) : 0

  switch (tone) {
    case 'empty':
      return {
        tone,
        badge: 'COMECE POR AQUI',
        title: 'Cadastre suas receitas para receber análises',
        description: 'A Finnly IA precisa conhecer suas entradas para identificar padrões, riscos e oportunidades.',
        insight: 'Os dados cadastrados irão gerar inteligência imediata para o seu negócio.',
        primaryAction: {
          id: 'add_income',
          label: 'Adicionar minha primeira receita',
          prompt: 'Adicionar receita', // Action handler to open normal flow
          priority: 'primary',
          category: 'planning'
        },
        secondaryActions: []
      }

    case 'critical':
      return {
        tone,
        badge: 'ATENÇÃO MÁXIMA',
        title: 'Você possui receitas atrasadas',
        description: `${currencyFormatter.format(data.atrasado)} estão atrasados em ${data.overdueCount} recebimento(s).`,
        insight: `Os valores vencidos exigem sua atenção imediata. Priorize os recebimentos de maior impacto.`,
        highlightedMetric: currencyFormatter.format(data.atrasado),
        primaryAction: {
          id: 'recover_overdue',
          label: 'Como recuperar receitas atrasadas?',
          prompt: 'Analise minhas receitas atrasadas, identifique quais devem ser priorizadas e crie um plano de cobrança e recuperação considerando valor, quantidade de dias em atraso, origem da receita e impacto no meu fluxo de caixa.',
          priority: 'primary',
          category: 'collection'
        },
        secondaryActions: [
          {
            id: 'prioritize_overdue',
            label: 'Quais atrasos priorizar?',
            prompt: 'Ordene minhas receitas atrasadas por prioridade, considerando valor, dias de atraso e impacto no fluxo de caixa. Explique quais devem ser cobradas primeiro.',
            priority: 'secondary',
            category: 'collection'
          },
          {
            id: 'collection_plan',
            label: 'Plano de cobrança',
            prompt: 'Crie um plano prático de cobrança para minhas receitas vencidas, separando ações imediatas, contatos de acompanhamento e prazos recomendados.',
            priority: 'secondary',
            category: 'planning'
          }
        ]
      }

    case 'attention': {
      if (data.incomeConcentrationPercentage >= 70) {
        return {
          tone,
          badge: 'ACOMPANHAR',
          title: 'Sua renda está muito concentrada',
          description: `Uma única origem representa ${data.incomeConcentrationPercentage}% das suas entradas.`,
          insight: `A dependência dessa fonte aumenta seu risco. Diversificar suas entradas pode trazer estabilidade.`,
          highlightedMetric: `${data.incomeConcentrationPercentage}%`,
          primaryAction: {
            id: 'reduce_dependency',
            label: 'Como reduzir minha dependência?',
            prompt: 'Analise a concentração das minhas fontes de renda e sugira formas realistas de reduzir a dependência da principal origem, considerando meu histórico financeiro atual.',
            priority: 'primary',
            category: 'diversification'
          },
          secondaryActions: [
            {
              id: 'diversify_ideas',
              label: 'Ideias para diversificar',
              prompt: 'Com base no meu fluxo financeiro, sugira ideias viáveis para diversificar e criar novas fontes de renda.',
              priority: 'secondary',
              category: 'opportunity'
            },
            {
              id: 'simulate_loss',
              label: 'Simular perda de receita',
              prompt: 'Faça uma simulação de risco: qual seria o impacto no meu fluxo de caixa se essa principal fonte de renda atrasasse ou fosse interrompida?',
              priority: 'secondary',
              category: 'risk'
            }
          ]
        }
      } else {
        return {
          tone,
          badge: 'ACOMPANHAR',
          title: 'Importante volume ainda pendente',
          description: `${pendentePct}% do valor previsto ainda não foi recebido.`,
          insight: `Acompanhe os vencimentos próximos para evitar impactos negativos no fluxo de caixa.`,
          highlightedMetric: `${pendentePct}%`,
          primaryAction: {
            id: 'secure_pending',
            label: 'Como garantir os recebimentos?',
            prompt: 'Analise minhas receitas pendentes e indique quais exigem acompanhamento, quais vencem primeiro e quais podem afetar meu fluxo de caixa até o fim do período.',
            priority: 'primary',
            category: 'projection'
          },
          secondaryActions: [
            {
              id: 'upcoming_deadlines',
              label: 'Quais vencem primeiro?',
              prompt: 'Liste e organize os recebimentos que vencem nos próximos dias, indicando os de maior valor e importância.',
              priority: 'secondary',
              category: 'projection'
            },
            {
              id: 'pending_amount',
              label: 'Quanto falta receber?',
              prompt: 'Faça um resumo de quanto ainda falta receber no mês e como esse valor se compara com minhas despesas.',
              priority: 'secondary',
              category: 'planning'
            }
          ]
        }
      }
    }

    case 'neutral':
      return {
        tone,
        badge: 'ABAIXO DO PREVISTO',
        title: 'Receitas abaixo da expectativa',
        description: `Você recebeu ${pct}% do valor esperado para este momento.`,
        insight: `O ritmo atual está ${Math.abs(data.comparisonWithPreviousMonth)}% abaixo do mês anterior. A diferença requer acompanhamento.`,
        highlightedMetric: `${Math.abs(data.comparisonWithPreviousMonth)}%`,
        primaryAction: {
          id: 'why_below_expectations',
          label: 'Por que estou abaixo do previsto?',
          prompt: 'Analise por que minhas receitas estão abaixo do esperado neste período. Compare valores previstos, recebidos, pendentes e o histórico anterior, destacando onde ocorreu a maior diferença.',
          priority: 'primary',
          category: 'comparison'
        },
        secondaryActions: [
          {
            id: 'compare_last_month',
            label: 'Comparar com mês anterior',
            prompt: 'Compare minhas receitas atuais com o mês anterior, destacando crescimento, queda, fontes que mudaram e o principal motivo da diferença.',
            priority: 'secondary',
            category: 'comparison'
          },
          {
            id: 'reach_goal',
            label: 'Como alcançar minha meta?',
            prompt: 'Analise o valor que ainda falta para atingir minha meta de receitas e crie um plano realista para reduzir essa diferença até o fim do período.',
            priority: 'secondary',
            category: 'planning'
          }
        ]
      }

    case 'positive':
    default:
      return {
        tone: 'positive',
        badge: 'SAUDÁVEL',
        title: 'Suas receitas estão em dia',
        description: `Você já recebeu ${pct}% do valor previsto e não possui atrasos.`,
        insight: `A constância dos seus recebimentos mantém sua pontuação financeira em ${data.saudeScore}/100.`,
        highlightedMetric: `${data.saudeScore}/100`,
        primaryAction: {
          id: 'keep_momentum',
          label: 'Como aproveitar o bom momento?',
          prompt: 'Analise o bom desempenho das minhas receitas, identifique as fontes que mais contribuíram e sugira como manter ou melhorar esse resultado nos próximos períodos.',
          priority: 'primary',
          category: 'opportunity'
        },
        secondaryActions: [
          {
            id: 'top_growth',
            label: 'Quais fontes cresceram?',
            prompt: 'Avalie meu histórico recente e mostre quais fontes de renda mais cresceram e geraram os melhores resultados.',
            priority: 'secondary',
            category: 'comparison'
          },
          {
            id: 'plan_next_month',
            label: 'Planejar o próximo mês',
            prompt: 'Com base na segurança das receitas deste mês, crie um roteiro de como posso otimizar a previsão de ganhos para o próximo período.',
            priority: 'secondary',
            category: 'planning'
          }
        ]
      }
  }
}
