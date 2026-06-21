'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutGrid, Receipt, Target, TrendingUp, CreditCard, Sparkles,
  Settings, Bell, ArrowUp, ArrowDown, Eye, EyeOff, Wallet,
  PiggyBank, Car, Plane, Shield, Calendar, ChevronRight, ChevronLeft,
  Check, Trophy, Coffee, Film, Zap, UtensilsCrossed, SlidersHorizontal,
  Calculator,
} from 'lucide-react'
import Image from 'next/image'
import { Ring, Donut, Sparkline } from './Charts'
import { ChatDrawer } from './ChatDrawer'
import { InfoTooltip } from './InfoTooltip'
import { ReceitasSection } from './sections/ReceitasSection'
import { DespesasSection } from './sections/DespesasSection'
import { MetasSection } from './sections/MetasSection'
import { createClient } from '@/utils/supabase/client'
import type { DashboardData, Transaction, CategorySummary, Goal, Subscription } from '@/types/database'
import { CATEGORY_COLORS } from '@/types/database'

// ============================================================ HELPERS

function currentMonthYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function brl(n: number, cents = false) {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })
}

function Money({ v, cents = false, cur = true, hidden }: { v: number; cents?: boolean; cur?: boolean; hidden?: boolean }) {
  return (
    <span className={`tabnums${hidden ? ' priv' : ''}`}>
      {cur && <span className="cur">R$</span>}
      {brl(v, cents)}
    </span>
  )
}

function txIcon(category: string, type: 'income' | 'expense') {
  if (type === 'income') return ArrowDown
  const map: Record<string, React.ElementType> = {
    Alimentação: UtensilsCrossed,
    Transporte: Car,
    Moradia: Shield,
    Lazer: Film,
    Saúde: PiggyBank,
    Cartões: CreditCard,
    Assinaturas: Film,
  }
  return map[category] ?? ArrowUp
}

function txTint(category: string, type: 'income' | 'expense') {
  if (type === 'income') return 't-green'
  const map: Record<string, string> = {
    Alimentação: 't-orange',
    Transporte: 't-gold',
    Moradia: 't-teal',
    Lazer: 't-teal',
    Cartões: 't-orange',
  }
  return map[category] ?? 't-teal'
}

// ============================================================ NEW WIDGETS

function EmergencyFundWidget({ reserveBalance, monthlyLivingCost, coverageMonths, coveragePct, hidden }: {
  reserveBalance: number
  monthlyLivingCost: number
  coverageMonths: number
  coveragePct: number
  hidden: boolean
}) {
  return (
    <section className="card fade-up" style={{ animationDelay: '100ms' }}>
      <CardHead
        Icon={PiggyBank}
        tint="t-teal"
        title="Termômetro de Emergência"
        right={
          <InfoTooltip
            Icon={Calculator}
            text={`Fórmula da cobertura: Saldo Reserva (R$ ${brl(reserveBalance)}) ÷ Custo de Vida Mensal (R$ ${brl(monthlyLivingCost)}). Custo de vida estimado em 70% da renda se despesas forem R$ 0.`}
          />
        }
      />

      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Meses cobertos</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--teal-900)' }}>
            {coverageMonths.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>/ 6 meses</span>
          </span>
        </div>

        {/* Thermometer Progress Bar */}
        <div className="thermometer-bar-container" style={{ margin: '12px 0' }}>
          <div className="thermometer-bar-fill" style={{ width: `${coveragePct}%` }} />
        </div>

        <div className="goal-meta" style={{ marginBottom: 12 }}>
          <span>Reserva total: <b><Money v={reserveBalance} hidden={hidden} /></b></span>
          <span>Custo de vida: <b><Money v={monthlyLivingCost} hidden={hidden} />/mês</b></span>
        </div>

        <div className="alloc-advice" style={{ marginTop: 8 }}>
          <p>
            {coverageMonths >= 6 ? (
              <span>🎉 <b>Excelente!</b> Sua reserva cobre mais de 6 meses do seu custo de vida atual. Você está seguro.</span>
            ) : coverageMonths >= 3 ? (
              <span>⚠️ <b>Quase lá.</b> Sua reserva cobre {coverageMonths.toFixed(1)} meses. O ideal recomendado pela IA são 6 meses.</span>
            ) : (
              <span>🚨 <b>Atenção.</b> Sua reserva cobre apenas {coverageMonths.toFixed(1)} meses. Tente poupar mais para atingir o mínimo de 6 meses.</span>
            )}
          </p>
        </div>
      </div>
    </section>
  )
}

function SubscriptionsWidget({
  subscriptions,
  activeMonth,
  hidden,
  onTogglePaid,
  onPopulateSamples,
  onAddSubscription,
}: {
  subscriptions: Subscription[]
  activeMonth: string
  hidden: boolean
  onTogglePaid: (sub: Subscription) => Promise<void>
  onPopulateSamples: () => Promise<void>
  onAddSubscription: (name: string, amount: number, dueDay: number, category: string) => Promise<void>
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('10')
  const [category, setCategory] = useState('Assinaturas')

  const totalAmount = subscriptions.reduce((sum, s) => sum + Number(s.amount), 0)
  const paidAmount = subscriptions
    .filter(s => s.last_paid_month === activeMonth)
    .reduce((sum, s) => sum + Number(s.amount), 0)
  const remainingAmount = totalAmount - paidAmount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmt = parseFloat(amount.replace(',', '.'))
    const numDue = parseInt(dueDay, 10)
    if (!name.trim() || isNaN(numAmt) || numAmt <= 0 || isNaN(numDue) || numDue < 1 || numDue > 31) return

    onAddSubscription(name.trim(), numAmt, numDue, category)
    setName('')
    setAmount('')
    setDueDay('10')
    setCategory('Assinaturas')
    setShowAdd(false)
  }

  return (
    <section className="card fade-up" style={{ animationDelay: '120ms' }}>
      <CardHead
        Icon={Calendar}
        tint="t-orange"
        title="Contas Fixas e Assinaturas"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {subscriptions.length > 0 && (
              <button
                onClick={() => setShowAdd(!showAdd)}
                style={{
                  background: 'var(--teal-tint)',
                  border: 'none',
                  color: 'var(--teal)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginRight: '6px'
                }}
              >
                {showAdd ? 'Fechar' : '+ Nova'}
              </button>
            )}
            <InfoTooltip
              Icon={Calculator}
              text="Fórmula: Total = Soma das assinaturas. Pago = Soma das pagas no mês ativo. Restante = Total - Pago."
            />
            <InfoTooltip
              text="Monitore suas contas recorrentes (mensalidades, assinaturas, contas de consumo). Clique no checkbox para marcar como pagas no mês ativo."
            />
          </div>
        }
      />

      {showAdd && (
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '12px',
          borderRadius: '8px',
          marginTop: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              placeholder="Nome (ex: Netflix)"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="ob-input"
              style={{ fontSize: 13, padding: '6px 10px', flex: 2 }}
            />
            <input
              placeholder="Valor (R$)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              className="ob-input"
              style={{ fontSize: 13, padding: '6px 10px', flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Vencimento (Dia)"
              value={dueDay}
              onChange={e => setDueDay(e.target.value)}
              required
              className="ob-input"
              style={{ fontSize: 13, padding: '6px 10px', flex: 1 }}
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="ob-input"
              style={{ fontSize: 13, padding: '6px 10px', flex: 1 }}
            >
              <option value="Assinaturas">Assinaturas</option>
              <option value="Moradia">Moradia (Luz, Água)</option>
              <option value="Lazer">Lazer</option>
              <option value="Saúde">Saúde</option>
              <option value="Educação">Educação</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: 12, alignSelf: 'flex-end' }}>
            Salvar assinatura
          </button>
        </form>
      )}

      {subscriptions.length === 0 ? (
        <div style={{ padding: '20px 10px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 12 }}>Nenhuma assinatura cadastrada.</p>
          <button className="btn-primary" onClick={onPopulateSamples} style={{ fontSize: 13, padding: '8px 16px' }}>
            Popular Assinaturas de Exemplo
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          {/* Summary values */}
          <div className="sub-summary" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div className="sub-sum-card total">
              <span className="label">Total</span>
              <span className="val"><Money v={totalAmount} hidden={hidden} /></span>
            </div>
            <div className="sub-sum-card paid">
              <span className="label">Pago</span>
              <span className="val"><Money v={paidAmount} hidden={hidden} /></span>
            </div>
            <div className="sub-sum-card remaining">
              <span className="label font-bold">Restante</span>
              <span className="val"><Money v={remainingAmount} hidden={hidden} /></span>
            </div>
          </div>

          {/* List of subscriptions */}
          <div className="sub-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subscriptions.map(s => {
              const isPaid = s.last_paid_month === activeMonth
              return (
                <div key={s.id} className={`sub-row ${isPaid ? 'paid' : ''}`}>
                  <button className="sub-checkbox" onClick={() => onTogglePaid(s)} title={isPaid ? "Marcar como não pago" : "Marcar como pago"}>
                    {isPaid ? <Check size={12} className="check-icon" /> : null}
                  </button>
                  <div className="sub-details">
                    <span className="sub-name">{s.name}</span>
                    <span className="sub-meta">{s.category} · Vence dia {s.due_day}</span>
                  </div>
                  <div className="sub-price">
                    <Money v={s.amount} cents hidden={hidden} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function CategoryMiniCard({ name, amount, total, color, hidden }: { name: string; amount: number; total: number; color: string; hidden: boolean }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0
  return (
    <div className="mini-card fade-up">
      <div className="mini-card-ring">
        <Ring value={pct} size={68} stroke={6} from={color} to={color} />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: 'var(--ink)' }}>
          {pct}%
        </div>
      </div>
      <div className="mini-card-label">{name}</div>
      <div className="mini-card-val"><Money v={amount} hidden={hidden} /></div>
    </div>
  )
}

function CalendarWidget() {
  const now = new Date()
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const today = now.getDate()

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  return (
    <div className="card-light fade-up" style={{ animationDelay: '100ms' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, color: 'var(--teal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
          <Calendar size={18} style={{ color: 'var(--orange)' }} /> Agenda
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={handlePrevMonth}
            style={{
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              color: 'var(--muted)', display: 'grid', placeItems: 'center',
              borderRadius: 6, transition: 'background 0.2s'
            }}
            title="Mês anterior"
            className="cal-nav-btn"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            style={{
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              color: 'var(--muted)', display: 'grid', placeItems: 'center',
              borderRadius: 6, transition: 'background 0.2s'
            }}
            title="Próximo mês"
            className="cal-nav-btn"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 13, textTransform: 'capitalize', marginBottom: 6, color: 'var(--teal-900)' }}>
        {monthName}
      </div>
      <div className="cal-grid">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="cal-day-name">{d}</div>)}
        {days.map((d, i) => (
          <div key={i} className={`cal-day ${isCurrentMonth && d === today ? 'active' : ''} ${!d ? 'muted' : ''}`}>
            {d || ''}
          </div>
        ))}
      </div>
    </div>
  )
}

function CardsWidget() {
  return (
    <div className="card-light fade-up" style={{ position: 'relative', overflow: 'hidden', animationDelay: '50ms' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
        <CreditCard size={18} /> Cartões
      </div>
      <div className="cards-stack">
        <div className="card-layer card-layer-1">
          XP
        </div>
        <div className="card-layer card-layer-2">
          Nu
        </div>
        <div className="card-layer card-layer-3">
          <span>Inter</span>
          <span>R$ 450,00</span>
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(2px)', zIndex: 10 }}>
        <span style={{ background: '#0b0c10', color: '#fff', padding: '6px 14px', borderRadius: 20, fontWeight: 800, fontSize: 13 }}>Em breve</span>
      </div>
    </div>
  )
}

// ============================================================ HOME VIEW

function Kpi({ label, Icon, tint, value, hidden, delay, spark, sc, sf, tooltip }: {
  label: string; Icon: React.ElementType; tint: string; value: number
  hidden: boolean; delay: number; spark: number[]; sc: string; sf: string; tooltip?: string
}) {
  return (
    <div className="kpi fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="kpi-top">
        <div className={`kpi-ic ${tint}`}><Icon size={20} /></div>
        <div className="kpi-label">{label}</div>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="kpi-val">
        <Money v={value} hidden={hidden} />
      </div>
      <div className="kpi-foot">
        <span style={{ marginLeft: 'auto' }}>
          <Sparkline points={spark.length >= 2 ? spark : [0, value / 1000]} color={sc} fill={sf} w={70} h={28} />
        </span>
      </div>
    </div>
  )
}

function CardHead({
  Icon: IconComp, tint, title, sub, right,
}: {
  Icon?: React.ElementType; tint?: string; title: string; sub?: string; right?: React.ReactNode
}) {
  return (
    <div className="card-head">
      <div>
        <div className="card-title">
          {IconComp && tint && <span className={`ti ${tint}`}><IconComp size={17} /></span>}
          {title}
        </div>
        {sub && <div className="card-sub" style={{ marginTop: 4, marginLeft: IconComp ? 39 : 0 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

function scoreLabel(score: number) {
  if (score >= 90) return 'Excelente'
  if (score >= 75) return 'Saúde boa'
  if (score >= 60) return 'Regular'
  if (score >= 40) return 'Atenção'
  return 'Crítico'
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ============================================================ WEEKLY BUDGET WIDGET
function WeeklyBudgetWidget({ income, expenses, savings, hidden }: { income: number; expenses: number; savings: number; hidden: boolean }) {
  const isPositive = savings >= 0
  const availableMonthly = Math.max(400, income - expenses)
  const weeklyLimit = Math.round(availableMonthly / 4)
  
  // Weekly states
  const w1Limit = weeklyLimit
  const w1Spent = Math.round(weeklyLimit * 0.9)
  
  const w2Limit = weeklyLimit
  const w2Spent = Math.round(weeklyLimit * 0.82)
  
  const w3Limit = weeklyLimit
  const w3Spent = Math.round(weeklyLimit * 0.65)
  const daysLeftInWeek = 3
  const dailySafeLimit = Math.max(0, Math.round((w3Limit - w3Spent) / daysLeftInWeek))
  
  const w4Limit = weeklyLimit
  const w4Spent = 0

  const getWeekPct = (spent: number, limit: number) => {
    return limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
  }

  return (
    <section className="card fade-up" style={{ animationDelay: '90ms' }}>
      <CardHead 
        Icon={TrendingUp} tint="t-green" 
        title="Planejador de Gastos Semanal" 
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <InfoTooltip 
              Icon={Calculator} 
              text="Fórmula do limite diário: (Saldo Semanal Restante - Gastos da Semana Atual) ÷ (Dias Restantes da Semana). O Saldo Semanal = Saldo Livre do Mês ÷ 4." 
            />
            <InfoTooltip 
              text="Divide seu saldo disponível do mês em 4 semanas e calcula quanto você pode gastar por dia com segurança. Dica: Se você investir ou poupar para metas, lance a transação no painel para que o limite diário seguro seja recalculado sem esse valor." 
            />
          </div>
        }
      />

      <div className="weekly-safe-container" style={{ marginTop: 8 }}>
        <div>
          <div className="weekly-safe-label">Limite Diário Seguro (Hoje)</div>
          <div className="weekly-safe-val">
            <Money v={dailySafeLimit} hidden={hidden} />
            <span className="per-day">/ dia</span>
          </div>
        </div>
        <span className={`status-pill ${isPositive ? 's-pos' : 's-neg'}`}>
          <i className="led" />
          {isPositive ? 'No Orçamento' : 'Ajuste Necessário'}
        </span>
      </div>

      <div className="weekly-bars-list" style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Week 1 */}
        <div className="weekly-bar-row">
          <div className="weekly-bar-meta">
            <span className="week-name">Semana 1 (Passada)</span>
            <span className="week-vals">R$ {brl(w1Spent)} / R$ {brl(w1Limit)}</span>
          </div>
          <div className="weekly-bar-track">
            <div className="weekly-bar-fill completed" style={{ width: `${getWeekPct(w1Spent, w1Limit)}%` }} />
          </div>
        </div>

        {/* Week 2 */}
        <div className="weekly-bar-row">
          <div className="weekly-bar-meta">
            <span className="week-name">Semana 2 (Passada)</span>
            <span className="week-vals">R$ {brl(w2Spent)} / R$ {brl(w2Limit)}</span>
          </div>
          <div className="weekly-bar-track">
            <div className="weekly-bar-fill completed" style={{ width: `${getWeekPct(w2Spent, w2Limit)}%` }} />
          </div>
        </div>

        {/* Week 3 (Current) */}
        <div className="weekly-bar-row current">
          <div className="weekly-bar-meta">
            <span className="week-name"><b>Semana 3 (Atual)</b></span>
            <span className="week-vals font-bold">R$ {brl(w3Spent)} / R$ {brl(w3Limit)}</span>
          </div>
          <div className="weekly-bar-track">
            <div className="weekly-bar-fill active pulsing" style={{ width: `${getWeekPct(w3Spent, w3Limit)}%` }} />
          </div>
        </div>

        {/* Week 4 */}
        <div className="weekly-bar-row">
          <div className="weekly-bar-meta">
            <span className="week-name" style={{ color: 'var(--faint)' }}>Semana 4 (Planejada)</span>
            <span className="week-vals" style={{ color: 'var(--faint)' }}>R$ {brl(w4Spent)} / R$ {brl(w4Limit)}</span>
          </div>
          <div className="weekly-bar-track upcoming">
            <div className="weekly-bar-fill" style={{ width: `${getWeekPct(w4Spent, w4Limit)}%` }} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================ IDLE CASH WIDGET
function IdleCashWidget({ savings, hidden, onAsk }: { savings: number; hidden: boolean; onAsk: (seed: string) => void }) {
  const isPositive = savings > 100
  const idleAmount = isPositive ? Math.round(savings * 0.45) : 0
  const cdiPct = 60
  const goalsPct = 40
  
  const cdiVal = Math.round(idleAmount * (cdiPct / 100))
  const goalsVal = Math.round(idleAmount * (goalsPct / 100))

  const promptSeed = `Gostaria de um plano detalhado para investir meu saldo ocioso de R$ ${idleAmount} deste mês.`

  return (
    <section className="card fade-up" style={{ animationDelay: '120ms' }}>
      <CardHead 
        Icon={TrendingUp} tint="t-gold" 
        title="Otimização de Saldo" 
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <InfoTooltip 
              Icon={Calculator} 
              text="Fórmula do saldo ocioso: 45% da sua economia mensal (Receitas - Despesas). O Finnly IA reserva os outros 55% de margem de segurança para despesas imprevisíveis, recomendando investir o restante." 
            />
            <InfoTooltip text="Sugere a distribuição inteligente do saldo que sobra na conta corrente (depois de deduzidos os gastos fixos estimáveis) em investimentos automáticos para evitar dinheiro parado." />
          </div>
        }
      />

      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Saldo ocioso recomendado</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>R$</span>
          <Money v={idleAmount} cur={false} hidden={hidden} />
        </div>
      </div>

      {isPositive ? (
        <div style={{ marginTop: 14 }}>
          {/* Split allocation bar */}
          <div className="alloc-bar-container">
            <div className="alloc-bar-fill cdi" style={{ width: `${cdiPct}%` }} title={`CDI Reserva: ${cdiPct}%`} />
            <div className="alloc-bar-fill goals" style={{ width: `${goalsPct}%` }} title={`Metas: ${goalsPct}%`} />
          </div>

          <div className="alloc-legend">
            <div className="legend-item">
              <span className="dot cdi" />
              <div>
                <span className="label">CDI (Reserva): {cdiPct}%</span>
                <span className="val"><Money v={cdiVal} hidden={hidden} /></span>
              </div>
            </div>
            <div className="legend-item">
              <span className="dot goals" />
              <div>
                <span className="label">Metas de Vida: {goalsPct}%</span>
                <span className="val"><Money v={goalsVal} hidden={hidden} /></span>
              </div>
            </div>
          </div>

          <div className="alloc-advice">
            <p>💡 <b>Dica da IA:</b> Seus R$ {brl(cdiVal)} em CDI renderão aprox. <b>R$ {brl(cdiVal * 0.1075 / 12, true)}/mês</b> líquidos, protegendo seu poder de compra.</p>
          </div>

          <button className="alloc-cta-btn" onClick={() => onAsk(promptSeed)}>
            <Sparkles size={14} /> Simular alocação no chat
          </button>
        </div>
      ) : (
        <div className="flow-alert-box generic" style={{ marginTop: 12 }}>
          <span className="alert-ic">💡</span>
          <p className="alert-txt" style={{ color: 'var(--muted)' }}>
            Sem saldo ocioso disponível este mês. Foco atual: equilibrar despesas e criar sua reserva de emergência no chat.
          </p>
        </div>
      )}
    </section>
  )
}

// ============================================================ AI QUICK ACTIONS
function AIQuickActions({ savings, categories, goals, onAsk }: { savings: number; categories: CategorySummary[]; goals: Goal[]; onAsk: (seed: string) => void }) {
  const topCategoryName = categories.length > 0 
    ? [...categories].sort((a, b) => b.amount - a.amount)[0]?.name 
    : null
  
  const mainGoalName = goals.length > 0 ? goals[0]?.name : null

  const actions = [
    {
      label: topCategoryName ? `💡 Como economizar em ${topCategoryName}?` : '💡 Como reduzir despesas este mês?',
      prompt: topCategoryName 
        ? `Quais estratégias práticas você me recomenda para reduzir meus gastos com a categoria ${topCategoryName} este mês?`
        : 'Como posso criar um plano para reduzir minhas maiores despesas este mês?'
    },
    {
      label: savings > 0 ? `📈 Onde rende mais meu saldo de R$ ${savings}?` : '📈 Como montar reserva de emergência?',
      prompt: savings > 0
        ? `Tenho uma economia de R$ ${savings} este mês. Onde posso investir para ter boa liquidez e rentabilidade?`
        : 'Qual a estratégia recomendada para criar uma reserva de emergência partindo do zero?'
    },
    {
      label: mainGoalName ? `🎯 Acelerar meta "${mainGoalName}"` : '🎯 Como definir metas financeiras?',
      prompt: mainGoalName
        ? `Quais ações posso tomar hoje para alcançar a minha meta "${mainGoalName}" mais rápido?`
        : 'Como defino metas financeiras realistas utilizando o método SMART no Finnly?'
    },
    {
      label: '📊 Raio-X dos meus gastos deste mês',
      prompt: 'Faça uma análise geral detalhada sobre os meus hábitos de consumo e taxa de poupança deste mês.'
    }
  ]

  return (
    <section className="quick-actions-section fade-up" style={{ animationDelay: '140ms' }}>
      <div className="quick-actions-head">
        <span className="qa-ic"><Sparkles size={16} /></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <h4 className="quick-actions-title">Pergunte ao Finnly IA</h4>
          <InfoTooltip text="Perguntas recomendadas pela inteligência artificial personalizadas de acordo com o saldo e despesas do seu mês ativo. Clique para iniciar a análise no chat." />
        </div>
      </div>
      
      <div className="quick-actions-row">
        {actions.map((act, i) => (
          <button key={i} className="qa-chip" onClick={() => onAsk(act.prompt)}>
            {act.label}
          </button>
        ))}
      </div>
    </section>
  )
}

const DEFAULT_VISIBILITY = {
  budget: true,
  categories: false,
  transactions: true,
  score: true,
  goals: true,
  idleCash: false,
  cards: false,
  calendar: false,
  emergencyFund: true,
  subscriptions: true,
}

const DEFAULT_GENERAL_ORDER = ['calendar']
const DEFAULT_LEFT_ORDER = ['budget', 'subscriptions', 'transactions', 'categories']
const DEFAULT_RIGHT_ORDER = ['score', 'emergencyFund', 'goals', 'idleCash', 'cards']

const WIDGET_INFO: Record<string, { label: string; desc: string }> = {
  calendar: {
    label: 'Calendário Mensal',
    desc: 'Calendário interativo que mostra as atividades financeiras e transações distribuídas pelos dias do mês ativo.'
  },
  budget: {
    label: 'Planejador de Gastos Semanal',
    desc: 'Divide seu saldo disponível do mês em 4 semanas e calcula seu limite diário seguro de gastos para hoje.'
  },
  categories: {
    label: 'Gastos por categoria',
    desc: 'Exibe o gráfico e ranking com as 5 principais categorias de consumo onde você mais gastou no mês.'
  },
  transactions: {
    label: 'Transações recentes',
    desc: 'Lista das últimas movimentações (receitas e despesas) registradas, ordenadas de forma cronológica.'
  },
  subscriptions: {
    label: 'Contas Fixas e Assinaturas',
    desc: 'Lista e status de pagamento das suas contas fixas e assinaturas recorrentes deste mês.'
  },
  score: {
    label: 'Score financeiro',
    desc: 'Pontuação de 0 a 100 indicando a saúde das suas economias, reserva e progresso geral nas metas.'
  },
  goals: {
    label: 'Metas em destaque',
    desc: 'Destaque e progresso percentual da sua meta financeira principal, mostrando o montante acumulado.'
  },
  emergencyFund: {
    label: 'Termômetro de Emergência',
    desc: 'Mede os meses de cobertura do seu custo de vida garantidos pela sua Reserva de Emergência.'
  },
  idleCash: {
    label: 'Otimização de Saldo (IA)',
    desc: 'Recomendações e insights da Inteligência Artificial sobre como otimizar ou investir saldos parados.'
  },
  cards: {
    label: 'Cartões',
    desc: 'Resumo visual das faturas, limites disponíveis e vencimento dos seus cartões de crédito.'
  }
}

function HomeView({
  data, userName, hidden, onAsk, layoutVisibility, generalOrder, leftOrder, rightOrder, activeMonth,
  onTogglePaid, onPopulateSamples, onAddSubscription,
}: {
  data: DashboardData; userName: string; hidden: boolean; onAsk: (seed: string) => void
  layoutVisibility: typeof DEFAULT_VISIBILITY
  generalOrder: string[]
  leftOrder: string[]
  rightOrder: string[]
  activeMonth: string
  onTogglePaid: (sub: Subscription) => Promise<void>
  onPopulateSamples: () => Promise<void>
  onAddSubscription: (name: string, amount: number, dueDay: number, category: string) => Promise<void>
}) {
  const [barsReady, setBarsReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setBarsReady(true), 50); return () => clearTimeout(t) }, [])

  const { monthlyIncome, monthlyExpenses, monthlySavings, score, scoreChange, categories, recentTransactions, goals, subscriptions } = data
  const budgetPct = monthlyIncome > 0 ? Math.min(100, Math.round((monthlySavings / monthlyIncome) * 100)) : 0
  const firstName = userName.split(' ')[0]
  const hasData = monthlyIncome > 0 || monthlyExpenses > 0

  const totalCat = categories.reduce((s, c) => s + c.amount, 0)
  const topCats = [...categories].sort((a, b) => b.amount - a.amount).slice(0, 5)

  const insights = []
  if (monthlyExpenses > 0 && monthlyIncome > 0) {
    const savPct = Math.round((monthlySavings / monthlyIncome) * 100)
    if (savPct >= 20) {
      insights.push({ ic: '#28A745', tint: 't-green', Icon: Trophy, tag: 'Parabéns', html: `Você está economizando <b>${savPct}% da renda</b> este mês. Continue assim!`, seed: 'quanto estou economizando' })
    } else if (savPct < 0) {
      insights.push({ ic: '#F57C00', tint: 't-orange', Icon: ArrowUp, tag: 'Atenção', html: `Suas despesas <b>superam a renda</b> em <b>R$ ${brl(Math.abs(monthlySavings))}</b> este mês.`, seed: 'despesas maiores que renda' })
    }
  }
  if (goals.length > 0) {
    const bestGoal = goals[0]
    const pct = bestGoal.target_amount > 0 ? Math.round((bestGoal.current_amount / bestGoal.target_amount) * 100) : 0
    insights.push({ ic: '#FFB300', tint: 't-gold', Icon: Target, tag: 'Sua meta', html: `Você está <b>${pct}%</b> na meta <b>${bestGoal.name}</b>. Faltam <b>R$ ${brl(Math.max(0, bestGoal.target_amount - bestGoal.current_amount))}</b>.`, seed: `meta ${bestGoal.name}` })
  }
  if (!hasData) {
    insights.push({ ic: '#01584C', tint: 't-teal', Icon: Sparkles, tag: 'Começar', html: 'Registre sua <b>primeira receita ou despesa</b> para o Finnly calcular seu score e dar insights personalizados.', seed: 'como começar a usar o Finnly' })
  }

  const renderWidget = (key: string) => {
    switch (key) {
      case 'calendar':
        return <CalendarWidget key={key} />
      case 'budget':
        return <WeeklyBudgetWidget key={key} income={monthlyIncome} expenses={monthlyExpenses} savings={monthlySavings} hidden={hidden} />
      case 'categories':
        if (topCats.length === 0) return null
        return (
          <section key={key} className="card fade-up" style={{ paddingBottom: 0, overflow: 'hidden' }}>
            <CardHead Icon={Zap} tint="t-orange" title="Gastos por categoria" sub="Top 5 categorias do mês" />
            <div className="mini-cards-row">
              {topCats.map((c, i) => (
                <CategoryMiniCard key={i} name={c.name} amount={c.amount} total={totalCat} color={c.color} hidden={hidden} />
              ))}
            </div>
          </section>
        )
      case 'transactions':
        return (
          <section key={key} className="card fade-up" style={{ animationDelay: '80ms' }}>
            <CardHead
              Icon={Receipt} tint="t-teal"
              title="Transações recentes"
              right={
                <button className="link-btn" onClick={() => onAsk('Resuma minhas transações recentes')}>
                  Ver análise<ChevronRight size={15} />
                </button>
              }
            />
            {recentTransactions.length === 0 ? (
              <p className="empty-msg">Nenhuma transação registrada. Use Receitas e Despesas para lançar.</p>
            ) : (
              <div>
                {recentTransactions.map(t => {
                  const Icon = txIcon(t.category, t.type)
                  const tint = txTint(t.category, t.type)
                  return (
                    <div key={t.id} className="row-item">
                      <div className={`row-ic ${tint}`}><Icon size={19} /></div>
                      <div className="row-main">
                        <div className="row-name">{t.name}</div>
                        <div className="row-sub">{t.subtitle}</div>
                      </div>
                      <div className={`row-amt ${t.amount > 0 ? 'pos' : 'neg-amt'}`}>
                        {t.amount > 0 ? '+ ' : '– '}
                        <Money v={Math.abs(t.amount)} cents cur={false} hidden={hidden} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      case 'subscriptions':
        return (
          <SubscriptionsWidget
            key={key}
            subscriptions={subscriptions}
            activeMonth={activeMonth}
            hidden={hidden}
            onTogglePaid={onTogglePaid}
            onPopulateSamples={onPopulateSamples}
            onAddSubscription={onAddSubscription}
          />
        )
      case 'cards':
        return <CardsWidget key={key} />
      case 'idleCash':
        return <IdleCashWidget key={key} savings={monthlySavings} hidden={hidden} onAsk={onAsk} />
      case 'score':
        return (
          <section key={key} className="card score-card fade-up" style={{ animationDelay: '60ms' }}>
            <div className="card-head" style={{ width: '100%', marginBottom: 0 }}>
              <div>
                <div className="card-title" style={{ fontSize: 15 }}>Score financeiro</div>
                <div className="card-sub">0–100</div>
              </div>
              <InfoTooltip text="Pontuação 0–100 baseada na sua taxa de poupança, tamanho da reserva de emergência e progresso nas metas ativas." />
            </div>
            <div className="ring-wrap">
              <Ring value={score} size={150} stroke={15} />
              <div className="score-num">
                <b>{score}</b>
                <small>de 100</small>
              </div>
            </div>
            <span className="score-badge">
              <Check size={14} />
              {scoreLabel(score)}
            </span>
            {scoreChange > 0 && <p className="score-foot">Subiu <b>+{scoreChange} pontos</b> no mês.</p>}
          </section>
        )
      case 'goals':
        if (goals.length === 0) return null
        return (
          <section key={key} className="card fade-up">
            <CardHead Icon={Target} tint="t-gold" title="Metas em destaque" />
            <div>
              {goals.slice(0, 3).map(g => {
                const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0
                const color = g.color ?? '#01584C'
                const hasSavings = monthlySavings > 0
                const impactDays = Math.max(1, Math.min(30, Math.round((Math.abs(monthlySavings) / g.target_amount) * 365)))
                const goalImpactTooltip = "Reflete o impacto do ritmo atual de economia deste mês no prazo estimado de conclusão desta meta."
                return (
                  <div key={g.id} className="goal">
                    <div className="goal-top">
                      <div className="goal-ic" style={{ background: color + '22', color }}>
                        <Target size={18} />
                      </div>
                      <div>
                        <div className="goal-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {g.name}
                          <span className={`goal-impact-badge ${hasSavings ? 'adv' : 'del'}`} title={goalImpactTooltip}>
                            {hasSavings ? `⚡ +${impactDays}d` : `⚠️ -${impactDays}d`}
                          </span>
                        </div>
                        {g.target_date && <div className="goal-sub">Meta: {new Date(g.target_date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</div>}
                      </div>
                      <div className="goal-pct" style={{ color }}>{pct}%</div>
                    </div>
                    <div className="goal-track">
                      <i style={{ width: barsReady ? `${pct}%` : '0%', background: color }} />
                    </div>
                    <div className="goal-meta">
                      <span><b><Money v={g.current_amount} hidden={hidden} /></b> guardados</span>
                      <span>de <Money v={g.target_amount} hidden={hidden} /></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      case 'emergencyFund':
        const emergencyGoals = goals.filter(g =>
          g.name.toLowerCase().includes('reserva') ||
          g.name.toLowerCase().includes('emergência') ||
          g.name.toLowerCase().includes('emergencia')
        )
        const reserveBalance = emergencyGoals.reduce((sum, g) => sum + g.current_amount, 0)
        const monthlyLivingCost = monthlyExpenses > 0
          ? monthlyExpenses
          : (monthlyIncome > 0 ? monthlyIncome * 0.7 : 2000)
        
        const coverageMonths = monthlyLivingCost > 0 ? (reserveBalance / monthlyLivingCost) : 0
        const coverageTargetMonths = 6
        const coveragePct = Math.min(100, Math.round((coverageMonths / coverageTargetMonths) * 100))

        return (
          <EmergencyFundWidget
            key={key}
            reserveBalance={reserveBalance}
            monthlyLivingCost={monthlyLivingCost}
            coverageMonths={coverageMonths}
            coveragePct={coveragePct}
            hidden={hidden}
          />
        )
      default:
        return null
    }
  }

  const visibleGeneralItems = generalOrder.filter(key => layoutVisibility[key as keyof typeof layoutVisibility])
  const hasGeneralItems = visibleGeneralItems.length > 0

  return (
    <div className="fd-stack">

      {/* HERO + SCORE */}
      <div className="fd-grid">
        <section className={hasGeneralItems ? "col-8 hero fade-up" : "col-12 hero fade-up"}>
          <div className="hero-top">
            <div className="finnly-chip">
              <span className="av"><Sparkles size={14} /></span>
              <span><b>Finnly</b> <span>· seu consultor IA</span></span>
            </div>
            {hasData && (
              <span className="status-pill">
                <i className="led" />
                {monthlySavings >= 0 ? 'Dentro do planejado' : 'Gastos acima da renda'}
              </span>
            )}
          </div>
          <p className="hero-greet">
            {getGreeting()}, <b>{firstName}</b> 👋{' '}
            {hasData
              ? monthlySavings >= 0
                ? `Você tem ${brl(monthlySavings, false)} disponíveis este mês. Consulte o Finnly IA para um plano personalizado.`
                : `Suas despesas estão acima da renda. Pergunte ao Finnly como equilibrar.`
              : `Bem-vindo ao Finnly! Registre suas receitas e despesas para começar.`}
          </p>
          <div className="hero-bottom">
            <div className="spend">
              <div className="spend-label">
                <Wallet size={15} />
                Saldo disponível
              </div>
              <div className="spend-val">
                <span className="cur">R$</span>
                <Money v={Math.max(0, monthlySavings)} cur={false} hidden={hidden} />
              </div>
              <div className="spend-bar">
                <i style={{ width: barsReady ? `${budgetPct}%` : '0%' }} />
              </div>
              <div className="spend-meta">
                <b>R$ {brl(monthlyIncome)}</b> de renda · <b>R$ {brl(monthlyExpenses)}</b> em despesas
              </div>
            </div>
            <button className="hero-cta" onClick={() => onAsk('Quanto posso gastar com segurança hoje?')}>
              <Sparkles size={17} />
              Pedir um plano ao Finnly
            </button>
          </div>
        </section>

        {hasGeneralItems && (
          <div className="col-4 fd-stack">
            {visibleGeneralItems.map(key => renderWidget(key))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="fd-grid">
        <div className="col-3">
          <Kpi label="Receitas do mês" Icon={ArrowDown} tint="t-green" value={monthlyIncome} hidden={hidden} delay={0} spark={[0, monthlyIncome / 1000]} sc="#28A745" sf="rgba(40,167,69,.13)" tooltip="Soma de todas as receitas recebidas e confirmadas no mês atual." />
        </div>
        <div className="col-3">
          <Kpi label="Despesas do mês" Icon={ArrowUp} tint="t-orange" value={monthlyExpenses} hidden={hidden} delay={60} spark={[0, monthlyExpenses / 1000]} sc="#F57C00" sf="rgba(245,124,0,.12)" tooltip="Soma de todas as saídas e contas pagas no mês atual." />
        </div>
        <div className="col-3">
          <Kpi label="Economia do mês" Icon={PiggyBank} tint="t-gold" value={Math.max(0, monthlySavings)} hidden={hidden} delay={120} spark={[0, Math.max(0, monthlySavings) / 1000]} sc="#C68A00" sf="rgba(255,179,0,.16)" tooltip="Valor que sobrou da sua renda após pagar todas as despesas registradas." />
        </div>
        <div className="col-3">
          <Kpi label="Meta principal" Icon={Target} tint="t-teal" value={goals[0]?.current_amount ?? 0} hidden={hidden} delay={180} spark={[0, (goals[0]?.current_amount ?? 0) / 1000]} sc="#01584C" sf="rgba(1,88,76,.12)" tooltip="Valor acumulado até o momento na sua meta ativa com maior prioridade." />
        </div>
      </div>

      {/* AI Quick Actions Chips */}
      <AIQuickActions savings={Math.max(0, monthlySavings)} categories={categories} goals={goals} onAsk={onAsk} />

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <>
          <div className="insights-head">
            <span className="ti"><Sparkles size={18} /></span>
            <div>
              <h3>Insights do Finnly</h3>
              <p>Recomendações baseadas nos seus dados reais</p>
            </div>
          </div>
          <div className="fd-grid">
            {insights.map((it, i) => (
              <div key={i} className={`col-${insights.length === 1 ? '12' : insights.length === 2 ? '6' : '4'}`}>
                <div
                  className="insight fade-up"
                  style={{ '--ic-color': it.ic, animationDelay: `${i * 60}ms` } as React.CSSProperties}
                >
                  <div className={`ic ${it.tint}`}><it.Icon size={18} /></div>
                  <p dangerouslySetInnerHTML={{ __html: it.html }} />
                  <div className="ins-foot">
                    <span className="tag">{it.tag}</span>
                    <button className="link-btn" onClick={() => onAsk(it.seed)}>
                      Ver detalhes<ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MAIN GRID */}
      <div className="fd-grid">

        {/* LEFT COLUMN */}
        <div className="col-8 fd-stack">
          {leftOrder.map(key => {
            if (!layoutVisibility[key as keyof typeof layoutVisibility]) return null
            return renderWidget(key)
          })}
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-4 fd-stack">
          {rightOrder.map(key => {
            if (!layoutVisibility[key as keyof typeof layoutVisibility]) return null
            return renderWidget(key)
          })}
        </div>
      </div>

    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="card empty-state fade-up">
      <div className="t-cream" style={{ width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
        <Sparkles size={28} />
      </div>
      <h3>{label}</h3>
      <p>Em breve disponível. Por enquanto, explore a Visão geral.</p>
    </div>
  )
}

// ============================================================ MAIN APP

const NAV = [
  { id: 'home', Icon: LayoutGrid, label: 'Visão geral' },
  { id: 'receitas', Icon: ArrowDown, label: 'Receitas' },
  { id: 'despesas', Icon: ArrowUp, label: 'Despesas' },
  { id: 'goals', Icon: Target, label: 'Metas' },
  { id: 'invest', Icon: TrendingUp, label: 'Investimentos' },
  { id: 'cards', Icon: CreditCard, label: 'Cartões' },
  { id: 'ai', Icon: Sparkles, label: 'Finnly IA' },
]



interface DashboardAppProps {
  userName: string
  userInitial: string
  dashboardData: DashboardData
  selectedMonthParam?: string
  signOut: () => Promise<void>
}

export function DashboardApp({ userName, userInitial, dashboardData, selectedMonthParam, signOut }: DashboardAppProps) {
  const router = useRouter()
  const [active, setActive] = useState('home')
  const [hidden, setHidden] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chat, setChat] = useState<{ seed: string | null } | null>(null)
  const [bell, setBell] = useState(false)
  const [askVal, setAskVal] = useState('')
  const bellRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  
  const [customizing, setCustomizing] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [layoutVisibility, setLayoutVisibility] = useState(DEFAULT_VISIBILITY)
  const [generalOrder, setGeneralOrder] = useState(DEFAULT_GENERAL_ORDER)
  const [leftOrder, setLeftOrder] = useState(DEFAULT_LEFT_ORDER)
  const [rightOrder, setRightOrder] = useState(DEFAULT_RIGHT_ORDER)

  const handleCloseCustomizer = () => {
    setIsClosing(true)
    setTimeout(() => {
      setCustomizing(false)
      setIsClosing(false)
    }, 200)
  }

  const [supabase] = useState(() => createClient())

  const saveLayout = async (
    visibility: Record<string, boolean>,
    general: string[],
    left: string[],
    right: string[]
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    await supabase
      .from('financial_profiles')
      .update({
        dashboard_layout: {
          visibility,
          generalOrder: general,
          leftOrder: left,
          rightOrder: right
        }
      })
      .eq('user_id', user.id)
  }

  useEffect(() => {
    const profileLayout = dashboardData.financialProfile?.dashboard_layout
    
    let vis = DEFAULT_VISIBILITY
    let general = DEFAULT_GENERAL_ORDER
    let left = DEFAULT_LEFT_ORDER
    let right = DEFAULT_RIGHT_ORDER

    if (profileLayout) {
      if (profileLayout.visibility) vis = { ...DEFAULT_VISIBILITY, ...profileLayout.visibility }
      if (profileLayout.generalOrder) general = profileLayout.generalOrder
      if (profileLayout.leftOrder) left = profileLayout.leftOrder
      if (profileLayout.rightOrder) right = profileLayout.rightOrder
    } else {
      const savedVis = localStorage.getItem('finnly_layout_visibility')
      const savedGeneral = localStorage.getItem('finnly_general_order')
      const savedLeft = localStorage.getItem('finnly_left_order')
      const savedRight = localStorage.getItem('finnly_right_order')
      
      if (savedVis) {
        try {
          vis = { ...DEFAULT_VISIBILITY, ...JSON.parse(savedVis) }
        } catch (e) {
          console.error(e)
        }
      }
      if (savedGeneral) {
        try {
          general = JSON.parse(savedGeneral)
        } catch (e) {
          console.error(e)
        }
      }
      if (savedLeft) {
        try {
          left = JSON.parse(savedLeft)
        } catch (e) {
          console.error(e)
        }
      }
      if (savedRight) {
        try {
          right = JSON.parse(savedRight)
        } catch (e) {
          console.error(e)
        }
      }
    }

    // Ensure all default items are present in either general, left or right orders
    const allConfigured = new Set([...general, ...left, ...right])
    const missingGeneral = DEFAULT_GENERAL_ORDER.filter(x => !allConfigured.has(x))
    const missingLeft = DEFAULT_LEFT_ORDER.filter(x => !allConfigured.has(x))
    const missingRight = DEFAULT_RIGHT_ORDER.filter(x => !allConfigured.has(x))

    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setGeneralOrder([...general, ...missingGeneral])
    setLayoutVisibility(vis)
    setLeftOrder([...left, ...missingLeft])
    setRightOrder([...right, ...missingRight])
  }, [dashboardData.financialProfile])

  useEffect(() => {
    if (customizing) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [customizing])

  const handleToggleVisibility = async (key: keyof typeof DEFAULT_VISIBILITY) => {
    const next = { ...layoutVisibility, [key]: !layoutVisibility[key] }
    setLayoutVisibility(next)
    await saveLayout(next, generalOrder, leftOrder, rightOrder)
  }

  const handleMoveItem = async (column: 'general' | 'left' | 'right', index: number, direction: 'up' | 'down') => {
    const order = column === 'general' 
      ? [...generalOrder] 
      : column === 'left' 
        ? [...leftOrder] 
        : [...rightOrder]
    const nextIndex = direction === 'up' ? index - 1 : index + 1
    
    if (nextIndex < 0 || nextIndex >= order.length) return
    
    const temp = order[index]
    order[index] = order[nextIndex]
    order[nextIndex] = temp
    
    if (column === 'general') {
      setGeneralOrder(order)
      await saveLayout(layoutVisibility, order, leftOrder, rightOrder)
    } else if (column === 'left') {
      setLeftOrder(order)
      await saveLayout(layoutVisibility, generalOrder, order, rightOrder)
    } else {
      setRightOrder(order)
      await saveLayout(layoutVisibility, generalOrder, leftOrder, order)
    }
  }

  const handleMoveSection = async (key: string, targetSection: 'general' | 'left' | 'right') => {
    const nextGeneral = generalOrder.filter(x => x !== key)
    const nextLeft = leftOrder.filter(x => x !== key)
    const nextRight = rightOrder.filter(x => x !== key)

    if (targetSection === 'general') {
      nextGeneral.push(key)
    } else if (targetSection === 'left') {
      nextLeft.push(key)
    } else {
      nextRight.push(key)
    }

    setGeneralOrder(nextGeneral)
    setLeftOrder(nextLeft)
    setRightOrder(nextRight)
    await saveLayout(layoutVisibility, nextGeneral, nextLeft, nextRight)
  }

  const handleTogglePaid = async (sub: Subscription) => {
    const isPaid = sub.last_paid_month === activeMonth
    const newPaidMonth = isPaid ? null : activeMonth

    await supabase
      .from('subscriptions')
      .update({ last_paid_month: newPaidMonth, updated_at: new Date().toISOString() })
      .eq('id', sub.id)

    router.refresh()
  }

  const handlePopulateSamples = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const samples = [
      { user_id: user.id, name: 'Netflix', amount: 55.90, due_day: 10, category: 'Lazer' },
      { user_id: user.id, name: 'Spotify', amount: 24.90, due_day: 15, category: 'Lazer' },
      { user_id: user.id, name: 'Conta de Luz', amount: 180.00, due_day: 20, category: 'Moradia' },
      { user_id: user.id, name: 'Academia', amount: 119.90, due_day: 5, category: 'Saúde' },
    ]

    await supabase.from('subscriptions').insert(samples)
    router.refresh()
  }

  const handleAddSubscription = async (name: string, amount: number, dueDay: number, category: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('subscriptions').insert({
      user_id: user.id,
      name,
      amount,
      due_day: dueDay,
      category,
    })

    router.refresh()
  }

  const handleRestoreDefaults = async () => {
    setLayoutVisibility(DEFAULT_VISIBILITY)
    setGeneralOrder(DEFAULT_GENERAL_ORDER)
    setLeftOrder(DEFAULT_LEFT_ORDER)
    setRightOrder(DEFAULT_RIGHT_ORDER)
    await saveLayout(DEFAULT_VISIBILITY, DEFAULT_GENERAL_ORDER, DEFAULT_LEFT_ORDER, DEFAULT_RIGHT_ORDER)
  }

  const activeMonth = selectedMonthParam ?? currentMonthYM()

  const handlePrevMonth = () => {
    const [y, m] = activeMonth.split('-').map(Number)
    const prevDate = new Date(y, m - 2, 1)
    const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    startTransition(() => {
      router.push(`/dashboard?month=${prevYM}`, { scroll: false })
    })
  }

  const handleNextMonth = () => {
    const [y, m] = activeMonth.split('-').map(Number)
    const nextDate = new Date(y, m, 1)
    const nextYM = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    startTransition(() => {
      router.push(`/dashboard?month=${nextYM}`, { scroll: false })
    })
  }

  const openChat = (seed?: string) => setChat({ seed: seed ?? null })

  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const activeLabel = NAV.find(n => n.id === active)?.label ?? 'Visão geral'

  // Notificações dinâmicas baseadas nos dados
  const notifs = []
  if (dashboardData.monthlyExpenses > dashboardData.monthlyIncome && dashboardData.monthlyIncome > 0) {
    notifs.push({ tint: 't-orange', Icon: ArrowUp, t: 'Despesas acima da renda!', s: `R$ ${brl(dashboardData.monthlyExpenses - dashboardData.monthlyIncome)} acima`, seed: 'meus gastos estão acima da renda' })
  }
  if (dashboardData.goals.length > 0) {
    const g = dashboardData.goals[0]
    const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0
    notifs.push({ tint: 't-gold', Icon: Target, t: `Meta: ${g.name}`, s: `${pct}% concluída`, seed: `progresso da meta ${g.name}` })
  }
  if (dashboardData.score >= 75) {
    notifs.push({ tint: 't-green', Icon: Trophy, t: 'Bom score financeiro!', s: `${dashboardData.score}/100 pontos`, seed: 'como melhorar meu score financeiro' })
  }
  const renderCustomizerItem = (key: string, index: number, section: 'general' | 'left' | 'right', list: string[]) => {
    const info = WIDGET_INFO[key] || { label: key, desc: '' }
    const visKey = key as keyof typeof DEFAULT_VISIBILITY
    return (
      <div key={key} className="customizer-item" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6, padding: '12px 10px' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="item-drag-group" style={{ alignItems: 'flex-start' }}>
            <div className="order-btns" style={{ marginTop: 2 }}>
              <button 
                type="button"
                disabled={index === 0} 
                onClick={() => handleMoveItem(section, index, 'up')}
                className="order-btn"
                title="Subir"
              >▲</button>
              <button 
                type="button"
                disabled={index === list.length - 1} 
                onClick={() => handleMoveItem(section, index, 'down')}
                className="order-btn"
                title="Descer"
              >▼</button>
            </div>
            <div>
              <span className="item-label" style={{ display: 'block', lineHeight: '1.2' }}>{info.label}</span>
              <span className="item-desc">{info.desc}</span>
            </div>
          </div>
          <label className="switch" style={{ alignSelf: 'flex-start', marginTop: 2 }}>
            <input 
              type="checkbox" 
              checked={!!layoutVisibility[visKey]} 
              onChange={() => handleToggleVisibility(visKey)} 
            />
            <span className="slider" />
          </label>
        </div>

        {/* Section choice selector buttons group */}
        <div className="sec-choice-group" style={{ display: 'flex', gap: 6, marginTop: 4, width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Posicionar:</span>
          <button 
            type="button"
            className={`sec-choice-btn${section === 'general' ? ' active' : ''}`}
            onClick={() => handleMoveSection(key, 'general')}
          >Geral</button>
          <button 
            type="button"
            className={`sec-choice-btn${section === 'left' ? ' active' : ''}`}
            onClick={() => handleMoveSection(key, 'left')}
          >Principal</button>
          <button 
            type="button"
            className={`sec-choice-btn${section === 'right' ? ' active' : ''}`}
            onClick={() => handleMoveSection(key, 'right')}
          >Lateral</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`app ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
            <Image src="/images/logosemfundo.png" alt="Finnly" width={54} height={54} style={{ objectFit: 'contain' }} />
          </div>
          <div className="brand-name">Finn<b>ly</b></div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Alternar menu">
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        <div className="nav-label">Menu</div>
        {NAV.map(n => (
          <button
            key={n.id}
            className={`nav-item${active === n.id ? ' active' : ''}`}
            onClick={() => setActive(n.id)}
          >
            <n.Icon size={20} />
            <span>{n.label}</span>
          </button>
        ))}

        <div className="nav-spacer" />


        <button className="nav-item" onClick={() => signOut()}>
          <Settings size={20} />
          <span>Sair</span>
        </button>

        <div className="side-card">
          <div className="av">{userInitial}</div>
          <div>
            <div className="nm">{userName}</div>
            <div className="pl">Plano Pessoal</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <div className="main-inner">
          {/* TOPBAR */}
          <div className="topbar">
            <div className="tb-hello">
              <div className="tb-date">{dateFormatted}</div>
              <div className="tb-title" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {activeLabel}
                {active === 'home' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="ov-month-selector-wrapper">
                      <button
                        onClick={handlePrevMonth}
                        disabled={isPending}
                        className="ov-month-nav-btn prev"
                        title="Mês anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="ov-month-label-container">
                        <Calendar size={15} className="ov-month-icon" />
                        <span className="ov-month-label-text">
                          {getMonthLabel(activeMonth)}
                        </span>
                      </div>
                      <button
                        onClick={handleNextMonth}
                        disabled={isPending}
                        className="ov-month-nav-btn next"
                        title="Próximo mês"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => setCustomizing(true)}
                      className="layout-customize-btn"
                      title="Personalizar visão geral"
                    >
                      <SlidersHorizontal size={15} />
                      <span>Personalizar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="tb-grow" />

            {/* Search */}
            <div
              className="ask"
              onClick={e => {
                if ((e.target as HTMLElement).tagName !== 'INPUT') {
                  e.currentTarget.querySelector('input')?.focus()
                }
              }}
            >
              <span className="spark"><Sparkles size={15} /></span>
              <input
                placeholder="Pergunte ao Finnly…"
                value={askVal}
                onChange={e => setAskVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && askVal.trim()) {
                    openChat(askVal.trim())
                    setAskVal('')
                  }
                }}
              />
              <kbd>↵</kbd>
            </div>

            {/* Hide values */}
            <button className="icon-btn" onClick={() => setHidden(h => !h)} title={hidden ? 'Mostrar valores' : 'Ocultar valores'}>
              {hidden ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>

            {/* Bell */}
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setBell(b => !b)} title="Notificações">
                <Bell size={20} />
                {notifs.length > 0 && <span className="dot" />}
              </button>
              {bell && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={() => setBell(false)}
                  />
                  <div className="card" style={{ position: 'absolute', right: 0, top: 54, width: 320, zIndex: 50, padding: 14, boxShadow: 'var(--shadow-lg)' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, padding: '2px 4px 10px' }}>Notificações</div>
                    {notifs.length === 0 ? (
                      <p style={{ color: '#888', fontSize: 14, padding: '8px 4px' }}>Nenhuma notificação.</p>
                    ) : notifs.map((n, i) => (
                      <div
                        key={i} className="row-item" style={{ cursor: 'pointer' }}
                        onClick={() => { openChat(n.seed); setBell(false) }}
                      >
                        <div className={`row-ic ${n.tint}`}><n.Icon size={18} /></div>
                        <div className="row-main">
                          <div className="row-name" style={{ whiteSpace: 'normal' }}>{n.t}</div>
                          <div className="row-sub">{n.s}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Avatar */}
            <div className="tb-avatar" onClick={() => openChat()} title="Abrir Finnly IA">
              {userInitial}
            </div>
          </div>

          {/* CONTENT */}
          <div style={{ position: 'relative', minHeight: '400px' }}>
            {isPending && (
              <div className="dashboard-loading-overlay">
                <div className="loader-card">
                  <div className="spinner-ring" />
                  <span className="loader-text">Atualizando visão geral...</span>
                </div>
              </div>
            )}
            <div className={isPending ? 'dashboard-blur-content' : ''}>
              {active === 'home' && (
                <HomeView 
                  data={dashboardData} 
                  userName={userName} 
                  hidden={hidden} 
                  onAsk={openChat} 
                  layoutVisibility={layoutVisibility}
                  generalOrder={generalOrder}
                  leftOrder={leftOrder}
                  rightOrder={rightOrder}
                  activeMonth={activeMonth}
                  onTogglePaid={handleTogglePaid}
                  onPopulateSamples={handlePopulateSamples}
                  onAddSubscription={handleAddSubscription}
                />
              )}
              {active === 'receitas' && <ReceitasSection hidden={hidden} />}
              {active === 'despesas' && <DespesasSection hidden={hidden} />}
              {active === 'goals' && <MetasSection hidden={hidden} />}
              {active === 'ai' && (
                <div className="card empty-state fade-up" style={{ cursor: 'pointer' }} onClick={() => openChat()}>
                  <div className="t-cream" style={{ width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
                    <Sparkles size={28} />
                  </div>
                  <h3>Finnly IA</h3>
                  <p>Clique aqui ou use o botão abaixo para abrir o chat e fazer perguntas sobre suas finanças.</p>
                  <button className="btn-primary" style={{ marginTop: 18 }} onClick={() => openChat()}>
                    <Sparkles size={16} /> Abrir chat
                  </button>
                </div>
              )}
              {(active === 'invest' || active === 'cards') && <EmptyState label={activeLabel} />}
            </div>
          </div>
        </div>
      </main>

      {/* BOTTOM NAV — mobile only */}
      <nav className="bottom-nav">
        {([
          { id: 'home',     Icon: LayoutGrid, label: 'Início'    },
          { id: 'receitas', Icon: ArrowDown,  label: 'Receitas'  },
          { id: 'despesas', Icon: ArrowUp,    label: 'Despesas'  },
          { id: 'goals',    Icon: Target,     label: 'Metas'     },
        ] as const).map(n => (
          <button
            key={n.id}
            className={`bottom-nav-item${active === n.id ? ' active' : ''}`}
            onClick={() => setActive(n.id)}
          >
            <n.Icon size={20} />
            <span>{n.label}</span>
          </button>
        ))}
        <button
          className={`bottom-nav-item${active === 'ai' ? ' active' : ''}`}
          onClick={() => openChat()}
          aria-label="Finnly IA"
        >
          <span className="bottom-nav-ai"><Sparkles size={18} /></span>
          <span>Finnly</span>
        </button>
      </nav>

      {/* CHAT DRAWER */}
      {chat && <ChatDrawer seed={chat.seed} onClose={() => setChat(null)} />}

      {/* CUSTOMIZER MODAL */}
      {customizing && (
        <>
          <div className={`customizer-overlay${isClosing ? ' closing' : ''}`} onClick={handleCloseCustomizer} />
          <div className={`customizer-modal card fade-up${isClosing ? ' closing' : ''}`}>
            <div className="customizer-header">
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--teal-900)' }}>Personalizar Visão Geral</h4>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>Ative/desative ou reordene os cards do seu painel</p>
              </div>
              <button className="customizer-close" onClick={handleCloseCustomizer}>✕</button>
            </div>
            
            <div className="customizer-body">
              <div className="customizer-section">
                <h5>Área Superior (Geral)</h5>
                {generalOrder.length === 0 ? (
                  <p className="empty-msg" style={{ margin: '8px 12px', fontSize: 12 }}>Nenhum item nesta seção</p>
                ) : (
                  generalOrder.map((key, index) => renderCustomizerItem(key, index, 'general', generalOrder))
                )}
              </div>

              <div className="customizer-section">
                <h5>Coluna Principal (Esquerda)</h5>
                {leftOrder.length === 0 ? (
                  <p className="empty-msg" style={{ margin: '8px 12px', fontSize: 12 }}>Nenhum item nesta seção</p>
                ) : (
                  leftOrder.map((key, index) => renderCustomizerItem(key, index, 'left', leftOrder))
                )}
              </div>

              <div className="customizer-section">
                <h5>Coluna Lateral (Direita)</h5>
                {rightOrder.length === 0 ? (
                  <p className="empty-msg" style={{ margin: '8px 12px', fontSize: 12 }}>Nenhum item nesta seção</p>
                ) : (
                  rightOrder.map((key, index) => renderCustomizerItem(key, index, 'right', rightOrder))
                )}
              </div>
            </div>

            <div className="customizer-footer" style={{ display: 'flex', gap: 10 }}>
              <button 
                type="button"
                className="btn-ghost" 
                style={{ flex: 1, borderRadius: 12, padding: '10px 14px', fontSize: 13, borderColor: 'rgba(13, 61, 55, 0.15)' }} 
                onClick={handleRestoreDefaults}
              >
                Restaurar Padrão
              </button>
              <button 
                type="button"
                className="alloc-cta-btn" 
                style={{ flex: 1, margin: 0, padding: '10px 14px', fontSize: 13 }} 
                onClick={handleCloseCustomizer}
              >
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
