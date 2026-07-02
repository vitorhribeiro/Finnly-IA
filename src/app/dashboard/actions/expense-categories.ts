'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { ExpenseCategory } from '@/types/database'

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('expense_categories')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('is_default', { ascending: false })
    .order('name')

  return (data ?? []) as ExpenseCategory[]
}

export async function createExpenseCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'Nome obrigatório' }

  const color = String(formData.get('color') || '#90A4AE')
  const icon = String(formData.get('icon') || 'Sparkles')

  const { data: existing } = await supabase
    .from('expense_categories')
    .select('id')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .ilike('name', name)
    .maybeSingle()

  if (existing) return { error: 'Já existe uma categoria com esse nome' }

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ user_id: user.id, name, color, icon, is_default: false })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true, category: data as ExpenseCategory }
}

export async function deleteExpenseCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
