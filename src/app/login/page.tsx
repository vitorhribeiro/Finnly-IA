'use client';

import { useState, startTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, AlertCircle, Eye, EyeOff, MessageSquare, Target, Phone } from 'lucide-react';
import { login, signup, signInWithProvider } from './actions';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FinnlyAuthBackground } from '@/components/ui/FinnlyAuthBackground';

const INPUT_CLASS =
  'w-full h-12 bg-[#F7FAF8] border border-[#E2EDE8] rounded-2xl px-4 pl-11 text-gray-900 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#016B4C]/15 focus:border-[#01A374] focus:bg-white transition-all';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParams = searchParams.get('error');
  const modeParam = searchParams.get('mode');

  const [isLogin, setIsLogin] = useState(modeParam === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorParams);
  const [showPassword, setShowPassword] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const toggleMode = () => {
    if (isWiping) return;
    setIsWiping(true);
    setTimeout(() => {
      setIsLogin(!isLogin);
      setError(null);
      setIsWiping(false);
    }, 450);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (isLogin) {
      setLoading(true);
      startTransition(() => {
        login(formData).then((result) => {
          if (result?.error) {
            setError(result.error);
            setLoading(false);
          }
        });
      });
    } else {
      setPendingFormData(formData);
      setShowTermsModal(true);
    }
  };

  const confirmRegistration = () => {
    if (!pendingFormData || !acceptedTerms) return;
    setLoading(true);
    setShowTermsModal(false);
    startTransition(() => {
      signup(pendingFormData).then((result) => {
        if (result?.error) {
          setError(result.error);
          setLoading(false);
        }
      });
    });
  };

  return (
    <FinnlyAuthBackground>
      <div className="w-full max-w-[1200px] h-full max-h-[850px] flex flex-col lg:flex-row relative z-10 font-sans p-0 lg:p-6">

        {/* LEFT: Institutional — desktop only */}
        <div className="hidden lg:flex w-full lg:w-[55%] pt-4 pb-4 lg:pr-8 relative flex-col justify-between h-full">
          <div className="relative z-20 flex flex-col h-full justify-center">
            <div className="flex items-center mb-1 cursor-pointer" onClick={() => router.push('/')}>
              <div className="relative w-20 h-20">
                <Image src="/images/logosemfundo.png" alt="Finnly Logo" fill className="object-contain" />
              </div>
              <span className="text-4xl font-black tracking-tight text-[#016B4C] -ml-2">Finnly</span>
            </div>
            <p className="text-[#016B4C]/80 font-semibold text-xs mb-6">Seu consultor financeiro com IA.</p>

            <h1 className="text-3xl xl:text-[2.2rem] font-extrabold tracking-tight leading-[1.15] mb-4">
              <span className="text-[#016B4C] block mb-1">Inteligência que<br />entende suas finanças.</span>
              <span className="text-[#F57C00] block">Você no controle<br />dos seus sonhos.</span>
            </h1>

            <p className="text-gray-600 text-sm xl:text-base max-w-sm leading-relaxed font-medium mb-6">
              Organize seu dinheiro, crie metas e tome decisões melhores com o apoio da inteligência artificial do Finnly.
            </p>

            <div className="flex flex-col gap-3 mb-6 max-w-sm relative z-20">
              {[
                { icon: <MessageSquare className="w-4 h-4" />, label: 'Consultoria financeira\ncom IA 24h por dia' },
                { icon: <Target className="w-4 h-4" />, label: 'Metas personalizadas\ne acompanhamento' },
                { icon: <Phone className="w-4 h-4" />, label: 'Fale com o Finnly\ntambém pelo WhatsApp' },
              ].map((item, i) => (
                <div key={i} className="bg-white py-2 px-3 pr-5 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] flex items-center gap-3 w-fit border border-gray-50">
                  <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-[#016B4C] shrink-0">
                    {item.icon}
                  </div>
                  <span className="font-bold text-gray-900 text-xs leading-tight whitespace-pre-line">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block absolute bottom-0 right-[-5%] w-[380px] h-[500px] z-10 pointer-events-none">
            <Image src="/images/webp/ola.webp" alt="Mascote Finnly" fill className="object-contain object-bottom drop-shadow-2xl" priority />
          </div>
        </div>

        {/* RIGHT: Form panel */}
        <div className="w-full lg:w-[45%] flex items-center justify-center relative z-30 h-full">
          <div className="bg-white w-full lg:max-w-[440px] rounded-none lg:rounded-[2rem] shadow-none lg:shadow-[0_20px_60px_rgba(0,0,0,0.06)] border-0 lg:border lg:border-gray-100 flex flex-col h-full lg:h-[680px] overflow-hidden relative">

            {/* Wave overlay */}
            <AnimatePresence>
              {isWiping && (
                <motion.div
                  initial={{ top: '100%' }}
                  animate={{ top: '-10%', transition: { duration: 0.45, ease: 'easeOut' } }}
                  exit={{ top: '100%', transition: { duration: 0.45, ease: 'easeIn' } }}
                  className="absolute left-[-20%] w-[140%] h-[120%] bg-[#01A374] z-50 pointer-events-none shadow-[0_-10px_30px_rgba(1,107,76,0.3)]"
                  style={{ borderTopLeftRadius: '50%', borderTopRightRadius: '50%' }}
                />
              )}
            </AnimatePresence>

            <div className="w-full h-full px-6 pt-20 pb-8 lg:p-10 flex flex-col justify-center overflow-y-auto overflow-x-hidden custom-scrollbar z-10 relative">

              {/* Logo — mobile only */}
              <div className="flex lg:hidden flex-col items-center justify-center mb-8 gap-1">
                <div className="relative w-12 h-12">
                  <Image src="/images/logosemfundo.png" alt="Finnly Logo" fill className="object-contain" />
                </div>
                <span className="text-2xl font-black tracking-tight text-[#016B4C]">Finnly</span>
              </div>

              <div className="mb-7 text-center lg:text-left">
                <h2 className="text-[1.75rem] md:text-3xl font-extrabold text-[#016B4C] tracking-tight mb-1.5 flex items-baseline justify-center lg:justify-start">
                  {isLogin ? 'Entrar na conta' : 'Criar nova conta'}
                  <span className="text-[#F57C00] text-3xl ml-0.5">.</span>
                </h2>
                <p className="text-gray-400 font-medium text-sm">
                  {isLogin ? 'Que bom ver você novamente.' : 'É rápido, fácil e gratuito.'}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-2 text-red-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-5">

                {!isLogin && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600" htmlFor="full_name">Nome completo</label>
                    <div className="relative">
                      <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        required={!isLogin}
                        placeholder="Digite seu nome completo"
                        className={INPUT_CLASS}
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#01A374]">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-600" htmlFor="email">E-mail</label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="Digite seu melhor e-mail"
                      className={INPUT_CLASS}
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#01A374]">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-600" htmlFor="password">Senha</label>
                    {isLogin && (
                      <a href="#" className="text-[11px] font-bold text-[#016B4C] hover:text-[#01A374] transition-colors">
                        Esqueceu a senha?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder={isLogin ? 'Digite sua senha' : 'Crie uma senha segura'}
                      className={`${INPUT_CLASS} pr-11`}
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#01A374]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!isLogin && (
                    <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                      Use pelo menos 8 caracteres com letras e números.
                    </span>
                  )}
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-[#F57C00] to-[#FF9800] hover:from-[#E67300] hover:to-[#F08900] disabled:opacity-60 text-white rounded-2xl font-bold shadow-[0_6px_20px_rgba(245,124,0,0.4)] hover:shadow-[0_4px_12px_rgba(245,124,0,0.3)] active:scale-[0.98] transition-all mt-1 text-sm tracking-wide"
                >
                  {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar conta gratuita'}
                </button>
              </form>

              <div className="relative flex items-center justify-center mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative bg-white px-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  ou
                </div>
              </div>

              <button
                type="button"
                onClick={() => signInWithProvider('google')}
                className="w-full flex items-center justify-center gap-3 h-12 bg-white border border-[#E2EDE8] rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.05)] mb-5 text-sm"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar com Google
              </button>

              <div className="text-center">
                <span className="text-xs font-semibold text-gray-400">
                  {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
                </span>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-[#016B4C] font-extrabold hover:text-[#01A374] transition-colors text-xs ml-1"
                >
                  {isLogin ? 'Criar grátis' : 'Entrar'}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-500 shadow-[0_2px_8px_rgba(0,0,0,0.1)] border border-gray-100 hover:text-gray-900 hover:bg-white active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      {/* Terms modal */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100"
            >
              <h3 className="text-xl font-extrabold text-[#016B4C] mb-2">Quase lá!</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Para finalizar a criação da sua conta no Finnly, precisamos que você leia e aceite nossos termos.
              </p>

              <label className="flex items-start gap-3 mb-8 cursor-pointer p-3 bg-gray-50 rounded-2xl border border-gray-200 hover:border-[#016B4C]/30 transition-colors">
                <input
                  type="checkbox"
                  className="mt-0.5 w-5 h-5 rounded text-[#01A374] focus:ring-[#01A374] border-gray-300"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span className="text-xs font-medium text-gray-700 leading-snug">
                  Eu li e concordo com os{' '}
                  <a href="#" className="font-bold text-[#016B4C] hover:underline">Termos de Uso</a> e a{' '}
                  <a href="#" className="font-bold text-[#016B4C] hover:underline">Política de Privacidade</a> do Finnly.
                </span>
              </label>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="h-11 px-4 font-bold border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-2xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!acceptedTerms || loading}
                  onClick={confirmRegistration}
                  className="h-11 px-4 bg-gradient-to-r from-[#F57C00] to-[#FF9800] hover:from-[#E67300] hover:to-[#F08900] disabled:opacity-50 text-white font-bold rounded-2xl shadow-[0_4px_12px_rgba(245,124,0,0.35)] text-sm transition-all"
                >
                  {loading ? 'Criando...' : 'Confirmar e Criar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
    </FinnlyAuthBackground>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-[#FAF8F5]" />}>
      <LoginContent />
    </Suspense>
  );
}

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
