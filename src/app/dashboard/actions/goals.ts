'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function addGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const target = parseFloat(String(formData.get('target_amount')).replace(',', '.'))
  const current = parseFloat(String(formData.get('current_amount') || '0').replace(',', '.')) || 0
  if (!target || target <= 0) return { error: 'Valor alvo inválido' }

  const { error } = await supabase.from('goals').insert({
    user_id: user.id,
    name: String(formData.get('name') || '').trim(),
    target_amount: target,
    current_amount: current,
    target_date: String(formData.get('target_date') || '') || null,
    color: String(formData.get('color') || '#01584C'),
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function updateGoalProgress(id: string, currentAmount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('goals')
    .update({ current_amount: currentAmount, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
