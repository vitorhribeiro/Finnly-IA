import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { DashboardApp } from '@/components/dashboard/DashboardApp'
import { getDashboardData } from '@/lib/data'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
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

  const params = await searchParams
  const month = typeof params.month === 'string' ? params.month : undefined

  const dashboardData = await getDashboardData(user.id, month)

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
      selectedMonthParam={month}
      signOut={signOut}
    />
  )
}
