'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { Investment } from '@/types/database'

export async function getInvestments(): Promise<Investment[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: investments, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return []

  // Inicializar um investimento padrão se o usuário não tiver nenhum
  if (investments.length === 0) {
    const { data: defaultInvest, error: createError } = await supabase
      .from('investments')
      .insert({
        user_id: user.id,
        name: 'Tesouro Direto SELIC',
        type: 'renda_fixa',
        amount: 1000.00,
        yield_rate: 10.75,
        date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (!createError && defaultInvest) {
      return [defaultInvest as Investment]
    }
  }

  return (investments ?? []) as Investment[]
}

export async function createInvestment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'Nome do ativo é obrigatório' }

  const type = String(formData.get('type') || 'renda_fixa') as Investment['type']
  const amount = parseFloat(String(formData.get('amount') || '0').replace(',', '.'))
  const yieldRate = parseFloat(String(formData.get('yield_rate') || '0').replace(',', '.'))
  const date = String(formData.get('date') || new Date().toISOString().split('T')[0])

  if (isNaN(amount) || amount < 0) return { error: 'Valor do ativo inválido' }

  const { data, error } = await supabase
    .from('investments')
    .insert({
      user_id: user.id,
      name,
      type,
      amount,
      yield_rate: isNaN(yieldRate) ? 0.00 : yieldRate,
      date,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true, investment: data as Investment }
}

export async function updateInvestment(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'Nome do ativo é obrigatório' }

  const type = String(formData.get('type') || 'renda_fixa') as Investment['type']
  const amount = parseFloat(String(formData.get('amount') || '0').replace(',', '.'))
  const yieldRate = parseFloat(String(formData.get('yield_rate') || '0').replace(',', '.'))
  const date = String(formData.get('date') || new Date().toISOString().split('T')[0])

  if (isNaN(amount) || amount < 0) return { error: 'Valor do ativo inválido' }

  const { error } = await supabase
    .from('investments')
    .update({
      name,
      type,
      amount,
      yield_rate: isNaN(yieldRate) ? 0.00 : yieldRate,
      date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteInvestment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
