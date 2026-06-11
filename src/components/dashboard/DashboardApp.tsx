'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LayoutGrid, Receipt, Target, TrendingUp, CreditCard, Sparkles,
  Settings, Bell, ArrowUp, ArrowDown, Eye, EyeOff, Wallet,
  PiggyBank, Car, Plane, Shield, Calendar, ChevronRight,
  Check, Trophy, Coffee, Film, Zap, UtensilsCrossed,
} from 'lucide-react'
import Image from 'next/image'
import { Ring, Donut, Sparkline } from './Charts'
import { ChatDrawer } from './ChatDrawer'
import { ReceitasSection } from './sections/ReceitasSection'
import { DespesasSection } from './sections/DespesasSection'
import { MetasSection } from './sections/MetasSection'
import type { DashboardData, Transaction, CategorySummary, Goal } from '@/types/database'
import { CATEGORY_COLORS } from '@/types/database'

// ============================================================ HELPERS

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

// ============================================================ SUB-COMPONENTS

function Kpi({ label, Icon, tint, value, hidden, delay, spark, sc, sf }: {
  label: string; Icon: React.ElementType; tint: string; value: number
  hidden: boolean; delay: number; spark: number[]; sc: string; sf: string
}) {
  return (
    <div className="kpi fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="kpi-top">
        <div className={`kpi-ic ${tint}`}><Icon size={20} /></div>
        <div className="kpi-label">{label}</div>
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

// ============================================================ HOME VIEW

function HomeView({
  data, userName, hidden, onAsk,
}: {
  data: DashboardData; userName: string; hidden: boolean; onAsk: (seed: string) => void
}) {
  const [barsReady, setBarsReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setBarsReady(true), 50); return () => clearTimeout(t) }, [])

  const { monthlyIncome, monthlyExpenses, monthlySavings, score, scoreChange, categories, recentTransactions, goals } = data
  const budgetPct = monthlyIncome > 0 ? Math.min(100, Math.round((monthlySavings / monthlyIncome) * 100)) : 0
  const firstName = userName.split(' ')[0]

  const hasData = monthlyIncome > 0 || monthlyExpenses > 0

  // Build dynamic insight
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

  return (
    <div className="fd-stack">

      {/* HERO + SCORE */}
      <div className="fd-grid">
        <section className="col-8 hero fade-up">
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

        <section className="col-4 card score-card fade-up" style={{ animationDelay: '60ms' }}>
          <div className="card-head" style={{ width: '100%', marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: 15 }}>Score financeiro</div>
            <div className="card-sub">0–100</div>
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
      </div>

      {/* KPIs */}
      <div className="fd-grid">
        <div className="col-3">
          <Kpi label="Receitas do mês" Icon={ArrowDown} tint="t-green" value={monthlyIncome} hidden={hidden} delay={0} spark={[0, monthlyIncome / 1000]} sc="#28A745" sf="rgba(40,167,69,.13)" />
        </div>
        <div className="col-3">
          <Kpi label="Despesas do mês" Icon={ArrowUp} tint="t-orange" value={monthlyExpenses} hidden={hidden} delay={60} spark={[0, monthlyExpenses / 1000]} sc="#F57C00" sf="rgba(245,124,0,.12)" />
        </div>
        <div className="col-3">
          <Kpi label="Economia do mês" Icon={PiggyBank} tint="t-gold" value={Math.max(0, monthlySavings)} hidden={hidden} delay={120} spark={[0, Math.max(0, monthlySavings) / 1000]} sc="#C68A00" sf="rgba(255,179,0,.16)" />
        </div>
        <div className="col-3">
          <Kpi label="Meta principal" Icon={Target} tint="t-teal" value={goals[0]?.current_amount ?? 0} hidden={hidden} delay={180} spark={[0, (goals[0]?.current_amount ?? 0) / 1000]} sc="#01584C" sf="rgba(1,88,76,.12)" />
        </div>
      </div>

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

        {/* LEFT */}
        <div className="col-8 fd-stack">

          {/* Categorias */}
          {categories.length > 0 && (
            <section className="card fade-up">
              <CardHead Icon={Zap} tint="t-orange" title="Gastos por categoria" sub="Para onde foi seu dinheiro este mês" />
              <div>
                {categories.map((c, i) => (
                  <div key={i} className="cat-row">
                    <div className="cat-name">
                      <span className="cat-dot" style={{ background: c.color }} />
                      {c.name}
                    </div>
                    <div>
                      <div className="cat-track">
                        <i style={{ width: barsReady ? `${c.percentage}%` : '0%', background: c.color }} />
                      </div>
                      <div className="cat-pct" style={{ marginTop: 5 }}>{c.percentage}% do total</div>
                    </div>
                    <div className="cat-val"><Money v={c.amount} hidden={hidden} /></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Transações recentes */}
          <section className="card fade-up" style={{ animationDelay: '80ms' }}>
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
        </div>

        {/* RIGHT */}
        <div className="col-4 fd-stack">

          {/* Metas */}
          {goals.length > 0 && (
            <section className="card fade-up">
              <CardHead Icon={Target} tint="t-gold" title="Metas em destaque" />
              <div>
                {goals.slice(0, 3).map(g => {
                  const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0
                  const color = g.color ?? '#01584C'
                  return (
                    <div key={g.id} className="goal">
                      <div className="goal-top">
                        <div className="goal-ic" style={{ background: color + '22', color }}>
                          <Target size={18} />
                        </div>
                        <div>
                          <div className="goal-name">{g.name}</div>
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
          )}

          {/* Calendário mês */}
          <section className="card fade-up" style={{ animationDelay: '60ms' }}>
            <CardHead Icon={Calendar} tint="t-teal" title="Este mês" />
            <div>
              {[
                { label: 'Total de entradas', value: monthlyIncome, pos: true },
                { label: 'Total de saídas', value: monthlyExpenses, pos: false },
                { label: 'Saldo do mês', value: monthlySavings, pos: monthlySavings >= 0 },
              ].map((row, i) => (
                <div key={i} className="row-item" style={{ paddingTop: 10, paddingBottom: 10 }}>
                  <div className="row-main">
                    <div className="row-name">{row.label}</div>
                  </div>
                  <div className={`row-amt ${row.pos ? 'pos' : 'neg-amt'}`}>
                    {row.pos ? '+ ' : '– '}
                    <Money v={Math.abs(row.value)} cur={false} hidden={hidden} />
                  </div>
                </div>
              ))}
            </div>
          </section>

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

const NOTIF_ICONS: Record<string, React.ElementType> = {
  't-orange': CreditCard,
  't-gold': Trophy,
  't-green': Coffee,
}

interface DashboardAppProps {
  userName: string
  userInitial: string
  dashboardData: DashboardData
  signOut: () => Promise<void>
}

export function DashboardApp({ userName, userInitial, dashboardData, signOut }: DashboardAppProps) {
  const [active, setActive] = useState('home')
  const [hidden, setHidden] = useState(false)
  const [chat, setChat] = useState<{ seed: string | null } | null>(null)
  const [bell, setBell] = useState(false)
  const [askVal, setAskVal] = useState('')
  const bellRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
            <Image src="/images/logosemfundo.png" alt="Finnly" width={54} height={54} style={{ objectFit: 'contain' }} />
          </div>
          <div className="brand-name">Finn<b>ly</b></div>
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

        <button className="nav-item" onClick={() => openChat()}>
          <Sparkles size={20} />
          <span>Falar com o Finnly</span>
        </button>
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
              <div className="tb-title">{activeLabel}</div>
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
          {active === 'home' && <HomeView data={dashboardData} userName={userName} hidden={hidden} onAsk={openChat} />}
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
      </main>

      {/* CHAT DRAWER */}
      {chat && <ChatDrawer seed={chat.seed} onClose={() => setChat(null)} />}
    </div>
  )
}
