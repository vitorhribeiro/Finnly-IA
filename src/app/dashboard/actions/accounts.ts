'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { Account } from '@/types/database'

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return []

  // Inicializa conta padrão caso não exista nenhuma conta cadastrada
  if (accounts.length === 0) {
    const { data: newAccount, error: createError } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name: 'Carteira Principal',
        type: 'carteira',
        balance: 0.00,
        color: '#01584C',
      })
      .select()
      .single()

    if (!createError && newAccount) {
      return [newAccount as Account]
    }
  }

  return (accounts ?? []) as Account[]
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'Nome da conta é obrigatório' }

  const type = String(formData.get('type') || 'corrente') as Account['type']
  const balance = parseFloat(String(formData.get('balance') || '0').replace(',', '.'))
  const color = String(formData.get('color') || '#01584C')

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      name,
      type,
      balance: isNaN(balance) ? 0.00 : balance,
      initial_balance: isNaN(balance) ? 0.00 : balance,
      color,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true, account: data as Account }
}

export async function updateAccount(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'Nome da conta é obrigatório' }

  const type = String(formData.get('type') || 'corrente') as Account['type']
  const balance = parseFloat(String(formData.get('balance') || '0').replace(',', '.'))
  const color = String(formData.get('color') || '#01584C')

  const { error } = await supabase
    .from('accounts')
    .update({
      name,
      type,
      balance: isNaN(balance) ? 0.00 : balance,
      initial_balance: isNaN(balance) ? 0.00 : balance,
      color,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function verifyAccountBalanceAction(accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data, error } = await supabase
    .rpc('verify_account_balance', { account_uuid: accountId })
    .single()

  if (error) return { error: error.message }
  
  const balanceData = data as any
  return { 
    success: true, 
    savedBalance: Number(balanceData.saved_balance), 
    calculatedBalance: Number(balanceData.calculated_balance), 
    isConsistent: balanceData.is_consistent 
  }
}

export async function syncAccountBalanceAction(accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data, error } = await supabase
    .rpc('sync_account_balance', { account_uuid: accountId })

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true, newBalance: Number(data) }
}

export async function syncAllUserAccountsBalances() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: accounts, error: accError } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)

  if (accError) return { error: accError.message }

  const syncPromises = accounts.map(acc => 
    supabase.rpc('sync_account_balance', { account_uuid: acc.id })
  )

  const results = await Promise.all(syncPromises)
  const error = results.find(r => r.error)?.error
  if (error) return { error: error.message }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
