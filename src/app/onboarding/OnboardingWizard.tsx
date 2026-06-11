'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Target, Wallet, Calendar, Shield, CreditCard, Smartphone, ArrowRight, Check } from 'lucide-react'
import { saveOnboarding, type OnboardingData } from './actions'

const GOALS = [
  { value: 'reserva', label: 'Construir reserva de emergência', Icon: Shield },
  { value: 'dividas', label: 'Quitar dívidas', Icon: CreditCard },
  { value: 'viagem', label: 'Realizar uma viagem', Icon: Target },
  { value: 'investir', label: 'Começar a investir', Icon: Wallet },
  { value: 'controle', label: 'Ter controle financeiro', Icon: Smartphone },
  { value: 'outro', label: 'Outro objetivo', Icon: Sparkles },
]

const FREQUENCIES = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'irregular', label: 'Irregular' },
]

interface StepProps {
  data: OnboardingData
  set: (key: keyof OnboardingData, value: string) => void
  next: () => void
  back?: () => void
}

function StepGoal({ data, set, next }: StepProps) {
  return (
    <div className="ob-step">
      <p className="ob-q">Qual é o seu <b>principal objetivo</b> financeiro agora?</p>
      <div className="ob-grid">
        {GOALS.map(g => (
          <button
            key={g.value}
            className={`ob-option${data.main_goal === g.value ? ' on' : ''}`}
            onClick={() => { set('main_goal', g.value); next() }}
          >
            <g.Icon size={22} />
            <span>{g.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function StepIncome({ data, set, next, back }: StepProps) {
  function handleNext() {
    if (!data.monthly_income) return
    next()
  }

  return (
    <div className="ob-step">
      <p className="ob-q">Qual é a sua <b>renda mensal aproximada</b>?</p>
      <div className="ob-field">
        <label className="ob-label">Valor em reais</label>
        <div className="ob-input-wrap">
          <span className="ob-cur">R$</span>
          <input
            className="ob-input"
            type="number"
            min="0"
            placeholder="3.000"
            value={data.monthly_income}
            onChange={e => set('monthly_income', e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleNext() }}
            autoFocus
          />
        </div>
      </div>
      <p className="ob-q" style={{ marginTop: 28 }}>Com que <b>frequência</b> você recebe?</p>
      <div className="ob-row">
        {FREQUENCIES.map(f => (
          <button
            key={f.value}
            className={`ob-chip${data.income_frequency === f.value ? ' on' : ''}`}
            onClick={() => set('income_frequency', f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="ob-actions">
        <button className="ob-back" onClick={back}>Voltar</button>
        <button className="ob-next" onClick={handleNext} disabled={!data.monthly_income}>
          Continuar <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}

function StepProfile({ data, set, next, back }: StepProps) {
  return (
    <div className="ob-step">
      <p className="ob-q">Você tem uma <b>reserva de emergência</b>?</p>
      <div className="ob-row">
        {[['true', 'Sim, tenho'], ['false', 'Ainda não']].map(([v, l]) => (
          <button key={v} className={`ob-chip${data.has_emergency_fund === v ? ' on' : ''}`} onClick={() => set('has_emergency_fund', v)}>
            {l}
          </button>
        ))}
      </div>

      <p className="ob-q" style={{ marginTop: 32 }}>Você tem <b>dívidas</b> em aberto?</p>
      <div className="ob-row">
        {[['true', 'Sim, tenho'], ['false', 'Não tenho']].map(([v, l]) => (
          <button key={v} className={`ob-chip${data.has_debts === v ? ' on' : ''}`} onClick={() => set('has_debts', v)}>
            {l}
          </button>
        ))}
      </div>

      <div className="ob-actions">
        <button className="ob-back" onClick={back}>Voltar</button>
        <button
          className="ob-next"
          onClick={next}
          disabled={!data.has_emergency_fund || !data.has_debts}
        >
          Continuar <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}

function StepUsage({ data, set, onSubmit, back, isPending }: StepProps & { onSubmit: () => void; isPending: boolean }) {
  return (
    <div className="ob-step">
      <p className="ob-q">Como você prefere <b>usar o Finnly</b>?</p>
      <div className="ob-grid ob-grid-3">
        {[
          { value: 'app', label: 'Pelo app', desc: 'Dashboard completo no navegador' },
          { value: 'whatsapp', label: 'Pelo WhatsApp', desc: 'Gerencie por mensagens' },
          { value: 'ambos', label: 'Ambos', desc: 'App + WhatsApp juntos' },
        ].map(opt => (
          <button
            key={opt.value}
            className={`ob-option${data.preferred_usage === opt.value ? ' on' : ''}`}
            onClick={() => set('preferred_usage', opt.value)}
          >
            <Smartphone size={22} />
            <span>{opt.label}</span>
            <small>{opt.desc}</small>
          </button>
        ))}
      </div>
      <div className="ob-actions">
        <button className="ob-back" onClick={back}>Voltar</button>
        <button
          className="ob-next ob-finish"
          onClick={onSubmit}
          disabled={!data.preferred_usage || isPending}
        >
          {isPending ? 'Salvando…' : <>Entrar no Finnly <Check size={18} /></>}
        </button>
      </div>
    </div>
  )
}

const TOTAL_STEPS = 4

export default function OnboardingWizard({ userName }: { userName: string }) {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<OnboardingData>({
    main_goal: '',
    monthly_income: '',
    income_frequency: 'mensal',
    has_emergency_fund: '',
    has_debts: '',
    preferred_usage: '',
  })

  function set(key: keyof OnboardingData, value: string) {
    setFormData(d => ({ ...d, [key]: value }))
  }

  function handleSubmit() {
    startTransition(async () => {
      await saveOnboarding(formData)
    })
  }

  const firstName = userName.split(' ')[0]

  return (
    <>
      <style>{`
        .ob-root {
          min-height: 100vh;
          background: #FAF6EF;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .ob-card {
          background: #fff;
          border-radius: 24px;
          padding: 48px 52px;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 4px 32px rgba(0,0,0,.08);
        }
        .ob-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 22px;
          font-weight: 800;
          color: #01584C;
          margin-bottom: 36px;
        }
        .ob-brand svg { color: #F57C00; }
        .ob-progress {
          display: flex;
          gap: 6px;
          margin-bottom: 36px;
        }
        .ob-prog-dot {
          height: 4px;
          border-radius: 4px;
          flex: 1;
          background: #E9EFEC;
          transition: background .3s;
        }
        .ob-prog-dot.done { background: #01584C; }
        .ob-greet {
          font-size: 26px;
          font-weight: 800;
          color: #1A1A1A;
          margin-bottom: 6px;
        }
        .ob-sub {
          color: #666;
          font-size: 15px;
          margin-bottom: 36px;
          line-height: 1.5;
        }
        .ob-step {}
        .ob-q {
          font-size: 17px;
          color: #333;
          margin-bottom: 18px;
          line-height: 1.5;
        }
        .ob-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 8px;
        }
        .ob-grid-3 {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .ob-option {
          background: #FAF6EF;
          border: 2px solid transparent;
          border-radius: 14px;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          cursor: pointer;
          text-align: left;
          transition: all .15s;
          font-family: inherit;
        }
        .ob-option:hover { border-color: #01584C22; background: #F0F7F5; }
        .ob-option.on { border-color: #01584C; background: #F0F7F5; }
        .ob-option svg { color: #01584C; }
        .ob-option span { font-size: 14px; font-weight: 600; color: #222; }
        .ob-option small { font-size: 12px; color: #888; }
        .ob-field { display: flex; flex-direction: column; gap: 6px; }
        .ob-label { font-size: 13px; font-weight: 600; color: #555; }
        .ob-input-wrap { display: flex; align-items: center; gap: 0; border: 2px solid #E9EFEC; border-radius: 12px; overflow: hidden; background: #FAF6EF; }
        .ob-cur { padding: 14px 14px 14px 18px; font-weight: 700; color: #01584C; font-size: 16px; }
        .ob-input { border: none; background: transparent; padding: 14px 18px 14px 4px; font-size: 20px; font-weight: 700; color: #1A1A1A; width: 100%; outline: none; font-family: inherit; }
        .ob-input:focus ~ .ob-input-wrap, .ob-input-wrap:focus-within { border-color: #01584C; }
        .ob-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .ob-chip { padding: 10px 20px; border-radius: 100px; border: 2px solid #E9EFEC; background: #FAF6EF; font-size: 14px; font-weight: 600; color: #444; cursor: pointer; font-family: inherit; transition: all .15s; }
        .ob-chip:hover { border-color: #01584C44; }
        .ob-chip.on { border-color: #01584C; background: #01584C; color: #fff; }
        .ob-actions { display: flex; align-items: center; gap: 12px; margin-top: 36px; }
        .ob-back { background: none; border: none; color: #888; font-size: 15px; font-weight: 600; cursor: pointer; padding: 0 4px; font-family: inherit; }
        .ob-back:hover { color: #333; }
        .ob-next { margin-left: auto; display: flex; align-items: center; gap: 8px; background: #01584C; color: #fff; border: none; border-radius: 100px; padding: 13px 28px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background .15s; }
        .ob-next:hover:not(:disabled) { background: #0D3D37; }
        .ob-next:disabled { opacity: .5; cursor: not-allowed; }
        .ob-finish { background: linear-gradient(135deg, #F57C00, #FFB300); }
        .ob-finish:hover:not(:disabled) { background: linear-gradient(135deg, #E65100, #F57C00); }
        @media (max-width: 560px) {
          .ob-card { padding: 32px 24px; }
          .ob-grid, .ob-grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="ob-root">
        <div className="ob-card">
          <div className="ob-brand">
            <Sparkles size={26} />
            Finnly
          </div>

          <div className="ob-progress">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`ob-prog-dot${i <= step ? ' done' : ''}`} />
            ))}
          </div>

          {step === 0 && (
            <div className="ob-greet">Olá, <span style={{ color: '#01584C' }}>{firstName}</span>! 👋</div>
          )}
          <p className="ob-sub">
            {step === 0 && 'Vamos configurar seu Finnly em 4 passos rápidos para personalizar sua experiência.'}
            {step === 1 && 'Essas informações ajudam o Finnly a calcular seu score e planejar seus gastos.'}
            {step === 2 && 'Entender sua situação atual permite insights mais precisos.'}
            {step === 3 && 'Você pode mudar isso nas configurações a qualquer momento.'}
          </p>

          {step === 0 && <StepGoal data={formData} set={set} next={() => setStep(1)} />}
          {step === 1 && <StepIncome data={formData} set={set} next={() => setStep(2)} back={() => setStep(0)} />}
          {step === 2 && <StepProfile data={formData} set={set} next={() => setStep(3)} back={() => setStep(1)} />}
          {step === 3 && <StepUsage data={formData} set={set} next={() => {}} back={() => setStep(2)} onSubmit={handleSubmit} isPending={isPending} />}
        </div>
      </div>
    </>
  )
}
