import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { DashboardApp } from '@/components/dashboard/DashboardApp'
import { getDashboardData } from '@/lib/data'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  // Verifica onboarding
  const { data: profile } = await supabase
    .from('financial_profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  const fullName: string =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Você'

  const initial = (fullName[0] ?? 'V').toUpperCase()

  const dashboardData = await getDashboardData(user.id)

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
  }

  return (
    <DashboardApp
      userName={fullName}
      userInitial={initial}
      dashboardData={dashboardData}
      signOut={signOut}
    />
  )
}
