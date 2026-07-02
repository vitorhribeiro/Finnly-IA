'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { Transfer } from '@/types/database'

export async function getTransfers(): Promise<Transfer[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(100)

  if (error) return []
  return (data ?? []) as Transfer[]
}

export async function createTransfer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const amount = parseFloat(String(formData.get('amount') || '').replace(',', '.'))
  if (isNaN(amount) || amount <= 0) return { error: 'Valor de transferência inválido' }

  const sourceAccountId = String(formData.get('source_account_id'))
  const destinationAccountId = String(formData.get('destination_account_id'))
  const date = String(formData.get('date') || new Date().toISOString().split('T')[0])
  const description = String(formData.get('description') || '').trim() || null

  if (sourceAccountId === destinationAccountId) {
    return { error: 'As contas de origem e destino devem ser diferentes' }
  }

  // 1. Obter saldos atuais das contas
  const [sourceRes, destRes] = await Promise.all([
    supabase.from('accounts').select('balance, name').eq('id', sourceAccountId).eq('user_id', user.id).single(),
    supabase.from('accounts').select('balance, name').eq('id', destinationAccountId).eq('user_id', user.id).single()
  ])

  if (sourceRes.error || !sourceRes.data) return { error: 'Conta de origem não encontrada' }
  if (destRes.error || !destRes.data) return { error: 'Conta de destino não encontrada' }

  const newSourceBalance = Number(sourceRes.data.balance) - amount
  const newDestBalance = Number(destRes.data.balance) + amount

  // 2. Atualizar saldos das contas e inserir registro de transferência
  const updateSource = supabase.from('accounts').update({ balance: newSourceBalance }).eq('id', sourceAccountId)
  const updateDest = supabase.from('accounts').update({ balance: newDestBalance }).eq('id', destinationAccountId)
  
  const insertTransfer = supabase.from('transfers').insert({
    user_id: user.id,
    amount,
    source_account_id: sourceAccountId,
    destination_account_id: destinationAccountId,
    date,
    description: description || `Transf. de ${sourceRes.data.name} para ${destRes.data.name}`
  })

  const [resSource, resDest, resInsert] = await Promise.all([updateSource, updateDest, insertTransfer])

  if (resSource.error) return { error: `Erro na conta de origem: ${resSource.error.message}` }
  if (resDest.error) return { error: `Erro na conta de destino: ${resDest.error.message}` }
  if (resInsert.error) return { error: `Erro ao registrar transferência: ${resInsert.error.message}` }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
