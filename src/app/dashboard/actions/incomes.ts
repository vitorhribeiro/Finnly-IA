'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { Income } from '@/types/database'

export async function addIncome(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const amount = parseFloat(String(formData.get('amount')).replace(',', '.'))
  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido' }

  const category = String(formData.get('category') || 'Outros')
  const description = String(formData.get('description') || '').trim() || null
  const dateStr = String(formData.get('date') || new Date().toISOString().split('T')[0])
  const isRecurring = formData.get('is_recurring') === 'true'
  const notes = String(formData.get('notes') || '').trim() || null
  const accountId = String(formData.get('account_id') || '').trim() || null
  const paymentStatus = formData.get('payment_status') !== 'false' // Default true
  const incomeType = String(formData.get('income_type') || 'variable')
  const incomeMethod = String(formData.get('income_method') || '') || null
  const tagsStr = String(formData.get('tags') || '').trim()
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : null

  // Parcelamento
  const installmentsTotal = parseInt(String(formData.get('installments_total') || ''), 10)
  const isInstallment = !isNaN(installmentsTotal) && installmentsTotal > 1

  if (isInstallment) {
    // Se for parcelado, gera N lançamentos futuros (1 por mês)
    const baseDate = new Date(dateStr + 'T00:00:00')
    const insertPromises = []

    for (let i = 1; i <= installmentsTotal; i++) {
      const currentInstDate = new Date(baseDate)
      currentInstDate.setMonth(baseDate.getMonth() + i - 1)
      const currentInstDateStr = currentInstDate.toISOString().split('T')[0]

      // A primeira parcela pode ser paga hoje. As parcelas futuras iniciam como não recebidas (payment_status: false) por padrão.
      const instPaymentStatus = i === 1 ? paymentStatus : false

      const promise = supabase.from('incomes').insert({
        user_id: user.id,
        amount,
        category,
        description: description ? `${description} (${i}/${installmentsTotal})` : `${category} (${i}/${installmentsTotal})`,
        date: currentInstDateStr,
        is_recurring: isRecurring,
        notes,
        account_id: accountId,
        installment_number: i,
        installments_total: installmentsTotal,
        payment_status: instPaymentStatus,
        received_at: instPaymentStatus ? new Date().toISOString() : null,
        income_type: incomeType,
        income_method: incomeMethod,
        tags
      })

      insertPromises.push(promise)
    }

    const results = await Promise.all(insertPromises)
    const error = results.find(r => r.error)?.error
    if (error) return { error: error.message }
  } else {
    // Lançamento único padrão
    const { error } = await supabase.from('incomes').insert({
      user_id: user.id,
      amount,
      category,
      description,
      date: dateStr,
      is_recurring: isRecurring,
      notes,
      account_id: accountId,
      payment_status: paymentStatus,
      received_at: paymentStatus ? new Date().toISOString() : null,
      income_type: incomeType,
      income_method: incomeMethod,
      tags
    })

    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteIncome(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // 1. Obter informações do lançamento antes de deletar
  const { data: income } = await supabase.from('incomes').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!income) return { error: 'Lançamento não encontrado' }



  // 3. Deletar transação
  const { error } = await supabase.from('incomes').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function updateIncome(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const amount = parseFloat(String(formData.get('amount')).replace(',', '.'))
  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido' }

  const category = String(formData.get('category') || 'Outros')
  const description = String(formData.get('description') || '').trim() || null
  const dateStr = String(formData.get('date') || new Date().toISOString().split('T')[0])
  const isRecurring = formData.get('is_recurring') === 'true'
  const notes = String(formData.get('notes') || '').trim() || null
  const accountId = String(formData.get('account_id') || '').trim() || null
  const paymentStatus = formData.get('payment_status') !== 'false'
  const incomeType = String(formData.get('income_type') || 'variable')
  const incomeMethod = String(formData.get('income_method') || '') || null
  const tagsStr = String(formData.get('tags') || '').trim()
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : null

  // 1. Obter estado anterior do lançamento para conciliar saldo
  const { data: oldIncome } = await supabase.from('incomes').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!oldIncome) return { error: 'Lançamento não encontrado' }

  // Determinar timestamp de recebimento
  let receivedAt = oldIncome.received_at
  if (paymentStatus && !oldIncome.payment_status) {
    receivedAt = new Date().toISOString()
  } else if (!paymentStatus) {
    receivedAt = null
  }

  // 3. Salvar atualização da receita
  const { error } = await supabase
    .from('incomes')
    .update({
      amount,
      category,
      description,
      date: dateStr,
      is_recurring: isRecurring,
      notes,
      account_id: accountId,
      payment_status: paymentStatus,
      received_at: receivedAt,
      income_type: incomeType,
      income_method: incomeMethod,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function getIncomesForModule(): Promise<Income[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const d = new Date()
  d.setMonth(d.getMonth() - 12)
  const from = d.toISOString().split('T')[0]

  const { data } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', from)
    .order('date', { ascending: false })
    .limit(500)

  return (data ?? []) as Income[]
}

export async function getAllIncomes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  return data ?? []
}
