'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { Income } from '@/types/database'

export async function addIncome(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const amount = parseFloat(String(formData.get('amount')).replace(',', '.'))
  if (!amount || amount <= 0) return { error: 'Valor inválido' }

  const { error } = await supabase.from('incomes').insert({
    user_id: user.id,
    amount,
    category: String(formData.get('category') || 'Outros'),
    description: String(formData.get('description') || '').trim() || null,
    date: String(formData.get('date') || new Date().toISOString().split('T')[0]),
    is_recurring: formData.get('is_recurring') === 'true',
    notes: String(formData.get('notes') || '').trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function updateIncome(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const amount = parseFloat(String(formData.get('amount')).replace(',', '.'))
  if (!amount || amount <= 0) return { error: 'Valor inválido' }

  const { error } = await supabase
    .from('incomes')
    .update({
      amount,
      category: String(formData.get('category') || 'Outros'),
      description: String(formData.get('description') || '').trim() || null,
      date: String(formData.get('date') || new Date().toISOString().split('T')[0]),
      is_recurring: formData.get('is_recurring') === 'true',
      notes: String(formData.get('notes') || '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteIncome(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('incomes').delete().eq('id', id).eq('user_id', user.id)
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
