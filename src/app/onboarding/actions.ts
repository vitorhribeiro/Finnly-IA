'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export interface OnboardingData {
  main_goal: string
  monthly_income: string
  income_frequency: string
  has_emergency_fund: string
  has_debts: string
  preferred_usage: string
}

export async function saveOnboarding(data: OnboardingData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const payload = {
    user_id: user.id,
    main_goal: data.main_goal,
    monthly_income: parseFloat(data.monthly_income.replace(/\./g, '').replace(',', '.')) || null,
    income_frequency: data.income_frequency,
    has_emergency_fund: data.has_emergency_fund === 'true',
    has_debts: data.has_debts === 'true',
    preferred_usage: data.preferred_usage,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('financial_profiles')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
