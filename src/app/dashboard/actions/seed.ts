'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function seedMockData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  const userId = user.id

  try {
    // 1. Limpar dados anteriores para evitar duplicações no teste
    await Promise.all([
      supabase.from('transfers').delete().eq('user_id', userId),
      supabase.from('expenses').delete().eq('user_id', userId),
      supabase.from('incomes').delete().eq('user_id', userId),
      supabase.from('investments').delete().eq('user_id', userId),
      supabase.from('credit_cards').delete().eq('user_id', userId),
      supabase.from('accounts').delete().eq('user_id', userId),
      supabase.from('expense_categories').delete().eq('user_id', userId),
      supabase.from('financial_streaks').delete().eq('user_id', userId),
      supabase.from('user_achievements').delete().eq('user_id', userId),
      supabase.from('subscriptions').delete().eq('user_id', userId),
    ])

    // 2. Inserir Contas Bancárias
    const { data: accounts, error: accErr } = await supabase.from('accounts').insert([
      { user_id: userId, name: 'Banco do Brasil', type: 'corrente', balance: 3450.00, color: '#FFB300' },
      { user_id: userId, name: 'Nubank Corrente', type: 'corrente', balance: 1890.20, color: '#7B1FA2' },
      { user_id: userId, name: 'Reserva de Emergência', type: 'poupanca', balance: 10000.00, color: '#01584C' }
    ]).select()

    if (accErr) throw accErr

    const bbId = accounts?.find(a => a.name === 'Banco do Brasil')?.id
    const nuId = accounts?.find(a => a.name === 'Nubank Corrente')?.id
    const reserveId = accounts?.find(a => a.name === 'Reserva de Emergência')?.id

    // 3. Inserir Cartões de Crédito
    const { data: cards, error: cardErr } = await supabase.from('credit_cards').insert([
      { user_id: userId, name: 'Mastercard Black Nu', limit: 5000.00, closing_day: 3, due_day: 10, color: '#7B1FA2' },
      { user_id: userId, name: 'Visa Gold Inter', limit: 3000.00, closing_day: 18, due_day: 25, color: '#F57C00' }
    ]).select()

    if (cardErr) throw cardErr

    const nuCardId = cards?.find(c => c.name === 'Mastercard Black Nu')?.id
    const interCardId = cards?.find(c => c.name === 'Visa Gold Inter')?.id

    // 4. Inserir Categorias Customizadas
    await supabase.from('expense_categories').insert([
      { user_id: userId, name: 'Alimentação', color: '#F57C00', icon: 'UtensilsCrossed' },
      { user_id: userId, name: 'Transporte', color: '#FFB300', icon: 'Car' },
      { user_id: userId, name: 'Lazer', color: '#0288D1', icon: 'Film' },
      { user_id: userId, name: 'Moradia', color: '#01584C', icon: 'Home' },
      { user_id: userId, name: 'Saúde', color: '#EF4444', icon: 'Shield' }
    ])

    // 5. Inserir Receitas
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const nextMm = String((today.getMonth() + 2) % 12 || 12).padStart(2, '0')
    const nextYyyy = today.getMonth() + 2 > 12 ? yyyy + 1 : yyyy

    await supabase.from('incomes').insert([
      { user_id: userId, account_id: bbId, description: 'Salário CLT', amount: 5500.00, category: 'Salário', date: `${yyyy}-${mm}-05`, payment_status: true },
      { user_id: userId, account_id: nuId, description: 'Pix Freelance', amount: 1500.00, category: 'Outros', date: `${yyyy}-${mm}-18`, payment_status: true },
      { user_id: userId, account_id: nuId, description: 'Bônus Semestral', amount: 2000.00, category: 'Prêmios', date: `${nextYyyy}-${nextMm}-05`, payment_status: false }
    ])

    // 6. Inserir Despesas
    await supabase.from('expenses').insert([
      // Pagas (Débito)
      { user_id: userId, account_id: bbId, description: 'Supermercado Carrefour', amount: 450.00, category: 'Alimentação', date: `${yyyy}-${mm}-03`, payment_status: true },
      { user_id: userId, account_id: nuId, description: 'Gasolina Ipiranga', amount: 180.00, category: 'Transporte', date: `${yyyy}-${mm}-07`, payment_status: true },
      { user_id: userId, account_id: bbId, description: 'Academia', amount: 119.90, category: 'Saúde', date: `${yyyy}-${mm}-10`, payment_status: true },
      // No Cartão de Crédito
      { user_id: userId, credit_card_id: nuCardId, description: 'Jantar Restaurante', amount: 120.00, category: 'Alimentação', date: `${yyyy}-${mm}-12`, payment_status: false },
      { user_id: userId, credit_card_id: nuCardId, description: 'Cinema', amount: 48.00, category: 'Lazer', date: `${yyyy}-${mm}-14`, payment_status: false },
      // Parcelada em 3x
      { user_id: userId, credit_card_id: interCardId, description: 'Curso Inglês (1/3)', amount: 100.00, category: 'Educação', date: `${yyyy}-${mm}-20`, payment_status: false, installments_total: 3, installment_number: 1 },
      { user_id: userId, credit_card_id: interCardId, description: 'Curso Inglês (2/3)', amount: 100.00, category: 'Educação', date: `${nextYyyy}-${nextMm}-20`, payment_status: false, installments_total: 3, installment_number: 2 }
    ])

    // 7. Inserir Investimentos
    await supabase.from('investments').insert([
      { user_id: userId, name: 'Tesouro SELIC 2029', type: 'renda_fixa', amount: 6000.00, yield_rate: 10.75, date: `${yyyy}-${mm}-01` },
      { user_id: userId, name: 'PETR4', type: 'acoes', amount: 2500.00, yield_rate: 12.20, date: `${yyyy}-${mm}-01` },
      { user_id: userId, name: 'MXRF11', type: 'fiis', amount: 1500.00, yield_rate: 9.85, date: `${yyyy}-${mm}-01` }
    ])

    // 8. Inserir Ofensiva (Streaks) & Conquistas
    await supabase.from('financial_streaks').insert({
      user_id: userId,
      current_streak: 5,
      longest_streak: 12,
      last_activity_date: `${yyyy}-${mm}-${String(today.getDate()).padStart(2, '0')}`
    })

    await supabase.from('user_achievements').insert([
      { user_id: userId, achievement_key: 'primeiro_passo' },
      { user_id: userId, achievement_key: 'escudo_ativo' }
    ])

    // 9. Inserir Assinaturas (Subscriptions)
    await supabase.from('subscriptions').insert([
      { user_id: userId, name: 'Netflix', amount: 55.90, due_day: 10, category: 'Lazer', last_paid_month: `${yyyy}-${mm}` },
      { user_id: userId, name: 'Spotify Premium', amount: 24.90, due_day: 15, category: 'Lazer' },
      { user_id: userId, name: 'Conta de Energia', amount: 180.00, due_day: 22, category: 'Moradia' }
    ])

    revalidatePath('/dashboard', 'layout')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao semear dados fictícios:', err)
    return { error: err.message || 'Erro ao popular dados' }
  }
}
