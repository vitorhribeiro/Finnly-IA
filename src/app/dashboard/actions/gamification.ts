'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { UserStreak } from '@/types/database'

export async function getGamificationData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { streak: null, achievements: [] }

  // 1. Obter ou criar a ofensiva (streak) do usuário
  const { data: streakData, error: streakError } = await supabase
    .from('financial_streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  let streak: UserStreak | null = null

  if (streakError || !streakData) {
    // Criar registro inicial
    const { data: newStreak } = await supabase
      .from('financial_streaks')
      .insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_active_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    streak = newStreak as UserStreak
  } else {
    streak = streakData as UserStreak
    const todayStr = new Date().toISOString().split('T')[0]
    const lastActiveStr = streak.last_active_date

    if (lastActiveStr !== todayStr) {
      const today = new Date(todayStr)
      const lastActive = new Date(lastActiveStr)
      const diffTime = Math.abs(today.getTime() - lastActive.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let nextStreak = streak.current_streak
      let longest = streak.longest_streak

      if (diffDays === 1) {
        // Logou no dia seguinte consecutivo, incrementa streak
        nextStreak += 1
        if (nextStreak > longest) longest = nextStreak
      } else if (diffDays > 1) {
        // Quebrou a ofensiva, reseta para 1
        nextStreak = 1
      }

      const { data: updatedStreak } = await supabase
        .from('financial_streaks')
        .update({
          current_streak: nextStreak,
          longest_streak: longest,
          last_active_date: todayStr,
          updated_at: new Date().toISOString()
        })
        .eq('id', streak.id)
        .select()
        .single()

      if (updatedStreak) streak = updatedStreak as UserStreak
    }
  }

  // 2. Buscar as conquistas desbloqueadas do usuário
  const { data: achievementsData } = await supabase
    .from('user_achievements')
    .select('achievement_key')
    .eq('user_id', user.id)

  const achievements = (achievementsData ?? []).map(a => a.achievement_key)

  // 3. Verificar dinamicamente e desbloquear novas medalhas se aplicável
  await checkAndUnlockAchievements(user.id, achievements)

  return {
    streak,
    achievements
  }
}

export async function checkAndUnlockAchievements(userId: string, currentKeys: string[]) {
  const supabase = await createClient()

  // Conquista: "Primeiro Passo" (adicionou alguma conta ou transação)
  if (!currentKeys.includes('primeiro_passo')) {
    const [incomes, expenses] = await Promise.all([
      supabase.from('incomes').select('id').eq('user_id', userId).limit(1),
      supabase.from('expenses').select('id').eq('user_id', userId).limit(1)
    ])
    if ((incomes.data ?? []).length > 0 || (expenses.data ?? []).length > 0) {
      await unlockAchievement(userId, 'primeiro_passo')
    }
  }

  // Conquista: "Escudo Ativo" (tem reserva de emergência >= 6 meses no perfil financeiro)
  if (!currentKeys.includes('escudo_ativo')) {
    const { data: profile } = await supabase
      .from('financial_profiles')
      .select('has_emergency_fund')
      .eq('user_id', userId)
      .single()

    if (profile?.has_emergency_fund) {
      await unlockAchievement(userId, 'escudo_ativo')
    }
  }

  // Conquista: "Investidor" (tem pelo menos um ativo em investimentos)
  if (!currentKeys.includes('investidor')) {
    const { data: assets } = await supabase
      .from('investments')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if ((assets ?? []).length > 0) {
      await unlockAchievement(userId, 'investidor')
    }
  }

  // Conquista: "Foco Semanal" (streak de 7 dias ou mais)
  if (!currentKeys.includes('foco_semanal')) {
    const { data: streak } = await supabase
      .from('financial_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single()

    if (streak && streak.current_streak >= 7) {
      await unlockAchievement(userId, 'foco_semanal')
    }
  }
}

async function unlockAchievement(userId: string, key: string) {
  const supabase = await createClient()
  try {
    await supabase.from('user_achievements').upsert({
      user_id: userId,
      achievement_key: key
    })
  } catch (err) {
    console.error(`Erro ao desbloquear conquista: ${key}`, err)
  }
}
