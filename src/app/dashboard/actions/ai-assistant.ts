'use server'

import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { createClient } from '@/utils/supabase/server'
import { getAccounts } from './accounts'
import { getCreditCards } from './credit-cards'
import { getIncomeCategories } from './income-categories'
import { getExpenseCategories } from './expense-categories'

// Inicializar OpenAI se a chave estiver configurada
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

interface QuickEntryResult {
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  account_or_card_name?: string
}

export async function processAIQuickEntry(text: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  if (!text || !text.trim()) return { error: 'Texto vazio' }

  if (!process.env.OPENAI_API_KEY) {
    return { error: 'OpenAI API Key não configurada.' }
  }

  // 1. Obter categorias válidas do DB para alimentar o prompt da IA
  const [incCats, expCats, accounts, cards] = await Promise.all([
    getIncomeCategories(),
    getExpenseCategories(),
    getAccounts(),
    getCreditCards()
  ])

  const incomeCatList = incCats.map(c => c.name).join(', ')
  const expenseCatList = expCats.map(c => c.name).join(', ')
  const accountList = accounts.map(a => a.name).join(', ')
  const cardList = cards.map(c => c.name).join(', ')

  try {
    const prompt = `Você é o interpretador de linguagem natural do Finnly. O usuário forneceu o seguinte texto para registrar uma transação: "${text}".
Analise a frase e extraia os dados estruturados do lançamento.

Categorias de RECEITA válidas: [${incomeCatList}]
Categorias de DESPESA válidas: [${expenseCatList}]
Contas bancárias válidas: [${accountList}]
Cartões de crédito válidos: [${cardList}]

Regras:
- Identifique se é receita ("income") ou despesa ("expense").
- Extraia o valor numérico.
- Classifique na categoria mais adequada dentre as válidas fornecidas. Se nenhuma bater perfeitamente, use "Outros".
- Determine um nome de descrição curto e amigável (ex: se o usuário disse "Gastei 20 no posto Ipiranga", a descrição pode ser "Posto Ipiranga").
- Identifique a conta ou cartão mencionado. Se ele mencionou um cartão, preencha o "account_or_card_name" com o nome do cartão. Se mencionou uma conta corrente/poupança ou carteira/dinheiro, preencha com o nome da conta.

Retorne APENAS um objeto JSON no formato abaixo, sem explicações:
{
  "type": "income" ou "expense",
  "amount": number,
  "category": "string",
  "description": "string",
  "account_or_card_name": "string (opcional)"
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um assistente especializado em estruturar lançamentos financeiros em JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) return { error: 'Não foi possível interpretar o texto.' }

    const parsed: QuickEntryResult = JSON.parse(content)

    // Validar os resultados básicos
    if (!parsed.amount || parsed.amount <= 0) {
      return { error: 'Não consegui identificar um valor maior que zero na frase.' }
    }

    // 2. Tentar correlacionar conta ou cartão de crédito
    let linkedAccountId: string | null = null
    let linkedCardId: string | null = null
    let feedbackMsg = ''

    if (parsed.type === 'expense') {
      // Procurar cartão correspondente
      if (parsed.account_or_card_name) {
        const matchingCard = cards.find(c => 
          c.name.toLowerCase().includes(parsed.account_or_card_name!.toLowerCase())
        )
        if (matchingCard) {
          linkedCardId = matchingCard.id
          feedbackMsg = `lançado no cartão ${matchingCard.name}`
        }
      }

      // Se não achou cartão, procurar conta
      if (!linkedCardId) {
        const matchingAcc = accounts.find(a => 
          parsed.account_or_card_name && a.name.toLowerCase().includes(parsed.account_or_card_name!.toLowerCase())
        )
        if (matchingAcc) {
          linkedAccountId = matchingAcc.id
          feedbackMsg = `lançado na conta ${matchingAcc.name}`
        } else {
          // Usar primeira conta como padrão
          linkedAccountId = accounts[0]?.id || null
          feedbackMsg = `lançado na conta ${accounts[0]?.name || 'Principal'}`
        }
      }
    } else {
      // Receitas sempre vão para uma conta
      const matchingAcc = accounts.find(a => 
        parsed.account_or_card_name && a.name.toLowerCase().includes(parsed.account_or_card_name!.toLowerCase())
      )
      if (matchingAcc) {
        linkedAccountId = matchingAcc.id
        feedbackMsg = `creditado na conta ${matchingAcc.name}`
      } else {
        linkedAccountId = accounts[0]?.id || null
        feedbackMsg = `creditado na conta ${accounts[0]?.name || 'Principal'}`
      }
    }

    // 3. Inserir a transação no banco de dados
    if (parsed.type === 'expense') {
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        date: new Date().toISOString().split('T')[0],
        account_id: linkedAccountId,
        credit_card_id: linkedCardId,
        payment_status: linkedCardId ? false : true // Cartão fica como em aberto
      })

      if (error) return { error: `Erro ao criar despesa: ${error.message}` }

      // Se foi na conta de débito direto, abater o saldo imediatamente
      if (linkedAccountId) {
        const acc = accounts.find(a => a.id === linkedAccountId)
        if (acc) {
          await supabase
            .from('accounts')
            .update({ balance: Number(acc.balance) - parsed.amount })
            .eq('id', linkedAccountId)
        }
      }
    } else {
      const { error } = await supabase.from('incomes').insert({
        user_id: user.id,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        date: new Date().toISOString().split('T')[0],
        account_id: linkedAccountId,
        payment_status: true
      })

      if (error) return { error: `Erro ao criar receita: ${error.message}` }

      // Adicionar valor na conta de destino
      if (linkedAccountId) {
        const acc = accounts.find(a => a.id === linkedAccountId)
        if (acc) {
          await supabase
            .from('accounts')
            .update({ balance: Number(acc.balance) + parsed.amount })
            .eq('id', linkedAccountId)
        }
      }
    }

    revalidatePath('/dashboard', 'layout')
    return {
      success: true,
      data: parsed,
      feedback: `Entendi! Registrei a despesa/receita de R$ ${parsed.amount.toFixed(2)} em "${parsed.description}" (${parsed.category}), ${feedbackMsg}.`
    }
  } catch (err: any) {
    return { error: `Erro ao interpretar com IA: ${err.message}` }
  }
}

export async function predictFutureBalance() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], insight: 'Usuário não autenticado.' }

  // 1. Obter saldo atual somado de todas as contas
  const { data: accounts } = await supabase
    .from('accounts')
    .select('balance')
    .eq('user_id', user.id)

  const currentTotalBalance = (accounts ?? []).reduce((sum, a) => sum + Number(a.balance), 0)

  // 2. Obter assinaturas (despesas fixas recorrentes)
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('amount, due_day, name')
    .eq('user_id', user.id)

  // 3. Projetar saldo diário pelos próximos 30 dias
  const projection: { date: string; balance: number }[] = []
  let runningBalance = currentTotalBalance
  const today = new Date()

  // Mapear datas e valores para os 30 dias subsequentes
  for (let i = 0; i <= 30; i++) {
    const futureDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    const dayOfMonth = futureDate.getDate()
    const dateStr = futureDate.toISOString().split('T')[0]

    // Abater assinaturas do dia correspondente
    const activeSubs = (subscriptions ?? []).filter(s => s.due_day === dayOfMonth)
    const subTotal = activeSubs.reduce((sum, s) => sum + Number(s.amount), 0)
    runningBalance -= subTotal

    projection.push({
      date: dateStr,
      balance: runningBalance
    })
  }

  // 4. Analisar se o saldo projeta ficar negativo nos próximos 30 dias
  const negativePoints = projection.filter(p => p.balance < 0)
  let insight = '✅ Seu fluxo de caixa projeta estabilidade positiva para os próximos 30 dias. Excelente controle!'

  if (negativePoints.length > 0) {
    const firstNeg = negativePoints[0]
    const d = new Date(firstNeg.date + 'T00:00:00')
    const formattedDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    insight = `🚨 Atenção: Projeção de saldo negativo de R$ ${Math.abs(firstNeg.balance).toFixed(2)} no dia ${formattedDate} devido a contas recorrentes. Evite compras supérfluas.`
  }

  return {
    data: projection,
    insight
  }
}
