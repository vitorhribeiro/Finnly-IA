'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { Expense } from '@/types/database'

function calculateInstallments(total: number, count: number): number[] {
  const base = Math.floor((total / count) * 100) / 100
  const remainder = Math.round((total - (base * count)) * 100) / 100
  
  const list = []
  for (let i = 1; i <= count; i++) {
    if (i === 1) {
      list.push(Math.round((base + remainder) * 100) / 100)
    } else {
      list.push(base)
    }
  }
  return list
}

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const amount = parseFloat(String(formData.get('amount')).replace(',', '.'))
  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido' }

  const category = String(formData.get('category') || 'Outros')
  const description = String(formData.get('description') || '').trim() || null
  const dateStr = String(formData.get('date') || new Date().toISOString().split('T')[0])
  const accountId = String(formData.get('account_id') || '').trim() || null
  const creditCardId = String(formData.get('credit_card_id') || '').trim() || null
  const paymentStatus = formData.get('payment_status') !== 'false'

  const paymentMethod = String(formData.get('payment_method') || '').trim() || null
  const paidAt = String(formData.get('paid_at') || '').trim() || null
  const paidAccountId = String(formData.get('paid_account_id') || '').trim() || null

  const tagsStr = String(formData.get('tags') || '').trim()
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : null
  const notes = String(formData.get('notes') || '').trim() || null
  const expenseType = String(formData.get('expense_type') || 'variable')
  const isRecurring = formData.get('is_recurring') === 'true'

  const installmentsTotal = parseInt(String(formData.get('installments_total') || ''), 10)
  const isInstallment = !isNaN(installmentsTotal) && installmentsTotal > 1

  if (isRecurring && !isInstallment) {
    const startOfMonth = `${dateStr.slice(0, 7)}-01`
    const endOfMonth = `${dateStr.slice(0, 7)}-31`
    const { data: existing } = await supabase
      .from('expenses')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_recurring', true)
      .eq('category', category)
      .eq('description', description)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .limit(1)

    if (existing && existing.length > 0) {
      return { error: 'Já existe um lançamento recorrente idêntico para este mês.' }
    }
  }

  if (isInstallment) {
    const baseDate = new Date(dateStr + 'T00:00:00')
    const insertPromises = []
    const installmentAmounts = calculateInstallments(amount, installmentsTotal)

    for (let i = 1; i <= installmentsTotal; i++) {
      const currentInstDate = new Date(baseDate)
      currentInstDate.setMonth(baseDate.getMonth() + i - 1)
      const currentInstDateStr = currentInstDate.toISOString().split('T')[0]

      const instPaymentStatus = creditCardId ? false : (i === 1 ? paymentStatus : false)
      const desc = description ? `${description} (${i}/${installmentsTotal})` : `${category} (${i}/${installmentsTotal})`
      const instAmount = installmentAmounts[i - 1]

      if (instPaymentStatus && !creditCardId && paidAccountId) {
        // Use RPC to create paid expense safely
        const promise = supabase.rpc('create_paid_expense_rpc', {
          p_amount: instAmount,
          p_category: category,
          p_description: desc,
          p_date: currentInstDateStr,
          p_installment_number: i,
          p_installments_total: installmentsTotal,
          p_paid_account_id: paidAccountId,
          p_payment_method: paymentMethod || 'other',
          p_paid_at: paidAt || currentInstDateStr,
          p_tags: tags,
          p_notes: notes,
          p_expense_type: expenseType,
          p_is_recurring: isRecurring
        })
        insertPromises.push(promise)
      } else {
        const promise = supabase.from('expenses').insert({
          user_id: user.id,
          amount: instAmount,
          category,
          description: desc,
          date: currentInstDateStr,
          account_id: creditCardId ? null : accountId,
          credit_card_id: creditCardId || null,
          installment_number: i,
          installments_total: installmentsTotal,
          payment_status: false, // Must be false if normal insert
          tags,
          notes,
          expense_type: expenseType as 'fixed' | 'variable',
          is_recurring: isRecurring
        })
        insertPromises.push(promise)
      }
    }

    const results = await Promise.all(insertPromises)
    const error = results.find(r => r.error)?.error
    if (error) return { error: error.message }

  } else {
    // Lançamento único
    const finalPaymentStatus = creditCardId ? false : paymentStatus

    if (finalPaymentStatus && !creditCardId && paidAccountId) {
      const { error } = await supabase.rpc('create_paid_expense_rpc', {
        p_amount: amount,
        p_category: category,
        p_description: description,
        p_date: dateStr,
        p_installment_number: null,
        p_installments_total: null,
        p_paid_account_id: paidAccountId,
        p_payment_method: paymentMethod || 'other',
        p_paid_at: paidAt || dateStr,
        p_tags: tags,
        p_notes: notes,
        p_expense_type: expenseType,
        p_is_recurring: isRecurring
      })
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        amount,
        category,
        description,
        date: dateStr,
        account_id: creditCardId ? null : accountId,
        credit_card_id: creditCardId || null,
        payment_status: false, // Force false for direct insert
        tags,
        notes,
        expense_type: expenseType as 'fixed' | 'variable',
        is_recurring: isRecurring
      })
      if (error) return { error: error.message }
    }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function payExpense(expenseId: string, payload: { paid_account_id: string, payment_method: string, paid_at: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data, error } = await supabase.rpc('pay_expense_rpc', {
    p_expense_id: expenseId,
    p_paid_account_id: payload.paid_account_id,
    p_payment_method: payload.payment_method,
    p_paid_at: payload.paid_at
  })

  if (error) return { error: error.message }
  if (data && data.error) return { error: data.error }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function undoExpensePayment(expenseId: string, fallbackAccountId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const params: any = { p_expense_id: expenseId }
  if (fallbackAccountId) params.p_fallback_account_id = fallbackAccountId

  const { data, error } = await supabase.rpc('undo_expense_payment_rpc', params)

  if (error) return { error: error.message }
  if (data && data.error) {
    return { error: data.message || data.error, code: data.error }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: expense } = await supabase.from('expenses').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!expense) return { error: 'Lançamento não encontrado' }

  if (expense.payment_status && !expense.credit_card_id) {
    const { data: undoData, error: undoError } = await supabase.rpc('undo_expense_payment_rpc', {
      p_expense_id: id
    })
    
    if (undoError) return { error: undoError.message }
    if (undoData && undoData.error) {
       return { error: undoData.message || undoData.error, code: undoData.error }
    }
  }

  const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const amount = parseFloat(String(formData.get('amount')).replace(',', '.'))
  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido' }

  const category = String(formData.get('category') || 'Outros')
  const description = String(formData.get('description') || '').trim() || null
  const dateStr = String(formData.get('date') || new Date().toISOString().split('T')[0])
  
  const accountId = String(formData.get('account_id') || '').trim() || null
  const creditCardId = String(formData.get('credit_card_id') || '').trim() || null

  const paidAccountId = String(formData.get('paid_account_id') || '').trim() || null
  const paymentMethod = String(formData.get('payment_method') || '').trim() || null
  const paidAt = String(formData.get('paid_at') || '').trim() || null

  const tagsStr = String(formData.get('tags') || '').trim()
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : null
  const notes = String(formData.get('notes') || '').trim() || null
  const expenseType = String(formData.get('expense_type') || 'variable')
  const isRecurring = formData.get('is_recurring') === 'true'

  const { data: oldExpense } = await supabase.from('expenses').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!oldExpense) return { error: 'Lançamento não encontrado' }

  if (oldExpense.payment_status && !oldExpense.credit_card_id) {
    if (!paidAccountId) return { error: 'Conta de pagamento obrigatória para despesa paga' }
    
    // Call the atomic RPC to update a paid expense
    const { data, error } = await supabase.rpc('update_paid_expense_rpc', {
      p_expense_id: id,
      p_amount: amount,
      p_category: category,
      p_description: description,
      p_date: dateStr,
      p_paid_account_id: paidAccountId,
      p_payment_method: paymentMethod || 'other',
      p_paid_at: paidAt || dateStr,
      p_tags: tags,
      p_notes: notes,
      p_expense_type: expenseType,
      p_is_recurring: isRecurring
    })

    if (error) return { error: error.message }
    if (data && data.error) return { error: data.error }

  } else {
    // Update direct fields for unpaid expenses (safe from trigger because we don't send payment fields)
    const updateData = {
      amount,
      category,
      description,
      date: dateStr,
      account_id: creditCardId ? null : accountId,
      credit_card_id: creditCardId || null,
      tags,
      notes,
      expense_type: expenseType as 'fixed' | 'variable',
      is_recurring: isRecurring
    }

    const { error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function getAllExpenses() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  return data ?? []
}

export async function getExpensesForModule(): Promise<Expense[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const d = new Date()
  d.setMonth(d.getMonth() - 12)
  const from = d.toISOString().split('T')[0]

  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', from)
    .order('date', { ascending: false })
    .limit(500)

  return (data ?? []) as Expense[]
}
