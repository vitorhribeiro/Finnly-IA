'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  TrendingUp, TrendingDown, Wallet,
  AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react'
import type { DashboardData } from '@/types/database'

interface RelatoriosSectionProps {
  dashboardData: DashboardData
  hidden: boolean
}

export function RelatoriosSection({ dashboardData, hidden }: RelatoriosSectionProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'evolution'>('overview')
  const [selectedPeriod, setSelectedPeriod] = useState<'3' | '6' | '12'>('6')
  const [historicalData, setHistoricalData] = useState<{ month: string; income: number; expense: number }[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const brl = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Buscar histórico de transações reais para os últimos meses
  useEffect(() => {
    async function fetchHistory() {
      setLoadingHistory(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoadingHistory(false)
        return
      }

      try {
        // Obter todas as receitas e despesas
        const [incRes, expRes] = await Promise.all([
          supabase.from('incomes').select('amount, date').eq('user_id', user.id).eq('payment_status', true),
          supabase.from('expenses').select('amount, date').eq('user_id', user.id).eq('payment_status', true)
        ])

        if (incRes.error) throw incRes.error
        if (expRes.error) throw expRes.error

        const incomes = incRes.data || []
        const expenses = expRes.data || []

        // Agrupar por ano-mês
        const monthlyMap: Record<string, { income: number; expense: number }> = {}

        // Inicializar últimos N meses no mapa para garantir ordem cronológica
        const now = new Date()
        const count = parseInt(selectedPeriod)
        for (let i = count - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          monthlyMap[ym] = { income: 0, expense: 0 }
        }

        incomes.forEach(inc => {
          if (!inc.date) return
          const ym = inc.date.slice(0, 7) // yyyy-mm
          if (monthlyMap[ym] !== undefined) {
            monthlyMap[ym].income += Number(inc.amount)
          }
        });

        expenses.forEach(exp => {
          if (!exp.date) return
          const ym = exp.date.slice(0, 7) // yyyy-mm
          if (monthlyMap[ym] !== undefined) {
            monthlyMap[ym].expense += Number(exp.amount)
          }
        });

        const formatted = Object.entries(monthlyMap).map(([ym, vals]) => {
          const [year, month] = ym.split('-')
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
          const monthLabel = monthNames[parseInt(month) - 1]
          return {
            month: `${monthLabel}/${year.slice(2)}`,
            income: vals.income,
            expense: vals.expense
          }
        })

        setHistoricalData(formatted)
      } catch (err) {
        console.error('Erro ao buscar histórico de relatórios:', err)
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchHistory()
  }, [selectedPeriod, supabase])

  const incomeVal = dashboardData.monthlyIncome
  const expenseVal = dashboardData.monthlyExpenses
  const netSavings = incomeVal - expenseVal
  const savingsRate = incomeVal > 0 ? Math.round((netSavings / incomeVal) * 100) : 0

  // Cores de categorias padrão se vazias
  const getCatColor = (name: string) => {
    const map: Record<string, string> = {
      'Alimentação': '#F57C00',
      'Transporte': '#FFB300',
      'Moradia': '#01584C',
      'Saúde': '#28A745',
      'Lazer': '#7B1FA2',
      'Assinaturas': '#455A64',
      'Cartões': '#B9842F',
    }
    return map[name] || '#90A4AE'
  }

  // Gráfico de Barras SVGs Dinâmicos
  const maxVal = Math.max(...historicalData.map(d => Math.max(d.income, d.expense)), 1000)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>

        {/* CONTROLES DE ABAS */}
        <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '6px 16px', fontSize: 12.5, fontWeight: 800, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === 'overview' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'overview' ? 'var(--primary)' : 'var(--muted)',
              boxShadow: activeTab === 'overview' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            style={{
              padding: '6px 16px', fontSize: 12.5, fontWeight: 800, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === 'categories' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'categories' ? 'var(--primary)' : 'var(--muted)',
              boxShadow: activeTab === 'categories' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Categorias
          </button>
          <button
            onClick={() => setActiveTab('evolution')}
            style={{
              padding: '6px 16px', fontSize: 12.5, fontWeight: 800, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === 'evolution' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'evolution' ? 'var(--primary)' : 'var(--muted)',
              boxShadow: activeTab === 'evolution' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Evolução
          </button>
        </div>
      </div>

      {/* 1. VISÃO GERAL */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* KPI CARDS */}
          <div className="fd-grid">
            <div className="col-4 col-sm-12">
              <div className="card" style={{ padding: 20, borderLeft: '4px solid #28A745', display: 'flex', gap: 14 }}>
                <div style={{ background: 'rgba(40,167,69,0.1)', color: '#28A745', width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Receitas deste Mês</span>
                  <h3 style={{ fontSize: 22, fontWeight: 900, margin: '4px 0 0', color: 'var(--teal-900)' }} className={`tabnums${hidden ? ' priv' : ''}`}>
                    R$ {brl(incomeVal)}
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-4 col-sm-12">
              <div className="card" style={{ padding: 20, borderLeft: '4px solid #F57C00', display: 'flex', gap: 14 }}>
                <div style={{ background: 'rgba(245,124,0,0.1)', color: '#F57C00', width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingDown size={20} />
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Despesas deste Mês</span>
                  <h3 style={{ fontSize: 22, fontWeight: 900, margin: '4px 0 0', color: 'var(--teal-900)' }} className={`tabnums${hidden ? ' priv' : ''}`}>
                    R$ {brl(expenseVal)}
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-4 col-sm-12">
              <div className="card" style={{ padding: 20, borderLeft: `4px solid ${netSavings >= 0 ? '#016B4C' : '#ef4444'}`, display: 'flex', gap: 14 }}>
                <div style={{ background: netSavings >= 0 ? 'rgba(1,107,76,0.1)' : 'rgba(239,68,68,0.1)', color: netSavings >= 0 ? '#016B4C' : '#ef4444', width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Wallet size={20} />
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Resultado Financeiro</span>
                  <h3 style={{ fontSize: 22, fontWeight: 900, margin: '4px 0 0', color: netSavings >= 0 ? '#016B4C' : '#ef4444' }} className={`tabnums${hidden ? ' priv' : ''}`}>
                    {netSavings >= 0 ? '+' : ''} R$ {brl(netSavings)}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div className="fd-grid">
            {/* SAVINGS RATE CIRCLE */}
            <div className="col-5 col-sm-12">
              <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, alignSelf: 'flex-start' }}>Taxa de Economia</h4>
                
                {/* SVG CIRCLE */}
                <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                    <circle cx="70" cy="70" r="58" stroke="var(--line-soft)" strokeWidth="12" fill="transparent" />
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      stroke={savingsRate >= 20 ? 'var(--primary)' : savingsRate > 0 ? '#FFB300' : '#ef4444'}
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 - (364.4 * Math.max(0, Math.min(savingsRate, 100))) / 100}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--teal-900)' }}>{savingsRate}%</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>salvo</span>
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  {savingsRate >= 20 ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#28A745', fontSize: 12.5, fontWeight: 700 }}>
                      <CheckCircle2 size={16} /> Excelente! Acima da meta recomendada (20%)
                    </div>
                  ) : savingsRate > 0 ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#FFB300', fontSize: 12.5, fontWeight: 700 }}>
                      <AlertCircle size={16} /> Bom, mas tente atingir a meta de 20%
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#ef4444', fontSize: 12.5, fontWeight: 700 }}>
                      <AlertCircle size={16} /> Cuidado: Seu balanço está negativo
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* QUICK CATEGORY HIGHLIGHT */}
            <div className="col-7 col-sm-12">
              <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', minHeight: 280 }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800 }}>Distribuição de Gastos</h4>
                {dashboardData.categories.length === 0 ? (
                  <p style={{ margin: 'auto', fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Nenhuma despesa registrada para detalhar.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
                    {dashboardData.categories.slice(0, 4).map(cat => {
                      const color = getCatColor(cat.name)
                      return (
                        <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                            <span style={{ color: 'var(--teal-900)' }}>{cat.name}</span>
                            <span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(cat.amount)} ({Math.round(cat.percentage)}%)</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--line-soft)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: color, width: `${cat.percentage}%`, borderRadius: 3 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI FINANCIAL INSIGHTS */}
          {dashboardData.futureBalanceInsight && (
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(1, 107, 76, 0.05), rgba(245, 124, 0, 0.03))',
              border: '1px solid rgba(1, 107, 76, 0.15)',
              padding: '20px 24px',
              borderRadius: 18,
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start'
            }}>
              <div style={{ background: 'var(--primary)', color: '#fff', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Sparkles size={16} />
              </div>
              <div>
                <h5 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 900, color: 'var(--teal-900)' }}>Sugestão da Assistente Finnly</h5>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                  {dashboardData.futureBalanceInsight}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CATEGORIAS */}
      {activeTab === 'categories' && (
        <div className="card" style={{ padding: 24 }}>
          <h4 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 800 }}>Ranking de Categorias do Mês</h4>
          {dashboardData.categories.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>Nenhuma despesa lançada neste mês.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {dashboardData.categories.map((cat, idx) => {
                const color = getCatColor(cat.name)
                return (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--muted)', width: 20 }}>#{idx + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                        <span style={{ color: 'var(--teal-900)' }}>{cat.name}</span>
                        <span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(cat.amount)} ({Math.round(cat.percentage)}%)</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--line-soft)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: color, width: `${cat.percentage}%`, borderRadius: 4 }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. EVOLUÇÃO PATRIMONIAL */}
      {activeTab === 'evolution' && (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Evolução de Fluxo de Caixa</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>Período:</span>
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value as '3' | '6' | '12')}
                style={{ fontSize: 12, padding: '3px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 700 }}
              >
                <option value="3">Últimos 3 meses</option>
                <option value="6">Últimos 6 meses</option>
                <option value="12">Últimos 12 meses</option>
              </select>
            </div>
          </div>

          {loadingHistory ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Carregando dados históricos...</p>
            </div>
          ) : historicalData.length === 0 ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Nenhum histórico disponível para exibir.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* SVG HISTORICAL BAR CHART */}
              <div style={{ width: '100%', overflowX: 'auto', paddingBottom: 8 }}>
                <div style={{ minWidth: 480, height: 240, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '10px 10px 30px 10px', borderBottom: '1px solid var(--line)' }}>
                  
                  {historicalData.map((d, index) => {
                    const incHeight = maxVal > 0 ? (d.income / maxVal) * 160 : 0
                    const expHeight = maxVal > 0 ? (d.expense / maxVal) * 160 : 0

                    return (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160 }}>
                          
                          {/* Barra de Receita */}
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="group">
                            {d.income > 0 && (
                              <div style={{
                                position: 'absolute', top: -20, background: 'var(--teal-900)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 4px', borderRadius: 4, display: 'none', pointerEvents: 'none'
                              }} className="group-hover:block">
                                R${Math.round(d.income)}
                              </div>
                            )}
                            <div style={{
                              width: 14, height: Math.max(incHeight, 3), background: 'linear-gradient(180deg, #28A745, rgba(40,167,69,0.3))', borderRadius: '4px 4px 0 0', cursor: 'pointer', transition: 'all 0.3s'
                            }} />
                          </div>

                          {/* Barra de Despesa */}
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="group">
                            {d.expense > 0 && (
                              <div style={{
                                position: 'absolute', top: -20, background: 'var(--teal-900)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 4px', borderRadius: 4, display: 'none', pointerEvents: 'none'
                              }} className="group-hover:block">
                                R${Math.round(d.expense)}
                              </div>
                            )}
                            <div style={{
                              width: 14, height: Math.max(expHeight, 3), background: 'linear-gradient(180deg, #F57C00, rgba(245,124,0,0.3))', borderRadius: '4px 4px 0 0', cursor: 'pointer', transition: 'all 0.3s'
                            }} />
                          </div>

                        </div>
                        {/* Label de Mês */}
                        <span style={{ position: 'absolute', bottom: 8, fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>{d.month}</span>
                      </div>
                    )
                  })}

                </div>
              </div>

              {/* CHART LEGENDS */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#28A745' }} />
                  <span>Receitas</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#F57C00' }} />
                  <span>Despesas</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
