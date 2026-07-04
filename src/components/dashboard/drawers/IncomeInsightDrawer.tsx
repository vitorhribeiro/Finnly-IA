'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Wallet, Percent, HeartPulse, CheckCircle2, ShieldCheck, Pencil, ArrowRight, Sparkles, TrendingUp, AlertCircle, Info, CalendarClock } from 'lucide-react'

type IncomeInsightDrawerProps = {
  isOpen: boolean
  onClose: () => void
  type: 'period' | 'realization' | 'health' | null
  data: any
  onEdit?: (inc: any) => void
  onToggle?: (inc: any) => void
  onViewAll?: () => void
  onAdd?: () => void
  onAsk?: (q: string) => void
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcularDiasRestantesNoMes(ym?: string): number {
  if (!ym) ym = new Date().toISOString().slice(0, 7)
  const today = new Date()
  const currentYM = today.toISOString().slice(0, 7)
  
  const [y, m] = ym.split('-').map(Number)
  const lastDayOfMonth = new Date(y, m, 0).getDate()
  
  if (ym === currentYM) {
    const currentDay = today.getDate()
    return Math.max(0, lastDayOfMonth - currentDay + 1)
  } else if (ym < currentYM) {
    return 0
  } else {
    return lastDayOfMonth
  }
}

export function IncomeInsightDrawer({ isOpen, onClose, type, data, onEdit, onToggle, onViewAll, onAdd, onAsk }: IncomeInsightDrawerProps) {
  const [isRendered, setIsRendered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  
  const [isAtTop, setIsAtTop] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, clientHeight, scrollHeight } = scrollContainerRef.current
      setIsAtTop(scrollTop <= 0)
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 1)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0
          const { scrollTop, clientHeight, scrollHeight } = scrollContainerRef.current
          setIsAtTop(scrollTop <= 0)
          setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 1)
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, type])

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true)
      requestAnimationFrame(() => setIsVisible(true))
      document.body.style.overflow = 'hidden'
    } else {
      setIsVisible(false)
      const timer = setTimeout(() => setIsRendered(false), 300)
      document.body.style.overflow = ''
      return () => clearTimeout(timer)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isRendered) return null

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'var(--teal)'
    if (status === 'light_attention') return 'var(--gold)'
    if (status === 'attention') return 'var(--orange)'
    if (status === 'critical') return 'var(--neg)'
    return 'rgba(13, 61, 55, 0.15)'
  }

  const getBadgeClass = (status: string) => {
    if (status === 'healthy') return 'status-saudavel'
    if (status === 'light_attention') return 'status-atencao-leve'
    if (status === 'attention') return 'status-atencao'
    if (status === 'critical') return 'status-critico'
    return 'status-empty'
  }

  const renderPeriodDetails = () => {
    if (!data.period) return null
    const { totalPeriodo, recebido, pendente, atrasado, propRecebido, propPendente, propAtrasado, periodoState, hidden, currentIncomes, categories } = data.period

    const today = new Date().toISOString().slice(0, 10)
    
    // Próximas Entradas (Pendente / Atrasado)
    let upcoming = []
    if (currentIncomes) {
      upcoming = currentIncomes
        .filter((i: any) => !i.payment_status)
        .sort((a: any, b: any) => a.date.localeCompare(b.date))
        .slice(0, 4)
    }

    // Fontes da Receita
    let catRanking: any[] = []
    if (currentIncomes) {
      const catMap: Record<string, number> = {}
      currentIncomes.forEach((i: any) => catMap[i.category] = (catMap[i.category] ?? 0) + Number(i.amount))
      catRanking = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, amount]) => {
          const catObj = categories?.find((c: any) => c.name === name)
          return { name, amount, color: catObj?.color || '#90A4AE', pct: totalPeriodo > 0 ? (amount / totalPeriodo) * 100 : 0 }
        })
    }

    // Leitura Rápida (Insights)
    const insights = []
    if (pendente > 0) insights.push(`R$ ${brl(pendente)} ainda pendentes para concluir o mês.`)
    if (catRanking.length > 0 && catRanking[0].pct > 50) insights.push(`Sua receita está fortemente concentrada em ${catRanking[0].name} (${Math.round(catRanking[0].pct)}%).`)
    else if (atrasado === 0 && pendente === 0 && recebido > 0) insights.push(`Você já recebeu 100% da receita prevista!`)
    else if (atrasado > 0) insights.push(`Atenção: existem receitas atrasadas que somam R$ ${brl(atrasado)}.`)
    else if (atrasado === 0 && pendente > 0 && recebido > 0) insights.push(`Nenhuma receita atrasada no momento. Bom trabalho!`)

    return (
      <div className="drawer-content-section fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <div className="insight-drawer-header" style={{ marginBottom: 24 }}>
            <div className="insight-drawer-icon" style={{ background: 'var(--teal-900)', color: 'white', borderRadius: 12, width: 44, height: 44 }}>
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="insight-drawer-title">Receitas do Período</h3>
              <p className="insight-drawer-sub">Detalhamento das entradas previstas</p>
            </div>
          </div>

          {/* Hero */}
          <div className="drawer-hero-box card" style={{ padding: '24px', marginBottom: 24, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', color: 'var(--ink)', position: 'relative', overflow: 'hidden' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', position: 'relative' }}>Total previsto no período</span>
            <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 40, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.5px', marginTop: 4, marginBottom: 20, position: 'relative' }}>
              R$ {brl(totalPeriodo)}
            </div>

            <div style={{ width: '100%', height: 6, borderRadius: 3, display: 'flex', overflow: 'hidden', background: 'var(--line-soft)', position: 'relative' }}>
              {propRecebido > 0 && <div style={{ width: `max(4px, ${propRecebido}%)`, backgroundColor: 'var(--green)' }} />}
              {propPendente > 0 && <div style={{ width: `max(4px, ${propPendente}%)`, backgroundColor: 'var(--gold)' }} />}
              {propAtrasado > 0 && <div style={{ width: `max(4px, ${propAtrasado}%)`, backgroundColor: 'var(--neg)' }} />}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginTop: 12, position: 'relative' }}>
              {atrasado > 0 ? 'Existem receitas em atraso.' : pendente > recebido ? 'Maior parte da receita ainda está pendente.' : recebido === totalPeriodo && totalPeriodo > 0 ? 'Receita totalmente recebida no período.' : 'Recebimento dentro da normalidade.'}
            </div>
          </div>

          {/* Mini Cards */}
          <div className="fd-grid" style={{ gap: 12, gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 32 }}>
            <div className="drawer-mini-card">
              <span className="drawer-metric-label"><span className="dot" style={{ background: 'var(--green)' }} /> Recebido</span>
              <div className={`drawer-metric-val tabnums${hidden ? ' priv' : ''}`}>R$ {brl(recebido)}</div>
              <span className="drawer-metric-pct">{propRecebido.toFixed(1)}%</span>
            </div>
            <div className="drawer-mini-card">
              <span className="drawer-metric-label"><span className="dot" style={{ background: 'var(--gold)' }} /> Pendente</span>
              <div className={`drawer-metric-val tabnums${hidden ? ' priv' : ''}`}>R$ {brl(pendente)}</div>
              <span className="drawer-metric-pct" style={{ color: 'var(--orange-ink)', background: 'rgba(245,124,0,0.1)' }}>{propPendente.toFixed(1)}%</span>
            </div>
            <div className="drawer-mini-card">
              <span className="drawer-metric-label"><span className="dot" style={{ background: 'var(--neg)' }} /> Atrasado</span>
              <div className={`drawer-metric-val tabnums${hidden ? ' priv' : ''}`}>R$ {brl(atrasado)}</div>
              <span className="drawer-metric-pct" style={{ color: 'var(--neg)', background: 'rgba(239,68,68,0.1)' }}>{propAtrasado.toFixed(1)}%</span>
            </div>
          </div>

          {/* Próximas Entradas */}
          {upcoming.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <h4 className="drawer-section-title">Próximas entradas</h4>
              <div className="upcoming-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map((inc: any) => {
                  const isLate = inc.date < today
                  const catColor = categories?.find((c:any) => c.name === inc.category)?.color || '#90A4AE'
                  return (
                    <div key={inc.id} className="upcoming-item">
                      <div className="upcoming-icon" style={{ background: catColor + '15', color: catColor }}>
                        <Wallet size={14} />
                      </div>
                      <div className="upcoming-info">
                        <div className="upcoming-name">{inc.description || inc.category}</div>
                        <div className="upcoming-sub">
                          <span>{inc.date.split('-').reverse().slice(0,2).join('/')}</span>
                          <span style={{ color: 'var(--line-strong)' }}>•</span>
                          <span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(Number(inc.amount))}</span>
                          <span style={{ color: 'var(--line-strong)' }}>•</span>
                          <span style={{ color: isLate ? 'var(--neg)' : 'var(--orange-ink)', fontWeight: 700 }}>
                            {isLate ? 'Atrasada' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                      <div className="upcoming-actions">
                        <button className="upcoming-btn check-btn" onClick={() => onToggle && onToggle(inc)} title="Marcar como recebida">
                          <CheckCircle2 size={14} />
                        </button>
                        <button className="upcoming-btn edit-btn" onClick={() => onEdit && onEdit(inc)} title="Editar">
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
             <div style={{ marginBottom: 24 }}>
               <h4 className="drawer-section-title">Próximas entradas</h4>
               <div className="upcoming-empty">Nenhuma entrada pendente neste período.</div>
             </div>
          )}

          {/* Fontes da Receita */}
          {catRanking.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 className="drawer-section-title">Fontes da receita</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {catRanking.map((cr: any) => (
                  <div key={cr.name} className="category-ranking-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: cr.color }} />
                        {cr.name}
                      </div>
                      <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ color: 'var(--muted)', fontWeight: 500 }}>
                        {Math.round(cr.pct)}% <span style={{ color: 'var(--line-strong)', margin: '0 4px' }}>·</span> R$ {brl(cr.amount)}
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `max(2px, ${cr.pct}%)`, height: '100%', background: cr.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leitura Rápida */}
          {insights.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 className="drawer-section-title">Leitura rápida</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.map((ins, idx) => (
                  <div key={idx} className="insight-pill">
                    <Sparkles size={14} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 2 }} />
                    <span>{ins}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderRealizationDetails = () => {
    if (!data.realization) return null
    const { pctRealizacaoDisplayStr, realizacaoState, pctBar, recebido, totalPeriodo, faltante, hidden, currentIncomes, categories, atrasado, pendente, selectedMonth } = data.realization

    const today = new Date().toISOString().slice(0, 10)
    
    // Próximas Entradas (Pendente / Atrasado)
    let upcoming = []
    if (currentIncomes) {
      upcoming = currentIncomes
        .filter((i: any) => !i.payment_status)
        .sort((a: any, b: any) => a.date.localeCompare(b.date))
        .slice(0, 4)
    }

    // Calculations
    const totalPrevisto = totalPeriodo
    const pctRealizacao = totalPrevisto > 0 ? (recebido / totalPrevisto) * 100 : 0
    const calculatedFaltante = Math.max(totalPrevisto - recebido, 0)
    const potencialFechamento = recebido + (pendente || 0) + (atrasado || 0)
    const diasRestantes = calcularDiasRestantesNoMes(selectedMonth)
    const mediaDiariaNecessaria = diasRestantes > 0 ? calculatedFaltante / diasRestantes : calculatedFaltante

    // Formatting Pct: PT-BR formatted decimal logic
    const formatPctRealizacao = (val: number) => {
      if (val === 0) return '0%'
      if (val > 0 && val < 1) return val.toFixed(1).replace('.', ',') + '%'
      return Math.round(val) + '%'
    }
    const pctDisplayStr = formatPctRealizacao(pctRealizacao)

    // Progress Bar visual width limit
    const pctBarLimited = Math.min(100, pctRealizacao)
    const barWidthStr = pctRealizacao > 0 ? `${Math.max(4, pctBarLimited)}%` : '0%'

    const potencialSubtext = (atrasado || 0) > 0
      ? 'Se pendências e atrasos forem regularizados'
      : 'Se as entradas previstas ocorrerem'

    // Dynamic states mapping based on specified rules
    const getRealizationDetails = (pct: number, prev: number) => {
      if (prev <= 0) {
        return {
          badge: 'SEM DADOS',
          phrase: 'Sem previsão cadastrada.',
          color: 'var(--muted)',
          bg: 'var(--surface-2)',
          barColor: 'var(--line-soft)',
          icon: <Info size={12} />
        }
      }
      if (pct < 30) {
        return {
          badge: 'ABAIXO DO ESPERADO',
          phrase: 'Receita abaixo do previsto.',
          color: 'var(--orange-ink)',
          bg: 'rgba(245,124,0,0.08)',
          barColor: 'var(--orange)',
          icon: <AlertCircle size={12} />
        }
      }
      if (pct >= 30 && pct < 70) {
        return {
          badge: 'ATENÇÃO',
          phrase: 'Receita em evolução, mas ainda exige atenção.',
          color: '#A06E00',
          bg: 'rgba(255,179,0,0.08)',
          barColor: 'var(--gold)',
          icon: <AlertCircle size={12} />
        }
      }
      if (pct >= 70 && pct < 100) {
        return {
          badge: 'EM ANDAMENTO',
          phrase: 'Boa parte da meta já foi recebida.',
          color: 'var(--teal)',
          bg: 'rgba(1,88,76,0.08)',
          barColor: 'var(--teal)',
          icon: <TrendingUp size={12} />
        }
      }
      return {
        badge: 'CONCLUÍDO',
        phrase: 'Meta mensal concluída.',
        color: 'var(--green)',
        bg: 'rgba(40,167,69,0.08)',
        barColor: 'var(--green)',
        icon: <CheckCircle2 size={12} />
      }
    }

    const state = getRealizationDetails(pctRealizacao, totalPrevisto)

    // Ritmo do Mês Message calculations
    const todayYM = new Date().toISOString().slice(0, 7)
    let diasRestantesMsg = ''
    if (selectedMonth < todayYM) {
      diasRestantesMsg = 'Este período já foi encerrado.'
    } else if (selectedMonth > todayYM) {
      diasRestantesMsg = 'Este período ainda não começou.'
    } else {
      if (diasRestantes === 1) {
        diasRestantesMsg = 'Resta apenas 1 dia no mês'
      } else {
        diasRestantesMsg = `Faltam ${diasRestantes} dias no mês`
      }
    }

    let ritmoMsg = ''
    if (totalPrevisto <= 0) {
      ritmoMsg = 'Sem meta ativa configurada.'
    } else if (selectedMonth > todayYM) {
      ritmoMsg = `Você já possui ${diasRestantes} dias planejados para acompanhar a meta.`
    } else if (recebido >= totalPrevisto) {
      ritmoMsg = 'Meta já concluída neste período.'
    } else if (diasRestantes <= 0) {
      ritmoMsg = 'Este período já foi encerrado.'
    } else if (potencialFechamento >= totalPrevisto) {
      ritmoMsg = 'Com as entradas pendentes previstas, a meta ainda é alcançável.'
    } else {
      ritmoMsg = 'No ritmo atual, a meta exige atenção.'
    }

    // Leitura Rápida (Insights)
    const insights = []
    if (pctRealizacao >= 100) {
      insights.push(`Excelente! Meta de recebimento 100% atingida.`)
    } else {
      if (calculatedFaltante > 0) {
        insights.push(`Faltam R$ ${brl(calculatedFaltante)} para concluir a meta de recebimento.`)
      }
      if (atrasado > 0) {
        insights.push(`Atenção: existem R$ ${brl(atrasado)} em faturamento atrasado.`)
      }
    }

    return (
      <div className="drawer-content-section fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, paddingBottom: 48 }}>
          <div className="insight-drawer-header" style={{ marginBottom: 24 }}>
            <div className="insight-drawer-icon" style={{ background: 'var(--orange)', color: 'white', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Percent size={20} />
            </div>
            <div>
              <h3 className="insight-drawer-title">Realização do Mês</h3>
              <p className="insight-drawer-sub">Progresso de recebimento da meta</p>
            </div>
          </div>

          {/* Hero */}
          <div className="drawer-hero-box card shadow-sm" style={{ padding: '24px', marginBottom: 24, background: '#FFF', border: '1px solid rgba(13, 61, 55, 0.06)', borderRadius: 24, color: 'var(--ink)', position: 'relative' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Progresso de recebimento</span>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6, marginBottom: 12 }}>
              <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 44, fontWeight: 900, color: state.color, letterSpacing: '-1.5px', lineHeight: 1 }}>
                {pctDisplayStr}
              </span>
              <span 
                className="tabnums" 
                style={{ 
                  fontSize: 10, 
                  padding: '5px 10px', 
                  borderRadius: 12, 
                  fontWeight: 800, 
                  background: state.bg, 
                  color: state.color,
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  border: `1px solid ${state.color}15`
                }}
              >
                {state.icon}
                {state.badge}
              </span>
            </div>

            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', margin: '0 0 16px 0' }}>
              {state.phrase}
            </p>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: 9, borderRadius: 5, background: 'var(--line-soft)', overflow: 'hidden', marginBottom: 12 }}>
              <div 
                style={{ 
                  width: barWidthStr, 
                  height: '100%',
                  backgroundColor: state.barColor,
                  borderRadius: 5,
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }} 
              />
            </div>
            
            <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--teal-900)' }}>R$ {brl(recebido)}</strong> de <strong style={{ color: 'var(--teal-900)' }}>R$ {brl(totalPrevisto)}</strong> recebidos
            </div>
          </div>

          {/* Grid de Indicadores Principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
            {/* Previsto */}
            <div style={{ background: '#FFF', border: '1px solid rgba(13, 61, 55, 0.05)', borderRadius: 20, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 11.5, fontWeight: 700 }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(1, 88, 76, 0.06)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarClock size={12} />
                </div>
                <span>Previsto</span>
              </div>
              <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 17, fontWeight: 800, color: 'var(--teal-900)', lineHeight: 1.2 }}>R$ {brl(totalPrevisto)}</div>
            </div>
            
            {/* Recebido */}
            <div style={{ background: '#FFF', border: '1px solid rgba(40,167,69,0.05)', borderRadius: 20, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 11.5, fontWeight: 700 }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(40,167,69,0.08)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={12} />
                </div>
                <span>Recebido</span>
              </div>
              <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 17, fontWeight: 800, color: 'var(--green)', lineHeight: 1.2 }}>R$ {brl(recebido)}</div>
            </div>

            {/* Faltante */}
            <div style={{ background: '#FFF', border: '1px solid rgba(245,124,0,0.05)', borderRadius: 20, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 11.5, fontWeight: 700 }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(245,124,0,0.08)', color: 'var(--orange-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={12} />
                </div>
                <span>Faltante</span>
              </div>
              <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 17, fontWeight: 800, color: 'var(--orange-ink)', lineHeight: 1.2 }}>R$ {brl(calculatedFaltante)}</div>
            </div>

            {/* Potencial */}
            <div style={{ background: '#FFF', border: '1px solid rgba(255,179,0,0.05)', borderRadius: 20, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 11.5, fontWeight: 700 }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(255,179,0,0.08)', color: '#A06E00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={12} />
                </div>
                <span>Potencial</span>
              </div>
              <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 17, fontWeight: 800, color: '#9A6A00', lineHeight: 1.2 }}>R$ {brl(potencialFechamento)}</div>
              <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600, marginTop: -2, lineHeight: 1.2 }}>{potencialSubtext}</span>
            </div>
          </div>

          {/* Bloco Ritmo do Mês */}
          <div style={{ background: '#FAF9F5', border: '1px solid rgba(1, 88, 76, 0.05)', borderRadius: 24, padding: 20, marginBottom: 24 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--teal-900)', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ritmo do mês</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--orange)' }} />
                <span>{diasRestantesMsg}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink)', fontWeight: 600, lineHeight: 1.4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--teal)', marginTop: 7 }} />
                <div>
                  <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 16, fontWeight: 800, color: 'var(--teal-900)' }}>R$ {brl(mediaDiariaNecessaria)}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginLeft: 6 }}>por dia para atingir a meta</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--muted)', fontWeight: 500, background: 'white', padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.03)', marginTop: 4 }}>
                <Sparkles size={14} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
                <span>{ritmoMsg}</span>
              </div>
            </div>
          </div>

          {/* Próximas Entradas */}
          {upcoming.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <h4 className="drawer-section-title">Próximas entradas</h4>
              <div className="upcoming-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map((inc: any) => {
                  const isLate = inc.date < today
                  const catColor = categories?.find((c:any) => c.name === inc.category)?.color || '#90A4AE'
                  return (
                    <div key={inc.id} className="upcoming-item">
                      <div className="upcoming-icon" style={{ background: catColor + '15', color: catColor }}>
                        <Wallet size={14} />
                      </div>
                      <div className="upcoming-info">
                        <div className="upcoming-name">{inc.description || inc.category}</div>
                        <div className="upcoming-sub">
                          <span>{inc.date.split('-').reverse().slice(0,2).join('/')}</span>
                          <span style={{ color: 'var(--line-strong)' }}>•</span>
                          <span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(Number(inc.amount))}</span>
                          <span style={{ color: 'var(--line-strong)' }}>•</span>
                          <span style={{ color: isLate ? 'var(--neg)' : 'var(--orange-ink)', fontWeight: 700 }}>
                            {isLate ? 'Atrasada' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                      <div className="upcoming-actions">
                        <button className="upcoming-btn check-btn" onClick={() => onToggle && onToggle(inc)} title="Marcar como recebida">
                          <CheckCircle2 size={14} />
                        </button>
                        <button className="upcoming-btn edit-btn" onClick={() => onEdit && onEdit(inc)} title="Editar">
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
             <div style={{ marginBottom: 24 }}>
                <h4 className="drawer-section-title">Próximas entradas</h4>
                <div className="upcoming-empty">Nenhuma entrada pendente neste período.</div>
             </div>
          )}

          {/* Insights do Mês */}
          {insights.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h4 className="drawer-section-title">Insights do mês</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.map((ins, idx) => (
                  <div key={idx} className="insight-pill" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: '#FFF', borderRadius: 12, border: '1px solid rgba(0,0,0,0.03)', fontSize: 12.5, color: 'var(--ink)', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
                    <Sparkles size={14} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontWeight: 600 }}>{ins}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações Rápidas */}
          <div style={{ marginBottom: 24 }}>
            <h4 className="drawer-section-title">Ações rápidas</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {onAdd && (
                <button 
                  onClick={onAdd}
                  className="ai-chip-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: '1.5px solid var(--teal)', background: 'transparent', color: 'var(--teal)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Wallet size={14} /> Novo recebimento
                </button>
              )}
              {onViewAll && (
                <button 
                  onClick={onViewAll}
                  className="ai-chip-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: '1.5px solid var(--line-strong)', background: 'transparent', color: 'var(--ink)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <ArrowRight size={14} /> Ver lançamentos
                </button>
              )}
              <button 
                onClick={() => {
                  if (onAsk) {
                    onAsk("Quero uma análise detalhada sobre a realização da minha receita deste mês e como garantir que eu atinja a meta.")
                    onClose()
                  } else {
                    alert("Análise com IA em breve.")
                  }
                }}
                className="ai-chip-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: '1.5px solid var(--orange)', background: 'transparent', color: 'var(--orange-ink)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <Sparkles size={14} /> Analisar com IA
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderHealthDetails = () => {
    if (!data.health) return null
    const { saudeMetrics, hidden } = data.health

    const HEALTH_SCORE_RADIUS = 50
    const circumference = 2 * Math.PI * HEALTH_SCORE_RADIUS
    const angle = saudeMetrics.score * 3.6
    const angleRad = (angle * Math.PI) / 180
    const dotX = 60 + HEALTH_SCORE_RADIUS * Math.cos(angleRad)
    const dotY = 60 + HEALTH_SCORE_RADIUS * Math.sin(angleRad)
    const strokeColor = getStatusColor(saudeMetrics.status)

    return (
      <div className="drawer-content-section fade-up">
        <div className="insight-drawer-header">
          <div className="insight-drawer-icon" style={{ background: 'var(--ink)', color: 'white' }}>
            <HeartPulse size={24} />
          </div>
          <div>
            <h3 className="insight-drawer-title">Saúde da Receita</h3>
            <p className="insight-drawer-sub">Análise avançada de qualidade e previsibilidade</p>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="premium-health-score-container" style={{ width: 120, height: 120, position: 'relative' }}>
              <svg viewBox="0 0 120 120" className="premium-health-score-svg" style={{ width: 120, height: 120 }}>
                <circle cx="60" cy="60" r={HEALTH_SCORE_RADIUS} className="premium-health-score-bg-circle" />
                <circle 
                  cx="60" 
                  cy="60" 
                  r={HEALTH_SCORE_RADIUS} 
                  className="premium-health-score-fill-circle" 
                  style={{ 
                    stroke: strokeColor,
                    strokeDasharray: `${circumference}`, 
                    strokeDashoffset: `${circumference * (1 - saudeMetrics.score / 100)}`,
                    strokeWidth: 8
                  }} 
                />
                {saudeMetrics.score > 0 && (
                  <circle cx={dotX} cy={dotY} r="5" fill="#FCFAF7" stroke={strokeColor} strokeWidth="2.5" />
                )}
              </svg>
              <div className="premium-health-score-value-wrapper" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className={`premium-health-score-value tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 36, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{saudeMetrics.score}</span>
                <span className="premium-health-score-total" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>/100</span>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span className={`premium-health-badge ${getBadgeClass(saudeMetrics.status)}`} style={{ fontSize: 13, padding: '4px 10px', marginBottom: 8, display: 'inline-flex' }}>
                <ShieldCheck size={14} style={{ marginRight: 6 }} />
                {saudeMetrics.label}
              </span>
              <p className="premium-health-desc" style={{ fontSize: 14, maxWidth: 280, margin: '0 auto', color: 'var(--muted)', lineHeight: 1.4 }}>
                {saudeMetrics.description}
              </p>
            </div>
          </div>

          <div style={{ width: '100%', height: 1, background: 'var(--line-soft)' }} />

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: 0.5 }}>Microindicadores</h4>
            
            <div className="health-indicator-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="health-indicator-item" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: saudeMetrics.indicators.delays.level === 'good' ? 'var(--green)' : saudeMetrics.indicators.delays.level === 'medium' ? 'var(--orange)' : 'var(--neg)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Atrasos</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {saudeMetrics.indicators.delays.level === 'good' ? 'Poucos ou nenhum atraso.' : 
                     saudeMetrics.indicators.delays.level === 'medium' ? 'Atrasos moderados.' : 'Alto índice de atrasos.'}
                  </div>
                </div>
              </div>

              <div className="health-indicator-item" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: saudeMetrics.indicators.predictability.level === 'good' ? 'var(--green)' : saudeMetrics.indicators.predictability.level === 'medium' ? 'var(--orange)' : 'var(--neg)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Previsibilidade</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {saudeMetrics.indicators.predictability.level === 'good' ? 'Alta proporção de receita fixa.' : 
                     saudeMetrics.indicators.predictability.level === 'medium' ? 'Previsibilidade moderada.' : 'Baixa proporção de receita fixa.'}
                  </div>
                </div>
              </div>

              <div className="health-indicator-item" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: saudeMetrics.indicators.diversification.level === 'good' ? 'var(--green)' : saudeMetrics.indicators.diversification.level === 'medium' ? 'var(--orange)' : 'var(--neg)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Diversificação</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {saudeMetrics.indicators.diversification.level === 'good' ? 'Receita bem distribuída.' : 
                     saudeMetrics.indicators.diversification.level === 'medium' ? 'Concentração moderada.' : 'Alta dependência de poucas fontes.'}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    )
  }

  const drawerContent = (
    <div className={`drawer-overlay ${isVisible ? 'open' : ''}`} onClick={onClose} style={{ zIndex: 999999 }}>
      <div className={`insight-drawer ${isVisible ? 'open' : ''} ${isAtTop ? 'at-top' : ''} ${isAtBottom ? 'at-bottom' : ''}`} onClick={e => e.stopPropagation()}>
        <button 
          className="drawer-close-btn" 
          onClick={onClose}
          aria-label="Fechar detalhes"
        >
          <X size={20} />
        </button>

        <div ref={scrollContainerRef} onScroll={handleScroll} className="drawer-body hide-scrollbar" style={{ padding: 0, height: '100%', overflowY: 'auto' }}>
          {type === 'period' && renderPeriodDetails()}
          {type === 'realization' && renderRealizationDetails()}
          {type === 'health' && renderHealthDetails()}
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(drawerContent, document.body)
  }

  return drawerContent
}
