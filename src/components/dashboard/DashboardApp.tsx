'use client'

import React, { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutGrid, Receipt, Target, TrendingUp, CreditCard, Sparkles,
  Settings, Bell, ArrowUp, ArrowDown, Eye, EyeOff, Wallet,
  PiggyBank, Car, Plane, Shield, Calendar, ChevronRight, ChevronLeft,
  Check, Trophy, Coffee, Film, Zap, UtensilsCrossed, SlidersHorizontal,
  Calculator, Landmark, Mic, Flame, ArrowLeftRight, Sun, Moon, BarChart3, LogOut, Search, Menu
} from 'lucide-react'
import Image from 'next/image'
import { Ring, Donut, Sparkline } from './Charts'
import { ChatDrawer } from './ChatDrawer'
import { InfoTooltip } from './InfoTooltip'
import { ReceitasSection } from './sections/ReceitasSection'
import { DespesasSection } from './sections/DespesasSection'
import { MetasSection } from './sections/MetasSection'
import { ContasSection } from './sections/ContasSection'
import { CartoesSection } from './sections/CartoesSection'
import { InvestimentosSection } from './sections/InvestimentosSection'
import { RelatoriosSection } from './sections/RelatoriosSection'
import { processAIQuickEntry } from '@/app/dashboard/actions/ai-assistant'
import { seedMockData } from '@/app/dashboard/actions/seed'
import { createClient } from '@/utils/supabase/client'
import type { DashboardData, Transaction, CategorySummary, Goal, Subscription, Account, CreditCard as CardType, Investment, UserStreak } from '@/types/database'
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

function txIcon(category: string, type: 'income' | 'expense' | 'transfer') {
  if (type === 'transfer') return ArrowLeftRight
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

function txTint(category: string, type: 'income' | 'expense' | 'transfer') {
  if (type === 'transfer') return 't-teal'
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

function CardsWidget({ creditCards = [], hidden }: { creditCards: (CardType & { currentInvoice: number })[]; hidden: boolean }) {
  return (
    <section className="card fade-up">
      <CardHead
        Icon={CreditCard} tint="t-gold"
        title="Cartões de Crédito"
        right={<InfoTooltip text="Lista seus cartões de crédito cadastrados, o valor acumulado na fatura atual e o limite disponível." />}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {creditCards.length === 0 ? (
          <p className="empty-msg" style={{ margin: 0 }}>Nenhum cartão de crédito cadastrado.</p>
        ) : (
          creditCards.map(c => {
            const limitPct = Math.min(100, Math.round((c.currentInvoice / Number(c.limit)) * 100))
            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 8, borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                    <span style={{ fontWeight: 700, color: 'var(--teal-900)' }}>{c.name}</span>
                  </div>
                  <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontWeight: 800 }}>
                    R$ {c.currentInvoice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="thermometer-bar-container" style={{ height: 6, margin: '4px 0' }}>
                  <div className="thermometer-bar-fill" style={{ width: `${limitPct}%`, background: c.color }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
                  <span>Vence dia {c.due_day}</span>
                  <span>Limite R$ {Number(c.limit).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

function AccountsWidget({ accounts = [], hidden }: { accounts: Account[]; hidden: boolean }) {
  return (
    <section className="card fade-up">
      <CardHead
        Icon={Landmark} tint="t-teal"
        title="Contas e Bancos"
        right={<InfoTooltip text="Consolida e lista os saldos de todas as suas contas bancárias, poupanças e carteiras de dinheiro físico." />}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {accounts.slice(0, 4).map(acc => {
          const Icon = acc.type === 'poupanca' ? PiggyBank : acc.type === 'investimento' ? TrendingUp : Wallet
          return (
            <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: acc.color }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-900)' }}>{acc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>{acc.type}</div>
                </div>
              </div>
              <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 13, fontWeight: 800 }}>
                R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FutureBalanceWidget({ projection = [], insight = '', hidden }: { projection: { date: string; balance: number }[]; insight: string; hidden: boolean }) {
  const points = (projection || []).map(p => p.balance)
  const isAlert = insight.includes('🚨')

  return (
    <section className="card fade-up">
      <CardHead
        Icon={Calendar} tint="t-orange"
        title="Projeção de Saldo (30d)"
        right={<InfoTooltip text="Projeção preditiva gerada pela Inteligência Artificial nos próximos 30 dias com alertas automáticos se o caixa ficar devedor." />}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {points.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', background: 'var(--surface-2)', borderRadius: 10 }}>
            <Sparkline points={points} w={260} h={50} color={isAlert ? '#EF4444' : '#28A745'} fill={isAlert ? 'rgba(239,68,68,0.1)' : 'rgba(40,167,69,0.1)'} />
          </div>
        )}
        <div style={{
          fontSize: 12,
          lineHeight: 1.4,
          padding: '10px 12px',
          borderRadius: 8,
          background: isAlert ? 'rgba(239,68,68,0.1)' : 'var(--teal-tint)',
          color: isAlert ? '#EF4444' : 'var(--teal-900)',
          fontWeight: 600
        }}>
          {insight || 'Projeção estável para os próximos 30 dias.'}
        </div>
      </div>
    </section>
  )
}

function StreaksWidget({ streak, achievements = [] }: { streak: UserStreak | null; achievements: string[] }) {
  const currentStreak = streak?.current_streak ?? 1
  const longestStreak = streak?.longest_streak ?? 1

  const allAchievements = [
    { key: 'primeiro_passo', label: 'Primeiro Passo', desc: 'Fez o primeiro lançamento no app', icon: '⭐️', color: '#FFB300' },
    { key: 'escudo_ativo', label: 'Reserva Ativa', desc: 'Reserva de emergência preenchida', icon: '🛡️', color: '#0288D1' },
    { key: 'investidor', label: 'Investidor', desc: 'Primeiro ativo na carteira', icon: '🚀', color: '#7B1FA2' },
    { key: 'foco_semanal', label: 'Foco Semanal', desc: 'Manteve 7 dias de ofensiva', icon: '🔥', color: '#F57C00' },
  ]

  const userBadges = allAchievements.filter(a => achievements.includes(a.key))

  return (
    <section className="card fade-up">
      <CardHead
        Icon={Trophy} tint="t-gold"
        title="Ofensiva & Conquistas"
        right={<InfoTooltip text="Mostra sua consistência diária de uso no aplicativo e as medalhas comportamentais desbloqueadas pelas suas conquistas financeiras." />}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 12 }}>
          <span style={{ fontSize: 28 }}>🔥</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--teal-900)' }}>
              Ofensiva de {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}!
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Recorde atual: {longestStreak} dias seguidos.
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Medalhas ({userBadges.length}/{allAchievements.length})</div>
          {userBadges.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Nenhuma medalha conquistada. Faça lançamentos para liberar!</p>
          ) : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {userBadges.map(b => (
                <div key={b.key} title={b.desc} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: b.color + '15', border: `1px solid ${b.color}30`,
                  borderRadius: 10, padding: '3px 6px', fontSize: 10.5, fontWeight: 700, color: b.color
                }}>
                  <span>{b.icon}</span>
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function IAQuickLogger({ onRefresh }: { onRefresh: () => void }) {
  const [inputValue, setInputValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [feedback, setFeedback] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        rec.continuous = false
        rec.lang = 'pt-BR'
        rec.interimResults = false

        rec.onstart = () => setIsListening(true)
        rec.onend = () => setIsListening(false)
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInputValue(transcript)
        }
        rec.onerror = () => setIsListening(false)

        recognitionRef.current = rec
      }
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("O reconhecimento de voz por navegador não é suportado pelo seu dispositivo atual.")
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
    }
  }

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    setStatus('loading')
    setFeedback('')

    const res = await processAIQuickEntry(inputValue)
    if (res.error) {
      setStatus('error')
      setFeedback(res.error)
    } else {
      setStatus('success')
      setFeedback(res.feedback || 'Lançamento efetuado!')
      setInputValue('')
      setTimeout(() => {
        setStatus('idle')
        setFeedback('')
      }, 7000)
      onRefresh()
    }
  }

  const suggestions = [
    { text: "Recebi Pix de 1500 de salário" },
    { text: "Gastei 55 reais no Posto Ipiranga" },
    { text: "Lanche de 42 reais no cartão Nu" }
  ]

  return (
    <>
      <style>{`
        .ia-card {
          background: rgba(1, 107, 76, 0.015);
          border: 1px solid rgba(1, 107, 76, 0.12);
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .ia-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, var(--primary), #FFB300, var(--accent));
        }
        .ia-card:hover {
          border-color: rgba(1, 107, 76, 0.25);
          box-shadow: 0 10px 30px rgba(1, 107, 76, 0.05);
        }
        .mic-btn {
          transition: all 0.3s ease;
        }
        .mic-btn.listening {
          background: #F57C00 !important;
          color: #fff !important;
          animation: mic-glow-animation 1.5s infinite alternate;
        }
        @keyframes mic-glow-animation {
          from { box-shadow: 0 0 4px #F57C00, 0 0 10px rgba(245, 124, 0, 0.4); transform: scale(1); }
          to { box-shadow: 0 0 14px #F57C00, 0 0 24px rgba(245, 124, 0, 0.7); transform: scale(1.08); }
        }
        .suggestion-chip {
          background: var(--surface-2);
          border: 1px solid var(--border);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .suggestion-chip:hover {
          background: var(--teal-tint);
          border-color: var(--ring);
          transform: translateY(-1px);
        }
      `}</style>
      <section className="card ia-card fade-up" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 13.5, color: 'var(--foreground)' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: 'rgba(1, 107, 76, 0.08)', color: 'var(--primary)' }}>
              <Sparkles size={13} />
            </span>
            Lançamento Rápido por Inteligência Artificial
          </div>
          <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 20, background: 'rgba(1, 107, 76, 0.08)', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Finnly IA
          </span>
        </div>

        <form onSubmit={handleProcess} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Fale ou digite: 'Pix de 1500 de salário' ou 'Almoço de 35 reais no cartão'..."
              className="ob-input"
              style={{
                flex: 1,
                height: 44,
                paddingRight: 45,
                background: 'var(--background)',
                border: '1.5px solid var(--border)',
                borderRadius: 22,
                fontSize: 13,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
              }}
              disabled={status === 'loading'}
            />
            <button
              type="button"
              onClick={toggleListening}
              className={`mic-btn icon-btn${isListening ? ' listening' : ''}`}
              style={{
                position: 'absolute',
                right: 8,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--secondary)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer'
              }}
              title={isListening ? "Parar de ouvir" : "Falar lançamento por voz"}
            >
              <Mic size={14} />
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={status === 'loading' || !inputValue.trim()}
            style={{
              height: 44,
              borderRadius: 22,
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, var(--primary), #004d40)',
              border: 'none',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(1, 107, 76, 0.15)'
            }}
          >
            {status === 'loading' ? 'Processando...' : 'Lançar'}
          </button>
        </form>

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted-foreground)' }}>Sugestões rápidas:</span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="suggestion-chip"
              onClick={() => setInputValue(s.text)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 20,
                color: 'var(--foreground)'
              }}
            >
              {s.text}
            </button>
          ))}
        </div>

        {feedback && (
          <div style={{
            marginTop: 14,
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            background: status === 'success' ? 'rgba(40,167,69,0.06)' : 'rgba(239,68,68,0.06)',
            color: status === 'success' ? '#28A745' : '#EF4444',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            {status === 'success' ? '✅' : '❌'} {feedback}
          </div>
        )}
      </section>
    </>
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
  cards: true,
  calendar: false,
  emergencyFund: true,
  subscriptions: true,
  accounts: true,
  futureBalance: true,
  streaks: true,
}

const DEFAULT_GENERAL_ORDER = ['calendar']
const DEFAULT_LEFT_ORDER = ['budget', 'subscriptions', 'transactions', 'categories', 'accounts', 'streaks']
const DEFAULT_RIGHT_ORDER = ['score', 'emergencyFund', 'goals', 'idleCash', 'cards', 'futureBalance']

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
    label: 'Cartões de Crédito',
    desc: 'Resumo focado dos limites e faturas dos seus cartões de crédito cadastrados.'
  },
  accounts: {
    label: 'Contas e Bancos',
    desc: 'Lista detalhada de contas correntes, poupanças e carteiras de dinheiro com seus saldos atuais.'
  },
  futureBalance: {
    label: 'Previsão de Saldo (IA)',
    desc: 'Projeção inteligente do seu saldo futuro para os próximos 30 dias com alertas de caixa.'
  },
  streaks: {
    label: 'Desafios e Ofensiva',
    desc: 'Rastreador de disciplina diária (streak) e medalhas de conquistas financeiras desbloqueadas.'
  }
}

const WIDGET_SKETCHES: Record<string, { label: string; icon: React.ElementType; color: string; content: React.ReactNode }> = {
  calendar: {
    label: 'Calendário',
    icon: Calendar,
    color: '#016B4C',
    content: (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, width: 34, height: 14 }}>
        {[...Array(10)].map((_, i) => (
          <span key={i} style={{ display: 'block', height: 4, background: 'var(--border)', borderRadius: 1 }} />
        ))}
      </div>
    )
  },
  budget: {
    label: 'Planejador',
    icon: TrendingUp,
    color: '#28A745',
    content: (
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, width: 45, overflow: 'hidden' }}>
        <i style={{ display: 'block', width: '70%', height: '100%', background: '#28A745' }} />
      </div>
    )
  },
  categories: {
    label: 'Categorias',
    icon: Zap,
    color: '#F57C00',
    content: (
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <span style={{ width: 14, height: 5, background: '#F57C00', borderRadius: 2 }} />
        <span style={{ width: 8, height: 5, background: '#FFB300', borderRadius: 2 }} />
      </div>
    )
  },
  transactions: {
    label: 'Transações',
    icon: Receipt,
    color: '#016B4C',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 40 }}>
        <span style={{ height: 3, background: 'var(--border)', borderRadius: 1 }} />
        <span style={{ height: 3, background: 'var(--border)', borderRadius: 1 }} />
      </div>
    )
  },
  subscriptions: {
    label: 'Contas Fixas',
    icon: Film,
    color: '#EF4444',
    content: (
      <div style={{ display: 'flex', gap: 3 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444' }} />
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#28A745' }} />
      </div>
    )
  },
  score: {
    label: 'Score',
    icon: Trophy,
    color: '#FFB300',
    content: (
      <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #FFB300', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 7, fontWeight: 900, color: '#FFB300' }}>85</span>
      </div>
    )
  },
  goals: {
    label: 'Metas',
    icon: Target,
    color: '#FFB300',
    content: (
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, width: 40, overflow: 'hidden' }}>
        <i style={{ display: 'block', width: '50%', height: '100%', background: '#FFB300' }} />
      </div>
    )
  },
  emergencyFund: {
    label: 'Reserva',
    icon: Shield,
    color: '#016B4C',
    content: (
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, width: 35, overflow: 'hidden' }}>
        <i style={{ display: 'block', width: '80%', height: '100%', background: '#016B4C' }} />
      </div>
    )
  },
  idleCash: {
    label: 'IA Otimização',
    icon: Sparkles,
    color: '#016B4C',
    content: <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--primary)' }}>✨ IA</span>
  },
  cards: {
    label: 'Cartões',
    icon: CreditCard,
    color: '#FFB300',
    content: <div style={{ width: 22, height: 13, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--surface-3)', position: 'relative' }}><span style={{ position: 'absolute', top: 3, left: 3, width: 4, height: 3, background: 'var(--border)' }} /></div>
  },
  accounts: {
    label: 'Contas',
    icon: Landmark,
    color: '#016B4C',
    content: (
      <div style={{ display: 'flex', gap: 3 }}>
        <span style={{ width: 14, height: 6, background: 'var(--border)', borderRadius: 1 }} />
        <span style={{ width: 14, height: 6, background: 'var(--border)', borderRadius: 1 }} />
      </div>
    )
  },
  futureBalance: {
    label: 'Previsão IA',
    icon: Calendar,
    color: '#F57C00',
    content: (
      <div style={{ width: 40, height: 12, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
        <span style={{ width: 3, height: 4, background: 'var(--border)' }} /><span style={{ width: 3, height: 8, background: 'var(--border)' }} /><span style={{ width: 3, height: 11, background: '#28A745' }} />
      </div>
    )
  },
  streaks: {
    label: 'Ofensiva',
    icon: Flame,
    color: '#F57C00',
    content: <span style={{ fontSize: 9, fontWeight: 900, color: '#F57C00' }}>🔥 5d</span>
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
  const router = useRouter()
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
        return <CardsWidget key={key} creditCards={data.creditCards} hidden={hidden} />
      case 'accounts':
        return <AccountsWidget key={key} accounts={data.accounts} hidden={hidden} />
      case 'futureBalance':
        return <FutureBalanceWidget key={key} projection={data.futureBalanceProjection || []} insight={data.futureBalanceInsight || ''} hidden={hidden} />
      case 'streaks':
        return <StreaksWidget key={key} streak={data.streaks} achievements={data.achievements || []} />
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
          <div className="col-4 fd-stack" style={{ height: '100%' }}>
            {visibleGeneralItems.map(key => (
              <div key={key} className="general-widget-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {renderWidget(key)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IA VOICE/TEXT QUICK LOGGER */}
      <IAQuickLogger onRefresh={() => router.refresh()} />

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
  { id: 'home', Icon: LayoutGrid, label: 'Visão geral', group: 'Principal' },
  { id: 'receitas', Icon: ArrowDown, label: 'Receitas', group: 'Principal' },
  { id: 'despesas', Icon: ArrowUp, label: 'Despesas', group: 'Principal' },
  { id: 'accounts', Icon: Landmark, label: 'Contas', group: 'Principal' },
  { id: 'cards', Icon: CreditCard, label: 'Cartões', group: 'Principal' },
  { id: 'invest', Icon: TrendingUp, label: 'Investimentos', group: 'Planejamento' },
  { id: 'goals', Icon: Target, label: 'Metas', group: 'Planejamento' },
  { id: 'reports', Icon: BarChart3, label: 'Relatórios', group: 'Planejamento' },
  { id: 'ai', Icon: Sparkles, label: 'Finnly IA', group: 'Especial' },
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
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [chat, setChat] = useState<{ seed: string | null } | null>(null)
  const [bell, setBell] = useState(false)
  const [askVal, setAskVal] = useState('')
  const bellRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()

  const toggleSidebar = () => {
    setIsTransitioning(true)
    setSidebarOpen(prev => !prev)
    setTimeout(() => {
      setIsTransitioning(false)
    }, 300)
  }
  
  const [customizing, setCustomizing] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [layoutVisibility, setLayoutVisibility] = useState(DEFAULT_VISIBILITY)
  const [generalOrder, setGeneralOrder] = useState(DEFAULT_GENERAL_ORDER)
  const [leftOrder, setLeftOrder] = useState(DEFAULT_LEFT_ORDER)
  const [rightOrder, setRightOrder] = useState(DEFAULT_RIGHT_ORDER)
  const [draggedItem, setDraggedItem] = useState<{ section: 'general' | 'left' | 'right'; index: number } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<{ section: 'general' | 'left' | 'right'; index: number } | null>(null)
  const [customizerError, setCustomizerError] = useState<string | null>(null)


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

  const handleDragStart = (e: React.DragEvent, section: 'general' | 'left' | 'right', index: number) => {
    setDraggedItem({ section, index })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '')
  }

  const handleDragOver = (e: React.DragEvent, targetSection: 'general' | 'left' | 'right', targetIndex: number) => {
    e.preventDefault()
    if (!draggedItem) return
    if (dragOverItem?.section !== targetSection || dragOverItem?.index !== targetIndex) {
      setDragOverItem({ section: targetSection, index: targetIndex })
    }
  }

  const handleDrop = async (e: React.DragEvent, targetSection: 'general' | 'left' | 'right', targetIndex: number) => {
    e.preventDefault()
    setDragOverItem(null)
    if (!draggedItem) return

    const sourceSection = draggedItem.section
    const sourceIndex = draggedItem.index

    if (sourceSection === targetSection && sourceIndex === targetIndex) return

    // Limit check for General area: block and show error banner
    if (targetSection === 'general' && sourceSection !== 'general' && generalOrder.length >= 1) {
      setCustomizerError('A área superior (Geral) suporta no máximo 1 card. Remova ou mova o card atual primeiro.')
      setTimeout(() => setCustomizerError(null), 4000)
      setDraggedItem(null)
      return
    }

    const nextGeneral = [...generalOrder]
    const nextLeft = [...leftOrder]
    const nextRight = [...rightOrder]

    const sourceList = sourceSection === 'general' ? nextGeneral : sourceSection === 'left' ? nextLeft : nextRight
    const key = sourceList[sourceIndex]

    // Remove from source
    if (sourceSection === 'general') nextGeneral.splice(sourceIndex, 1)
    else if (sourceSection === 'left') nextLeft.splice(sourceIndex, 1)
    else nextRight.splice(sourceIndex, 1)

    // Insert into target
    if (targetSection === 'general') nextGeneral.splice(targetIndex, 0, key)
    else if (targetSection === 'left') nextLeft.splice(targetIndex, 0, key)
    else nextRight.splice(targetIndex, 0, key)

    setGeneralOrder(nextGeneral)
    setLeftOrder(nextLeft)
    setRightOrder(nextRight)
    await saveLayout(layoutVisibility, nextGeneral, nextLeft, nextRight)
    setDraggedItem(null)
  }

  const handleDropSection = async (e: React.DragEvent, targetSection: 'general' | 'left' | 'right') => {
    e.preventDefault()
    setDragOverItem(null)
    if (!draggedItem) return

    const sourceSection = draggedItem.section
    const sourceIndex = draggedItem.index

    if (sourceSection === targetSection) return

    // Limit check for General area: block and show error banner
    if (targetSection === 'general' && generalOrder.length >= 1) {
      setCustomizerError('A área superior (Geral) suporta no máximo 1 card. Remova ou mova o card atual primeiro.')
      setTimeout(() => setCustomizerError(null), 4000)
      setDraggedItem(null)
      return
    }

    const nextGeneral = [...generalOrder]
    const nextLeft = [...leftOrder]
    const nextRight = [...rightOrder]

    const sourceList = sourceSection === 'general' ? nextGeneral : sourceSection === 'left' ? nextLeft : nextRight
    const key = sourceList[sourceIndex]

    // Remove from source
    if (sourceSection === 'general') nextGeneral.splice(sourceIndex, 1)
    else if (sourceSection === 'left') nextLeft.splice(sourceIndex, 1)
    else nextRight.splice(sourceIndex, 1)

    // Append to target
    if (targetSection === 'general') nextGeneral.push(key)
    else if (targetSection === 'left') nextLeft.push(key)
    else nextRight.push(key)

    setGeneralOrder(nextGeneral)
    setLeftOrder(nextLeft)
    setRightOrder(nextRight)
    await saveLayout(layoutVisibility, nextGeneral, nextLeft, nextRight)
    setDraggedItem(null)
  }

  const handleMoveSection = async (key: string, targetSection: 'general' | 'left' | 'right') => {
    const currentSection = generalOrder.includes(key)
      ? 'general'
      : leftOrder.includes(key)
        ? 'left'
        : 'right'

    if (currentSection === targetSection) return

    let nextGeneral = generalOrder.filter(x => x !== key)
    const nextLeft = leftOrder.filter(x => x !== key)
    const nextRight = rightOrder.filter(x => x !== key)
    let nextVis = { ...layoutVisibility }

    if (targetSection === 'general') {
      if (generalOrder.length > 0) {
        generalOrder.forEach(oldKey => {
          if (oldKey !== key) {
            nextVis = { ...nextVis, [oldKey as keyof typeof layoutVisibility]: false }
          }
        })
        nextGeneral = []
      }
      nextGeneral.push(key)
    } else if (targetSection === 'left') {
      nextLeft.push(key)
    } else {
      nextRight.push(key)
    }

    setLayoutVisibility(nextVis)
    setGeneralOrder(nextGeneral)
    setLeftOrder(nextLeft)
    setRightOrder(nextRight)
    await saveLayout(nextVis, nextGeneral, nextLeft, nextRight)
  }

  const handleUpdateWidgetPosition = async (key: string, position: 'hidden' | 'general' | 'left' | 'right') => {
    const isVisible = position !== 'hidden'
    let nextVis = { ...layoutVisibility, [key as keyof typeof layoutVisibility]: isVisible }

    let nextGeneral = generalOrder.filter(x => x !== key)
    const nextLeft = leftOrder.filter(x => x !== key)
    const nextRight = rightOrder.filter(x => x !== key)

    if (position === 'general') {
      if (generalOrder.length > 0) {
        generalOrder.forEach(oldKey => {
          if (oldKey !== key) {
            nextVis = { ...nextVis, [oldKey as keyof typeof layoutVisibility]: false }
          }
        })
        nextGeneral = []
      }
      nextGeneral.push(key)
    } else if (position === 'left') {
      nextLeft.push(key)
    } else if (position === 'right') {
      nextRight.push(key)
    }

    setLayoutVisibility(nextVis)
    setGeneralOrder(nextGeneral)
    setLeftOrder(nextLeft)
    setRightOrder(nextRight)

    await saveLayout(nextVis, nextGeneral, nextLeft, nextRight)
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

    let borderLeftColor = 'var(--line-soft)'
    if (section === 'general') borderLeftColor = 'var(--teal)'
    else if (section === 'left') borderLeftColor = '#2563eb'
    else if (section === 'right') borderLeftColor = '#7c3aed'

    return (
      <div 
        key={key}
        className="customizer-row-wrapper"
        draggable
        onDragStart={(e) => handleDragStart(e, section, index)}
        onDragOver={(e) => handleDragOver(e, section, index)}
        onDrop={(e) => handleDrop(e, section, index)}
        onDragEnd={() => {
          setDraggedItem(null)
          setDragOverItem(null)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          marginBottom: 8,
          transition: 'all 0.2s'
        }}
      >
        {/* Drag Handle (Outside the card) */}
        <div 
          className="drag-handle" 
          style={{ cursor: 'grab', display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 6px 12px 0', marginRight: 6, flexShrink: 0 }} 
          title="Arraste para reordenar"
        >
          <div style={{ width: 12, height: 2, background: 'var(--muted)', borderRadius: 1, opacity: 0.6 }} />
          <div style={{ width: 12, height: 2, background: 'var(--muted)', borderRadius: 1, opacity: 0.6 }} />
          <div style={{ width: 12, height: 2, background: 'var(--muted)', borderRadius: 1, opacity: 0.6 }} />
        </div>

        {/* Customizer Card Item */}
        <div 
          className={`customizer-item${draggedItem?.section === section && draggedItem?.index === index ? ' dragging' : ''}`}
          style={{ 
            flex: 1,
            display: 'flex',
            alignItems: 'flex-start', 
            flexDirection: 'column', 
            gap: 6, 
            padding: '12px 14px',
            borderLeft: `4px solid ${borderLeftColor}`,
            background: 'var(--surface)',
            borderRadius: '14px',
            border: '1px solid var(--line-soft)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s',
            minWidth: 0
          }}
        >
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div className="item-drag-group" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 6 }}>
              {/* Up/Down buttons (keep them inside) */}
              <div className="order-btns" style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4, flexShrink: 0 }}>
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

              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="item-label" style={{ display: 'block', lineHeight: '1.2' }}>{info.label}</span>
                <span className="item-desc">{info.desc}</span>
              </div>
            </div>
            <label className="switch" style={{ alignSelf: 'flex-start', marginTop: 2, flexShrink: 0 }}>
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
              className={`sec-choice-btn${section === 'general' ? ' active-general' : ''}`}
              onClick={() => handleMoveSection(key, 'general')}
            >Geral</button>
            <button 
              type="button"
              className={`sec-choice-btn${section === 'left' ? ' active-left' : ''}`}
              onClick={() => handleMoveSection(key, 'left')}
            >Principal</button>
            <button 
              type="button"
              className={`sec-choice-btn${section === 'right' ? ' active-right' : ''}`}
              onClick={() => handleMoveSection(key, 'right')}
            >Lateral</button>
          </div>
        </div>
      </div>
    )
  }

  const renderCustomizerSectionItems = (section: 'general' | 'left' | 'right', order: string[]) => {
    if (order.length === 0) {
      return <p className="empty-msg" style={{ margin: '8px 12px', fontSize: 12 }}>Nenhum item nesta seção</p>
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {order.map((key, index) => {
          const isDragOver = dragOverItem?.section === section && dragOverItem?.index === index
          const isCurrentDragged = draggedItem?.section === section && draggedItem?.index === index
          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              {isDragOver && !isCurrentDragged && (
                <div className="drag-placeholder" />
              )}
              {renderCustomizerItem(key, index, section, order)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`app ${!sidebarOpen ? 'sidebar-collapsed' : ''} ${isTransitioning ? 'sidebar-transitioning' : ''}`}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-inner">
            <div className="brand-mark" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
              <Image src="/images/logosemfundo.png" alt="Finnly" width={36} height={36} style={{ objectFit: 'contain' }} />
            </div>
            <div className="brand-name">Finn<b>ly</b></div>
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar} title="Alternar menu">
            <Menu size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 8 }}>
          <div className="sidebar-search has-tooltip">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Buscar..." />
            <div className="tooltip">Buscar</div>
          </div>
          {NAV.map((n, idx) => {
            const showGroup = n.group && (!NAV[idx - 1] || NAV[idx - 1].group !== n.group)

            return (
              <React.Fragment key={n.id}>
                {showGroup && (
                  <div className="nav-label">{n.group}</div>
                )}
                <button
                  className={`nav-item has-tooltip${active === n.id ? ' active' : ''}${n.id === 'ai' ? ' special' : ''}`}
                  onClick={() => setActive(n.id)}
                >
                  <n.Icon size={18} strokeWidth={active === n.id ? 2.5 : 2} />
                  <span>{n.label}</span>
                  <div className="tooltip">{n.label}</div>
                </button>
              </React.Fragment>
            )
          })}
        </div>

        <div className="side-card has-tooltip">
          <div className="av">{userInitial}</div>
          <div className="user-info">
            <div className="nm">{userName}</div>
            <div className="pl">Plano Pessoal</div>
          </div>
          <div className="tooltip">{userName}</div>
          <button className="logout-btn has-tooltip" onClick={() => signOut()} title="Sair">
            <LogOut size={20} />
            <div className="tooltip">Sair</div>
          </button>
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
              {active === 'receitas' && <ReceitasSection hidden={hidden} onAsk={openChat} />}
              {active === 'despesas' && <DespesasSection hidden={hidden} />}
              {active === 'accounts' && <ContasSection hidden={hidden} />}
              {active === 'cards' && <CartoesSection hidden={hidden} />}
              {active === 'invest' && <InvestimentosSection hidden={hidden} />}
              {active === 'goals' && <MetasSection hidden={hidden} />}
              {active === 'reports' && <RelatoriosSection dashboardData={dashboardData} hidden={hidden} />}
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
          { id: 'accounts', Icon: Landmark,   label: 'Contas'    },
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

      {customizing && (
        <>
          <div className={`customizer-overlay${isClosing ? ' closing' : ''}`} onClick={handleCloseCustomizer} />
          <div className={`customizer-modal card fade-up${isClosing ? ' closing' : ''}`} style={{ maxWidth: 880, width: '95%', maxHeight: '90vh' }}>
            <div className="customizer-header">
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--teal-900)' }}>Personalizar Visão Geral</h4>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>Ative/desative ou reordene os cards do seu painel</p>
              </div>
              <button className="customizer-close" onClick={handleCloseCustomizer}>✕</button>
            </div>
            
            <div className="customizer-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {customizerError && (
                <div className="customizer-error-banner" style={{
                  width: '100%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10
                }}>
                  <span>{customizerError}</span>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '800' }} onClick={() => setCustomizerError(null)}>✕</button>
                </div>
              )}

              {/* PAINEL ESQUERDO: LISTA DE CARDS DISPONÍVEIS */}
              <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 10, borderRight: '1px solid var(--line-soft)', paddingRight: 12, minWidth: 280 }}>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: 0.5 }}>Cards Disponíveis</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1, maxHeight: '50vh', paddingRight: 4 }}>
                  {Object.entries(WIDGET_INFO).map(([key, info]) => {
                    const visKey = key as keyof typeof DEFAULT_VISIBILITY
                    const isVisible = !!layoutVisibility[visKey]
                    const currentSection = generalOrder.includes(key)
                      ? 'general'
                      : leftOrder.includes(key)
                        ? 'left'
                        : 'right'

                    const currentPos = !isVisible ? 'hidden' : currentSection
                    const sketch = WIDGET_SKETCHES[key]
                    const Icon = sketch?.icon || Target

                    return (
                      <div key={key} style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: (sketch?.color || 'var(--primary)') + '15', color: sketch?.color || 'var(--primary)' }}>
                              <Icon size={12} />
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--teal-900)' }}>{info.label}</span>
                          </div>
                          
                          {/* BOTÕES DE POSICIONAMENTO RÁPIDO */}
                          <div style={{ display: 'flex', gap: 3 }}>
                            <button
                              type="button"
                              title="Superior (Geral)"
                              onClick={() => handleUpdateWidgetPosition(key, 'general')}
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '3px 6px',
                                borderRadius: 6,
                                border: '1px solid ' + (currentPos === 'general' ? '#FFB300' : 'var(--border)'),
                                background: currentPos === 'general' ? 'rgba(255, 179, 0, 0.12)' : 'var(--surface)',
                                color: currentPos === 'general' ? '#C68A00' : 'var(--muted)',
                                cursor: 'pointer'
                              }}
                            >
                              Topo
                            </button>
                            <button
                              type="button"
                              title="Coluna Esquerda"
                              onClick={() => handleUpdateWidgetPosition(key, 'left')}
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '3px 6px',
                                borderRadius: 6,
                                border: '1px solid ' + (currentPos === 'left' ? '#2563eb' : 'var(--border)'),
                                background: currentPos === 'left' ? 'rgba(37, 99, 235, 0.12)' : 'var(--surface)',
                                color: currentPos === 'left' ? '#2563eb' : 'var(--muted)',
                                cursor: 'pointer'
                              }}
                            >
                              Esq
                            </button>
                            <button
                              type="button"
                              title="Coluna Direita"
                              onClick={() => handleUpdateWidgetPosition(key, 'right')}
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '3px 6px',
                                borderRadius: 6,
                                border: '1px solid ' + (currentPos === 'right' ? '#7c3aed' : 'var(--border)'),
                                background: currentPos === 'right' ? 'rgba(124, 58, 237, 0.12)' : 'var(--surface)',
                                color: currentPos === 'right' ? '#7c3aed' : 'var(--muted)',
                                cursor: 'pointer'
                              }}
                            >
                              Dir
                            </button>
                            <button
                              type="button"
                              title="Ocultar Card"
                              onClick={() => handleUpdateWidgetPosition(key, 'hidden')}
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '3px 6px',
                                borderRadius: 6,
                                border: '1px solid ' + (currentPos === 'hidden' ? 'red' : 'var(--border)'),
                                background: currentPos === 'hidden' ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface)',
                                color: currentPos === 'hidden' ? 'red' : 'var(--muted)',
                                cursor: 'pointer'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>{info.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* PAINEL DIREITO: ESBOÇO VISUAL DO PAINEL */}
              <div style={{ flex: '1 2 440px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 320 }}>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: 0.5 }}>Layout do Painel (Esboço)</h4>
                
                <div style={{
                  background: 'var(--surface)',
                  border: '2px dashed var(--border)',
                  borderRadius: 16,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  overflowY: 'auto',
                  flex: 1,
                  maxHeight: '50vh'
                }}>
                  {/* MOCKUP AREA SUPERIOR */}
                  <div style={{
                    background: 'rgba(1, 107, 76, 0.03)',
                    border: '1px solid rgba(1, 107, 76, 0.15)',
                    borderRadius: 12,
                    padding: 10
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', marginBottom: 6, textTransform: 'uppercase' }}>Área Superior (Geral)</div>
                    {generalOrder.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Nenhum card ativo no topo</p>
                    ) : (
                      generalOrder.map((key) => {
                        const sketch = WIDGET_SKETCHES[key]
                        const Icon = sketch?.icon || Target
                        return (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: (sketch?.color || 'var(--primary)') + '15', color: sketch?.color || 'var(--primary)' }}>
                                <Icon size={12} />
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-900)' }}>{sketch?.label || key}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {sketch?.content}
                              <button type="button" onClick={() => handleUpdateWidgetPosition(key, 'hidden')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontWeight: 800 }}>✕</button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* MOCKUP DUAS COLUNAS */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    
                    {/* COLUNA ESQUERDA */}
                    <div style={{
                      flex: '1 1 200px',
                      background: 'rgba(37, 99, 235, 0.03)',
                      border: '1px solid rgba(37, 99, 235, 0.12)',
                      borderRadius: 12,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      minWidth: 150
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', marginBottom: 2, textTransform: 'uppercase' }}>Coluna Esquerda</div>
                      {leftOrder.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Sem cards</p>
                      ) : (
                        leftOrder.map((key, idx) => {
                          const sketch = WIDGET_SKETCHES[key]
                          const Icon = sketch?.icon || Target
                          return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)', padding: '6px 10px', borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', fontSize: 8, lineHeight: 1, color: 'var(--muted)', flexShrink: 0 }}>
                                  <button type="button" disabled={idx === 0} onClick={() => handleMoveItem('left', idx, 'up')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>▲</button>
                                  <button type="button" disabled={idx === leftOrder.length - 1} onClick={() => handleMoveItem('left', idx, 'down')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>▼</button>
                                </div>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 6, background: (sketch?.color || 'var(--primary)') + '15', color: sketch?.color || 'var(--primary)', flexShrink: 0 }}>
                                  <Icon size={11} />
                                </span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sketch?.label || key}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {sketch?.content}
                                <button type="button" onClick={() => handleUpdateWidgetPosition(key, 'hidden')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontWeight: 800 }}>✕</button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* COLUNA DIREITA */}
                    <div style={{
                      flex: '1 1 200px',
                      background: 'rgba(124, 58, 237, 0.03)',
                      border: '1px solid rgba(124, 58, 237, 0.12)',
                      borderRadius: 12,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      minWidth: 150
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', marginBottom: 2, textTransform: 'uppercase' }}>Coluna Direita</div>
                      {rightOrder.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Sem cards</p>
                      ) : (
                        rightOrder.map((key, idx) => {
                          const sketch = WIDGET_SKETCHES[key]
                          const Icon = sketch?.icon || Target
                          return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)', padding: '6px 10px', borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', fontSize: 8, lineHeight: 1, color: 'var(--muted)', flexShrink: 0 }}>
                                  <button type="button" disabled={idx === 0} onClick={() => handleMoveItem('right', idx, 'up')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>▲</button>
                                  <button type="button" disabled={idx === rightOrder.length - 1} onClick={() => handleMoveItem('right', idx, 'down')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>▼</button>
                                </div>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 6, background: (sketch?.color || 'var(--primary)') + '15', color: sketch?.color || 'var(--primary)', flexShrink: 0 }}>
                                  <Icon size={11} />
                                </span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sketch?.label || key}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {sketch?.content}
                                <button type="button" onClick={() => handleUpdateWidgetPosition(key, 'hidden')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontWeight: 800 }}>✕</button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                  </div>
                </div>

              </div>

            </div>

            <div className="customizer-footer" style={{ display: 'flex', gap: 10 }}>
              <button 
                type="button"
                className="btn-ghost" 
                style={{ flex: 1, borderRadius: 12, padding: '10px 14px', fontSize: 13, borderColor: 'rgba(13, 61, 55, 0.15)', cursor: 'pointer' }} 
                onClick={handleRestoreDefaults}
              >
                Restaurar Padrão
              </button>
              <button 
                type="button"
                className="alloc-cta-btn" 
                style={{ flex: 1, margin: 0, padding: '10px 14px', fontSize: 13, cursor: 'pointer' }} 
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
