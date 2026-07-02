'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { CreditCard } from '@/types/database'

export async function getCreditCards(): Promise<(CreditCard & { currentInvoice: number })[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: cards, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return []

  // Inicializar um cartão padrão se o usuário não tiver nenhum
  if (cards.length === 0) {
    const { data: defaultCard, error: createError } = await supabase
      .from('credit_cards')
      .insert({
        user_id: user.id,
        name: 'Cartão Principal',
        limit: 2500.00,
        closing_day: 5,
        due_day: 12,
        color: '#B9842F',
      })
      .select()
      .single()

    if (!createError && defaultCard) {
      return [{ ...(defaultCard as CreditCard), currentInvoice: 0 }]
    }
  }

  // Para cada cartão, buscar a fatura aberta atual (soma das despesas não pagas vinculadas a ele)
  const cardsWithInvoice = await Promise.all(
    cards.map(async (card) => {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('credit_card_id', card.id)
        .eq('user_id', user.id)
        .eq('payment_status', false) // Fatura em aberto

      const currentInvoice = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

      return {
        ...(card as CreditCard),
        currentInvoice,
      }
    })
  )

  return cardsWithInvoice
}

export async function createCreditCard(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'Nome do cartão é obrigatório' }

  const limit = parseFloat(String(formData.get('limit') || '0').replace(',', '.'))
  if (isNaN(limit) || limit <= 0) return { error: 'Limite do cartão inválido' }

  const closingDay = parseInt(String(formData.get('closing_day') || '5'), 10)
  const dueDay = parseInt(String(formData.get('due_day') || '12'), 10)
  const color = String(formData.get('color') || '#B9842F')

  if (closingDay < 1 || closingDay > 31 || dueDay < 1 || dueDay > 31) {
    return { error: 'Dias de fechamento e vencimento devem ser entre 1 e 31' }
  }

  const { data, error } = await supabase
    .from('credit_cards')
    .insert({
      user_id: user.id,
      name,
      limit,
      closing_day: closingDay,
      due_day: dueDay,
      color,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true, card: data as CreditCard }
}

export async function updateCreditCard(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'Nome do cartão é obrigatório' }

  const limit = parseFloat(String(formData.get('limit') || '0').replace(',', '.'))
  if (isNaN(limit) || limit <= 0) return { error: 'Limite do cartão inválido' }

  const closingDay = parseInt(String(formData.get('closing_day') || '5'), 10)
  const dueDay = parseInt(String(formData.get('due_day') || '12'), 10)
  const color = String(formData.get('color') || '#B9842F')

  const { error } = await supabase
    .from('credit_cards')
    .update({
      name,
      limit,
      closing_day: closingDay,
      due_day: dueDay,
      color,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteCreditCard(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('credit_cards')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function payCreditCardInvoice(creditCardId: string, sourceAccountId: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  if (amount <= 0) return { error: 'Valor do pagamento deve ser maior que zero' }

  // 1. Obter detalhes do cartão e conta de origem
  const [cardRes, accountRes] = await Promise.all([
    supabase.from('credit_cards').select('name').eq('id', creditCardId).eq('user_id', user.id).single(),
    supabase.from('accounts').select('balance, name').eq('id', sourceAccountId).eq('user_id', user.id).single()
  ])

  if (cardRes.error || !cardRes.data) return { error: 'Cartão não encontrado' }
  if (accountRes.error || !accountRes.data) return { error: 'Conta de origem não encontrada' }

  const newBalance = Number(accountRes.data.balance) - amount

  // 2. Deduzir o valor da conta corrente de origem
  const updateAccount = supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', sourceAccountId)

  // 3. Marcar despesas do cartão como pagas (fatura fechada)
  const updateExpenses = supabase
    .from('expenses')
    .update({ payment_status: true })
    .eq('credit_card_id', creditCardId)
    .eq('user_id', user.id)
    .eq('payment_status', false)

  // 4. Inserir uma despesa na conta de origem representando o pagamento da fatura
  const insertExpense = supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      amount,
      category: 'Cartões',
      description: `Pagam. Fatura ${cardRes.data.name}`,
      date: new Date().toISOString().split('T')[0],
      account_id: sourceAccountId,
      payment_status: true // Já descontado
    })

  const [resAcc, resExp, resInsert] = await Promise.all([updateAccount, updateExpenses, insertExpense])

  if (resAcc.error) return { error: `Erro na conta de origem: ${resAcc.error.message}` }
  if (resExp.error) return { error: `Erro ao liquidar despesas do cartão: ${resExp.error.message}` }
  if (resInsert.error) return { error: `Erro ao registrar lançamento de pagamento: ${resInsert.error.message}` }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
