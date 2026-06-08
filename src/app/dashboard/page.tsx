import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Verify session securely on the server
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Handle logout
  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      {/* Top Navbar */}
      <nav className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 px-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden relative border border-gray-100 bg-gray-50">
            <Image src="/images/webp/logosemfundo.webp" alt="Finnly Logo" fill className="object-contain scale-75" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#016B4C]">Finnly Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600 hidden md:inline-flex">
            {user.email}
          </span>
          <form action={signOut}>
            <button className="text-sm font-bold text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors border border-transparent hover:border-red-100">
              Sair da conta
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 max-w-7xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            Olá, seja bem-vindo(a) ao Finnly! 🎉
          </h1>
          <p className="text-gray-500 text-lg">
            Sua conta foi criada/autenticada com sucesso no Supabase.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] col-span-1 md:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Informações da Sessão Ativa</h2>
            <div className="bg-gray-50 rounded-xl p-4 overflow-auto border border-gray-100 text-xs text-gray-600 font-mono">
              <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#016B4C] to-[#014A34] p-8 rounded-3xl text-white shadow-lg flex flex-col justify-between min-h-[250px]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 border border-white/20">
                <svg className="w-6 h-6 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">Autenticação Concluída</h3>
              <p className="text-emerald-100 text-sm opacity-90 leading-relaxed">
                Você implementou corretamente o Next.js App Router com o Supabase SSR. Este conteúdo é 100% protegido via Server Component.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
