'use client'

import { useEffect, useState, useTransition, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, X, Pencil, Trash2, TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronLeft, ChevronRight,
  Calendar, Sparkles, ArrowDown, Search, RefreshCw, CheckCircle2,
  Wallet, Banknote, CreditCard,
  Laptop, Briefcase, PenTool,
  Percent, Trophy, BarChart,
  Coins, PiggyBank,
  Receipt, ArrowLeftRight,
  Home, Building,
  ShoppingBag, Store,
  Gift, Star,
  CircleDollarSign,
  CalendarClock,
} from 'lucide-react'
import { Donut } from '../Charts'
import { InfoTooltip } from '../InfoTooltip'
import { addIncome, updateIncome, deleteIncome, getIncomesForModule } from '@/app/dashboard/actions/incomes'
import { getIncomeCategories, createIncomeCategory } from '@/app/dashboard/actions/income-categories'
import type { Income, IncomeCategory } from '@/types/database'

// ============================================================ ICON MAP

const ICON_MAP: Record<string, React.ElementType> = {
  Wallet, Banknote, CreditCard,
  Laptop, Briefcase, PenTool,
  Percent, Trophy, BarChart,
  Coins, TrendingUp, PiggyBank,
  Receipt, ArrowLeftRight,
  Home, Building,
  ShoppingBag, Store,
  Gift, Star,
  Sparkles, CircleDollarSign,
  TrendingDown, AlertCircle, Calendar,
  CalendarClock,
}

const ICON_PICKER_GROUPS = [
  { label: 'Salário', icons: ['Wallet', 'Banknote', 'CreditCard'] },
  { label: 'Freelance', icons: ['Laptop', 'Briefcase', 'PenTool'] },
  { label: 'Comissão', icons: ['Percent', 'Trophy', 'BarChart'] },
  { label: 'Dividendos', icons: ['Coins', 'TrendingUp', 'PiggyBank'] },
  { label: 'Reembolso', icons: ['Receipt', 'ArrowLeftRight'] },
  { label: 'Aluguel', icons: ['Home', 'Building'] },
  { label: 'Vendas', icons: ['ShoppingBag', 'Store'] },
  { label: 'Presente', icons: ['Gift', 'Star'] },
  { label: 'Outros', icons: ['Sparkles', 'CircleDollarSign'] },
]

const COLOR_OPTIONS = [
  '#01584C', '#0288D1', '#F57C00', '#FFB300',
  '#28A745', '#7B1FA2', '#E91E63', '#FF5722',
  '#90A4AE', '#455A64', '#00838F', '#EF6C00',
]

// ============================================================ HELPERS

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function processCategories(cats: IncomeCategory[]): IncomeCategory[] {
  const filtered = cats.filter(c => c.name !== 'Aluguel Recebido')
  if (!filtered.some(c => c.name.toLowerCase() === 'pix')) {
    filtered.push({
      id: 'default-pix',
      name: 'Pix',
      color: '#00838F',
      icon: 'Wallet',
      is_default: true,
      user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
  return filtered
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function currentMonthYM() {
  return localToday().slice(0, 7)
}

function prevMonthYM(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return d.toISOString().slice(0, 7)
}

function getMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getShortMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

function getMonthOptions(): { value: string; label: string }[] {
  const options = []
  const now = new Date()
  for (let i = -12; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const ym = d.toISOString().slice(0, 7)
    const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    options.push({ value: ym, label: s.charAt(0).toUpperCase() + s.slice(1) })
  }
  return options
}

// ============================================================ DYNAMIC ICON

function DynIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Sparkles
  return <Icon size={size} />
}

// ============================================================ INSIGHTS

interface Insight {
  iconName: string
  color: string
  tintClass: string
  tag: string
  body: string
}

import { PremiumIncomeModal } from './PremiumIncomeModal'

function buildInsights(
  currentIncomes: Income[],
  prevIncomes: Income[],
  categories: IncomeCategory[]
): Insight[] {
  const insights: Insight[] = []
  const currentTotal = currentIncomes.reduce((s, i) => s + Number(i.amount), 0)
  const prevTotal = prevIncomes.reduce((s, i) => s + Number(i.amount), 0)

  if (prevTotal > 0 && currentTotal > 0) {
    const diff = currentTotal - prevTotal
    const pct = Math.round(Math.abs(diff / prevTotal) * 100)
    if (diff > 0) {
      insights.push({
        iconName: 'TrendingUp', color: '#28A745', tintClass: 't-green',
        tag: 'Crescimento',
        body: `Você recebeu <b>R$ ${brl(diff)} a mais</b> que no mês passado <b>(+${pct}%)</b>.`,
      })
    } else if (diff < 0) {
      insights.push({
        iconName: 'TrendingDown', color: '#F57C00', tintClass: 't-orange',
        tag: 'Queda',
        body: `Sua renda <b>diminuiu R$ ${brl(Math.abs(diff))}</b> em relação ao mês anterior <b>(-${pct}%)</b>.`,
      })
    }
  }

  const catMap: Record<string, number> = {}
  currentIncomes.forEach(i => { catMap[i.category] = (catMap[i.category] ?? 0) + Number(i.amount) })
  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1])

  if (sorted.length > 0 && currentTotal > 0) {
    const [topName, topAmt] = sorted[0]
    const pct = Math.round((topAmt / currentTotal) * 100)
    const cat = categories.find(c => c.name === topName)
    insights.push({
      iconName: cat?.icon ?? 'Wallet', color: cat?.color ?? '#01584C', tintClass: 't-teal',
      tag: 'Principal fonte',
      body: `Sua principal fonte de renda é <b>${topName}</b>, representando <b>${pct}%</b> da renda do mês.`,
    })
  }

  if (sorted.length === 1 && currentTotal > 0) {
    insights.push({
      iconName: 'AlertCircle', color: '#F57C00', tintClass: 't-orange',
      tag: 'Concentração',
      body: `Sua renda está <b>concentrada em uma única fonte</b>. Considere criar uma renda complementar.`,
    })
  } else if (sorted.length >= 3) {
    insights.push({
      iconName: 'Sparkles', color: '#0288D1', tintClass: 't-teal',
      tag: 'Diversidade',
      body: `Você recebeu receita de <b>${sorted.length} fontes diferentes</b> este mês. Ótima diversificação!`,
    })
  }

  if (currentTotal > 0) {
    insights.push({
      iconName: 'Calendar', color: '#FFB300', tintClass: 't-gold',
      tag: 'Projeção anual',
      body: `Mantendo esse ritmo, sua <b>renda anual projetada</b> será de <b>R$ ${brl(currentTotal * 12)}</b>.`,
    })
  }

  const variableTotal = Object.entries(catMap)
    .filter(([cat]) => ['Freelance', 'Comissão', 'Vendas'].includes(cat))
    .reduce((s, [, v]) => s + v, 0)
  if (variableTotal > 0 && currentTotal > 0) {
    const pct = Math.round((variableTotal / currentTotal) * 100)
    insights.push({
      iconName: 'Percent', color: '#0288D1', tintClass: 't-teal',
      tag: 'Renda variável',
      body: `Freelance, comissão e vendas representam <b>${pct}% da sua renda</b> neste mês.`,
    })
  }

  return insights.slice(0, 4)
}

// ============================================================ TREND CHART

interface TrendMonth {
  ym: string
  label: string
  total: number
  isCurrent: boolean
}

function TrendChart({
  allIncomes,
  selectedMonth,
  hidden,
}: {
  allIncomes: Income[]
  selectedMonth: string
  hidden: boolean
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  const months: TrendMonth[] = useMemo(() => {
    const result: TrendMonth[] = []
    const [y, m] = selectedMonth.split('-').map(Number)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1)
      const ym = d.toISOString().slice(0, 7)
      const total = allIncomes
        .filter(inc => inc.date.slice(0, 7) === ym)
        .reduce((s, inc) => s + Number(inc.amount), 0)
      result.push({ ym, label: getShortMonthLabel(ym), total, isCurrent: ym === selectedMonth })
    }
    return result
  }, [allIncomes, selectedMonth])

  const maxVal = Math.max(...months.map(m => m.total), 1)
  const MAX_H = 110

  const totalReceived = months.reduce((s, m) => s + m.total, 0)
  const activeMonths = months.filter(m => m.total > 0).length
  const trend = (() => {
    const withData = months.filter(m => m.total > 0)
    if (withData.length < 2) return null
    const first = withData[0].total
    const last = withData[withData.length - 1].total
    return Math.round(((last - first) / first) * 100)
  })()

  return (
    <section className="card fade-up" style={{ animationDelay: '40ms' }}>
      <div className="card-head">
        <div className="card-title">
          <span className="ti t-teal"><TrendingUp size={17} /></span>
          Evolução dos últimos 6 meses
        </div>
        {trend !== null && (
          <span
            className={`delta ${trend >= 0 ? 'up' : 'down-bad'}`}
            style={{ fontSize: 12 }}
          >
            {trend >= 0 ? '+' : ''}{trend}% no período
          </span>
        )}
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: MAX_H, padding: '0 4px' }}>
        {months.map((m) => {
          const barH = maxVal > 0 ? Math.max(4, Math.round((m.total / maxVal) * MAX_H)) : 4
          const isEmpty = m.total === 0
          return (
            <div
              key={m.ym}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4,
              }}
            >
              {!isEmpty && (
                <span style={{
                  fontSize: 10, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap',
                  color: m.isCurrent ? 'var(--orange-ink)' : 'var(--muted)',
                }}>
                  {hidden ? '···' : (m.total >= 1000
                    ? `${(m.total / 1000).toFixed(m.total >= 10000 ? 0 : 1)}k`
                    : brl(m.total))}
                </span>
              )}
              <div style={{
                width: '100%', maxWidth: 44,
                height: ready ? barH : 0,
                borderRadius: '8px 8px 3px 3px',
                background: m.isCurrent
                  ? 'linear-gradient(180deg, #F59313, var(--orange))'
                  : (isEmpty ? 'var(--line)' : 'var(--teal)'),
                opacity: isEmpty ? 0.35 : (m.isCurrent ? 1 : 0.6),
                transition: 'height .9s cubic-bezier(.2,.8,.2,1)',
                boxShadow: m.isCurrent ? '0 6px 18px -8px rgba(245,124,0,.7)' : 'none',
              }} />
            </div>
          )
        })}
      </div>

      {/* Month labels */}
      <div style={{
        display: 'flex', gap: 10, marginTop: 10, paddingTop: 10,
        borderTop: '1px solid var(--line-soft)',
      }}>
        {months.map(m => (
          <div
            key={m.ym}
            style={{
              flex: 1, textAlign: 'center',
              fontSize: 11, fontWeight: m.isCurrent ? 800 : 600,
              color: m.isCurrent ? 'var(--orange-ink)' : 'var(--faint)',
              textTransform: 'capitalize',
            }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Summary row */}
      {activeMonths > 0 && (
        <div style={{
          display: 'flex', gap: 20, marginTop: 14, paddingTop: 14,
          borderTop: '1px solid var(--line-soft)', flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Total no período
            </div>
            <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
              R$ {brl(totalReceived)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Meses com receita
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
              {activeMonths} de 6
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Média do período
            </div>
            <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
              R$ {brl(activeMonths > 0 ? totalReceived / activeMonths : 0)}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ============================================================ RECURRING PANEL

interface RecurringTemplate {
  category: string
  lastAmount: number
  icon: string
  color: string
  registered: boolean
}

function RecurringPanel({
  allIncomes,
  selectedMonth,
  categories,
  hidden,
  onLaunch,
}: {
  allIncomes: Income[]
  selectedMonth: string
  categories: IncomeCategory[]
  hidden: boolean
  onLaunch: (template: RecurringTemplate) => void
}) {
  const templates: RecurringTemplate[] = useMemo(() => {
    // Collect unique categories from all is_recurring incomes (any month)
    const seen = new Map<string, { lastAmount: number; lastDate: string }>()
    allIncomes
      .filter(i => i.is_recurring)
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(i => {
        if (!seen.has(i.category)) {
          seen.set(i.category, { lastAmount: Number(i.amount), lastDate: i.date })
        }
      })

    // Check which are registered in selectedMonth
    const registeredCats = new Set(
      allIncomes
        .filter(i => i.is_recurring && i.date.slice(0, 7) === selectedMonth)
        .map(i => i.category)
    )

    return Array.from(seen.entries()).map(([category, { lastAmount }]) => {
      const cat = categories.find(c => c.name === category)
      return {
        category,
        lastAmount,
        icon: cat?.icon ?? 'Sparkles',
        color: cat?.color ?? '#90A4AE',
        registered: registeredCats.has(category),
      }
    })
  }, [allIncomes, selectedMonth, categories])

  if (templates.length === 0) return null

  const pending = templates.filter(t => !t.registered).length

  return (
    <section className="card fade-up" style={{ animationDelay: '100ms' }}>
      <div className="card-head" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ fontSize: 14.5 }}>
          <span className="ti" style={{ background: 'rgba(1,88,76,.1)', color: 'var(--teal)' }}>
            <RefreshCw size={15} />
          </span>
          Recorrentes
        </div>
        {pending > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 800, background: 'rgba(245,124,0,.12)',
            color: 'var(--orange-ink)', padding: '3px 9px', borderRadius: 20,
          }}>
            {pending} pendente{pending > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {templates.map((t, i) => (
          <div
            key={t.category}
            style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '10px 0',
              borderTop: i > 0 ? '1px solid var(--line-soft)' : 'none',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 11, flexShrink: 0,
              background: t.color + '22', color: t.color,
              display: 'grid', placeItems: 'center',
            }}>
              <DynIcon name={t.icon} size={17} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.category}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 600 }}>
                ref. <span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(t.lastAmount)}</span>
              </div>
            </div>
            {t.registered ? (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 800, color: 'var(--green)',
                background: 'rgba(40,167,69,.1)', padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap',
              }}>
                <CheckCircle2 size={12} /> Registrado
              </span>
            ) : (
              <button
                className="btn-primary"
                style={{
                  padding: '5px 12px', fontSize: 12, borderRadius: 20,
                  background: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 5,
                }}
                onClick={() => onLaunch(t)}
              >
                <Plus size={12} /> Lançar
              </button>
            )}
          </div>
        ))}
      </div>

      {pending === 0 && templates.length > 0 && (
        <div style={{
          marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-soft)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12.5, fontWeight: 700, color: 'var(--green)',
        }}>
          <CheckCircle2 size={15} />
          Todas registradas em {getShortMonthLabel(selectedMonth)}
        </div>
      )}
    </section>
  )
}

// ============================================================ NEW CATEGORY MODAL

interface NewCategoryModalProps {
  onClose: () => void
  onSave: (category: IncomeCategory) => void
}

function NewCategoryModal({ onClose, onSave }: NewCategoryModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      const openModals = document.querySelectorAll('.modal-scrim')
      if (openModals.length <= 1) {
        document.body.style.overflow = ''
      }
    }
  }, [])

  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [icon, setIcon] = useState('Wallet')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!name.trim()) { setError('Informe um nome para a categoria'); return }
    const fd = new FormData()
    fd.set('name', name.trim())
    fd.set('color', color)
    fd.set('icon', icon)
    setError('')
    startTransition(async () => {
      const res = await createIncomeCategory(fd)
      if ('error' in res) { setError(res.error ?? 'Erro desconhecido'); return }
      onSave(res.category as IncomeCategory)
    })
  }

  return createPortal(
    <>
      <div className="modal-scrim" onClick={onClose} style={{ zIndex: 110 }} />
      <div className="modal-box" style={{ zIndex: 111, maxWidth: 480 }}>
        <div className="modal-head">
          <h3>Nova categoria</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="entry-form">
          <label>
            <span>Nome <span className="req">*</span></span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Royalties, Bônus…"
              autoFocus
            />
          </label>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>Cor</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${c === color ? ' selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>Ícone</div>
            <div className="icon-picker-grid">
              {Array.from(new Set(ICON_PICKER_GROUPS.flatMap(g => g.icons))).map(ic => (
                <button
                  key={ic}
                  type="button"
                  className={`icon-btn-pick${ic === icon ? ' selected' : ''}`}
                  onClick={() => setIcon(ic)}
                  title={ic}
                  style={ic === icon ? { background: color + '22', borderColor: color, color } : {}}
                >
                  <DynIcon name={ic} size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{
            background: 'var(--surface-2)', borderRadius: 'var(--r-sm)',
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
            border: '2px solid var(--line)',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: color + '22', color, display: 'grid', placeItems: 'center',
            }}>
              <DynIcon name={icon} size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{name || 'Nome da categoria'}</div>
              <div style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 600 }}>Pré-visualização</div>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={isPending}>
              {isPending ? 'Salvando…' : 'Criar categoria'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// ============================================================ CUSTOM SELECT

function CustomCategorySelect({
  value,
  onChange,
  categories,
  onRequestNewCategory,
}: {
  value: string
  onChange: (val: string) => void
  categories: IncomeCategory[]
  onRequestNewCategory: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  const selectedCat = categories.find(c => c.name === value)

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="custom-select-wrap" style={{ position: 'relative' }}>
      <button
        type="button"
        ref={triggerRef}
        className="custom-select-trigger"
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 10,
          padding: '10px 14px',
          color: '#fff',
          cursor: 'pointer',
          textAlign: 'left',
          minHeight: 44,
          transition: 'border-color .15s, box-shadow .15s',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedCat && (
            <span style={{
              width: 26, height: 26, borderRadius: 7,
              background: selectedCat.color + '22', color: selectedCat.color,
              display: 'grid', placeItems: 'center', flexShrink: 0
            }}>
              <DynIcon name={selectedCat.icon} size={13} />
            </span>
          )}
          <span style={{ fontWeight: 600, fontSize: 14.5 }}>{selectedCat?.name || 'Selecione...'}</span>
        </div>
        <ChevronDown size={16} color="rgba(255,255,255,0.4)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>

      {isOpen && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 120 }} onClick={() => setIsOpen(false)} />
          <div className="custom-select-menu" style={{
            position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 121,
            background: 'rgba(20, 35, 30, 0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 6,
            display: 'flex', flexDirection: 'column', gap: 2,
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)'
          }}>
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.name); setIsOpen(false) }}
                  className="custom-select-option"
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 12px', borderRadius: 8,
                    background: value === c.name ? 'rgba(45,212,191,0.1)' : 'transparent',
                    color: value === c.name ? '#2dd4bf' : '#fff',
                    fontWeight: 600, fontSize: 14,
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', border: 'none', transition: 'background .15s'
                  }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: c.color + '22', color: c.color,
                    display: 'grid', placeItems: 'center', flexShrink: 0
                  }}>
                    <DynIcon name={c.icon} size={12} />
                  </span>
                  {c.name}
                  {value === c.name && <CheckCircle2 size={14} style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
            <button
              type="button"
              onClick={() => { onRequestNewCategory(); setIsOpen(false) }}
              className="custom-select-option"
              style={{
                width: '100%', textAlign: 'left',
                padding: '10px 12px', borderRadius: 8,
                background: 'transparent',
                color: '#2dd4bf',
                fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', border: 'none', transition: 'background .15s'
              }}
            >
              <Plus size={16} /> Criar nova categoria
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ============================================================ INCOME ALLOCATION WIDGET

interface IncomeAllocationWidgetProps {
  totalIncome: number
  onAsk?: (seed: string) => void
}

function IncomeAllocationWidget({ totalIncome, onAsk }: IncomeAllocationWidgetProps) {
  const essential = totalIncome * 0.5
  const desires = totalIncome * 0.3
  const savings = totalIncome * 0.2

  const handleDetail = () => {
    if (!onAsk) return
    onAsk(
      `Minha renda total deste mês foi de R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. ` +
      `Gostaria de detalhar meu planejamento financeiro seguindo a regra 50/30/20:\n` +
      `- R$ ${essential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para Necessidades (50%)\n` +
      `- R$ ${desires.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para Desejos (30%)\n` +
      `- R$ ${savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para Poupança/Investimentos (20%)\n` +
      `Me dê sugestões práticas de como organizar minhas despesas nessas proporções.`
    )
  }

  return (
    <div className="card fade-up" style={{ animationDelay: '120ms' }}>
      <div className="card-head" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(1, 88, 76, 0.08)', color: 'var(--teal)',
            display: 'grid', placeItems: 'center'
          }}>
            <Coins size={16} />
          </span>
          <div>
            <div className="card-title" style={{ fontSize: 15, fontWeight: 800 }}>Planejamento 50/30/20</div>
            <div style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600, marginTop: 1 }}>Sugestão de alocação mensal</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
            <span style={{ color: 'var(--muted)' }}>Necessidades (50%)</span>
            <span className="tabnums" style={{ color: 'var(--ink)' }}>R$ {brl(essential)}</span>
          </div>
          <div style={{ width: '100%', height: 7, borderRadius: 10, background: 'var(--line-soft)', overflow: 'hidden' }}>
            <div style={{ width: '50%', height: '100%', background: 'var(--teal)', borderRadius: 10 }} />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
            <span style={{ color: 'var(--muted)' }}>Desejos e Lazer (30%)</span>
            <span className="tabnums" style={{ color: 'var(--ink)' }}>R$ {brl(desires)}</span>
          </div>
          <div style={{ width: '100%', height: 7, borderRadius: 10, background: 'var(--line-soft)', overflow: 'hidden' }}>
            <div style={{ width: '30%', height: '100%', background: 'var(--orange)', borderRadius: 10 }} />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
            <span style={{ color: 'var(--muted)' }}>Poupança / Invest. (20%)</span>
            <span className="tabnums" style={{ color: 'var(--ink)' }}>R$ {brl(savings)}</span>
          </div>
          <div style={{ width: '100%', height: 7, borderRadius: 10, background: 'var(--line-soft)', overflow: 'hidden' }}>
            <div style={{ width: '20%', height: '100%', background: 'var(--gold)', borderRadius: 10 }} />
          </div>
        </div>

        <button
          onClick={handleDetail}
          disabled={totalIncome <= 0 || !onAsk}
          className="btn-primary"
          style={{
            marginTop: 4, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'var(--teal)', border: 'none', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700
          }}
        >
          <Sparkles size={14} /> Detalhar no Finnly IA
        </button>
      </div>
    </div>
  )
}

// ============================================================ AI QUICK ACTIONS

interface IncomeQuickActionsProps {
  onAsk?: (seed: string) => void
}

function IncomeQuickActions({ onAsk }: IncomeQuickActionsProps) {
  const actions = [
    {
      label: 'Declaração de IR',
      prompt: 'Como declarar minhas receitas e rendimentos no Imposto de Renda passo a passo?',
      icon: 'Receipt'
    },
    {
      label: 'Ideias de Renda Extra',
      prompt: 'Quais são as melhores ideias e oportunidades de renda extra para começar hoje com pouco ou nenhum investimento?',
      icon: 'TrendingUp'
    },
    {
      label: 'Simulador de Investimentos',
      prompt: 'Se eu poupar uma parte da minha renda mensal, quanto posso acumular em 1 ano, 5 anos e 10 anos investindo em renda fixa ou tesouro direto?',
      icon: 'PiggyBank'
    }
  ]

  return (
    <div className="card fade-up" style={{ animationDelay: '90ms', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'rgba(245, 124, 0, 0.08)', color: 'var(--orange)',
          display: 'grid', placeItems: 'center'
        }}>
          <Sparkles size={14} />
        </span>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>Ações Rápidas de IA</div>
          <div style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600 }}>Pergunte ao Finnly IA sobre suas receitas</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => onAsk?.(a.prompt)}
            disabled={!onAsk}
            className="ai-chip-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface-2)', border: '1px solid var(--line)',
              borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 700,
              color: 'var(--ink)', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <span style={{ color: 'var(--muted)', display: 'inline-flex' }}><DynIcon name={a.icon} size={13} /></span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================ MAIN SECTION

export function ReceitasSection({ hidden, onAsk }: { hidden: boolean; onAsk?: (seed: string) => void }) {
  const [allIncomes, setAllIncomes] = useState<Income[]>([])
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYM)
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [editIncome, setEditIncome] = useState<Income | null>(null)
  const [modalDefaults, setModalDefaults] = useState<{ category?: string; amount?: number; is_recurring?: boolean } | undefined>()
  const [showCatModal, setShowCatModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const tabsViewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tabsViewportRef.current) {
        const activeBtn = tabsViewportRef.current.querySelector('.month-tab-btn.active')
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        }
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [selectedMonth, loading])

  const monthOptions = useMemo(() => getMonthOptions(), [])
  const todayYM = useMemo(() => currentMonthYM(), [])

  async function loadAll() {
    setLoading(true)
    const [inc, cats] = await Promise.all([getIncomesForModule(), getIncomeCategories()])
    setAllIncomes(inc as Income[])
    setCategories(processCategories(cats as IncomeCategory[]))
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    async function init() {
      const [inc, cats] = await Promise.all([getIncomesForModule(), getIncomeCategories()])
      if (!active) return
      setAllIncomes(inc as Income[])
      setCategories(processCategories(cats as IncomeCategory[]))
      setLoading(false)
    }
    init()
    return () => { active = false }
  }, [])

  // ---- Derived ----

  const filteredIncomes = useMemo(() =>
    allIncomes.filter(i => {
      if (i.date.slice(0, 7) !== selectedMonth) return false
      if (filterCategory && i.category !== filterCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !(i.description ?? '').toLowerCase().includes(q) &&
          !i.category.toLowerCase().includes(q)
        ) return false
      }
      return true
    }),
    [allIncomes, selectedMonth, filterCategory, searchQuery]
  )

  const prevMonthStr = prevMonthYM(selectedMonth)

  const prevIncomes = useMemo(() =>
    allIncomes.filter(i => i.date.slice(0, 7) === prevMonthStr),
    [allIncomes, prevMonthStr]
  )

  const currentMonthIncomes = useMemo(() =>
    allIncomes.filter(i => i.date.slice(0, 7) === selectedMonth),
    [allIncomes, selectedMonth]
  )

  const currentTotal = useMemo(() =>
    filteredIncomes.reduce((s, i) => s + Number(i.amount), 0),
    [filteredIncomes]
  )

  const currentMonthTotal = useMemo(() =>
    currentMonthIncomes.reduce((s, i) => s + Number(i.amount), 0),
    [currentMonthIncomes]
  )

  const prevTotal = useMemo(() =>
    prevIncomes.reduce((s, i) => s + Number(i.amount), 0),
    [prevIncomes]
  )

  const monthlyAvg = useMemo(() => {
    const map: Record<string, number> = {}
    allIncomes.forEach(i => { const m = i.date.slice(0, 7); map[m] = (map[m] ?? 0) + Number(i.amount) })
    const vals = Object.values(map)
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
  }, [allIncomes])

  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, number> = {}
    currentMonthIncomes.forEach(i => { catMap[i.category] = (catMap[i.category] ?? 0) + Number(i.amount) })
    const total = Object.values(catMap).reduce((s, v) => s + v, 0) || 1
    return Object.entries(catMap)
      .map(([name, amount]) => ({
        name, amount,
        percentage: Math.round((amount / total) * 100),
        color: categories.find(c => c.name === name)?.color ?? '#90A4AE',
        icon: categories.find(c => c.name === name)?.icon ?? 'Sparkles',
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [currentMonthIncomes, categories])

  const topCategory = categoryBreakdown[0] ?? null

  const delta = prevTotal > 0 ? ((currentMonthTotal - prevTotal) / prevTotal) * 100 : null

  const insights = useMemo(() =>
    buildInsights(currentMonthIncomes, prevIncomes, categories),
    [currentMonthIncomes, prevIncomes, categories]
  )

  const uniqueMonthCategoryNames = useMemo(() => {
    const names = new Set(currentMonthIncomes.map(i => i.category))
    return categories.filter(c => names.has(c.name))
  }, [currentMonthIncomes, categories])

  // ---- Handlers ----

  function handleDelete(id: string) {
    startTransition(async () => { await deleteIncome(id); await loadAll() })
  }

  function handleSaved() {
    setShowIncomeModal(false)
    setEditIncome(null)
    setModalDefaults(undefined)
    loadAll()
  }

  function handleCategorySaved(cat: IncomeCategory) {
    setCategories(prev => [...prev, cat])
    setShowCatModal(false)
  }

  function handleLaunchRecurring(template: RecurringTemplate) {
    setModalDefaults({ category: template.category, amount: template.lastAmount, is_recurring: true })
    setEditIncome(null)
    setShowIncomeModal(true)
  }

  const isFiltering = filterCategory !== '' || searchQuery !== ''

  if (loading) {
    return (
      <div className="fd-stack fade-up">
        <div className="topbar-inline">
          <div>
            <h2 className="section-title">Receitas</h2>
            <p className="section-sub">Entenda sua renda e tome decisões melhores</p>
          </div>
        </div>
        <p className="empty-msg" style={{ padding: '80px 0', textAlign: 'center' }}>Carregando receitas…</p>
      </div>
    )
  }

  return (
    <div className="fd-stack fade-up">

      {/* ============ HEADER ============ */}
      <div className="topbar-inline">
        <div>
          <h2 className="section-title">Receitas</h2>
          <p className="section-sub">Entenda sua renda e tome decisões melhores</p>
        </div>
        <button className="btn-primary btn-orange" onClick={() => { setModalDefaults(undefined); setShowIncomeModal(true) }}>
          <Plus size={18} /> Nova receita
        </button>
      </div>

      {/* ============ KPI CARDS ============ */}
      <div className="fd-grid">
        <div className="col-3">
          <div className="kpi fade-up">
            <div className="kpi-top">
              <div className="kpi-ic t-green"><ArrowDown size={20} /></div>
              <div className="kpi-label">Total do mês</div>
              <InfoTooltip text="Soma de todas as receitas registradas no mês selecionado." />
            </div>
            <div className="kpi-val">
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(currentMonthTotal)}
              </span>
            </div>
            <div className="kpi-foot">
              <span className="mut">
                {currentMonthIncomes.length} lançamento{currentMonthIncomes.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="col-3">
          <div className="kpi fade-up" style={{ animationDelay: '60ms' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-teal"><Calendar size={20} /></div>
              <div className="kpi-label">Média mensal</div>
              <InfoTooltip text="Média das receitas mensais considerando todo o histórico registrado." />
            </div>
            <div className="kpi-val">
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(monthlyAvg)}
              </span>
            </div>
            <div className="kpi-foot"><span className="mut">histórico geral</span></div>
          </div>
        </div>

        <div className="col-3">
          <div className="kpi fade-up" style={{ animationDelay: '120ms' }}>
            <div className="kpi-top">
              <div
                className="kpi-ic"
                style={{ background: (topCategory?.color ?? '#01584C') + '22', color: topCategory?.color ?? '#01584C' }}
              >
                <DynIcon name={topCategory?.icon ?? 'Wallet'} size={20} />
              </div>
              <div className="kpi-label">Maior fonte</div>
              <InfoTooltip text="Categoria que mais contribuiu para sua renda no mês selecionado." />
            </div>
            <div className="kpi-val" style={{ fontSize: 18, letterSpacing: '-.01em' }}>
              {topCategory?.name ?? '—'}
            </div>
            <div className="kpi-foot">
              {topCategory ? (
                <span className="mut">
                  <span className={`tabnums${hidden ? ' priv' : ''}`} style={{ color: 'var(--green)', fontWeight: 800 }}>
                    R$ {brl(topCategory.amount)}
                  </span>
                  {' '}· {topCategory.percentage}%
                </span>
              ) : <span className="mut">sem dados</span>}
            </div>
          </div>
        </div>

        <div className="col-3">
          <div className="kpi fade-up" style={{ animationDelay: '180ms' }}>
            <div className="kpi-top">
              <div className={`kpi-ic ${delta !== null ? (delta >= 0 ? 't-green' : 't-orange') : 't-teal'}`}>
                {delta !== null
                  ? (delta >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />)
                  : <Calendar size={20} />}
              </div>
              <div className="kpi-label">vs mês anterior</div>
              <InfoTooltip text="Variação percentual em relação ao mês anterior. Positivo = crescimento, negativo = queda." />
            </div>
            <div className="kpi-val" style={{ fontSize: 24, color: delta !== null ? (delta >= 0 ? 'var(--green)' : 'var(--neg)') : 'var(--faint)' }}>
              {delta !== null ? `${delta >= 0 ? '+' : ''}${Math.round(delta)}%` : '—'}
            </div>
            <div className="kpi-foot">
              {prevTotal > 0 ? (
                <span className="mut">antes: <span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(prevTotal)}</span></span>
              ) : <span className="mut">sem dados anteriores</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ============ MONTH SELECTOR BAR ============ */}
      <div className="month-selector-card fade-up">
        <button
          className="month-nav-btn"
          onClick={() => {
            const idx = monthOptions.findIndex(o => o.value === selectedMonth)
            if (idx > 0) {
              setSelectedMonth(monthOptions[idx - 1].value)
              setFilterCategory('')
              setSearchQuery('')
            }
          }}
          disabled={monthOptions.findIndex(o => o.value === selectedMonth) === 0}
          title="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        
        <div className="month-tabs-viewport" ref={tabsViewportRef}>
          <div className="month-tabs-container">
            {monthOptions.map(o => {
              const isActive = selectedMonth === o.value
              const isToday = o.value === todayYM
              const [monthName, yearName] = o.label.split(' de ')
              return (
                <button
                  key={o.value}
                  className={`month-tab-btn ${isActive ? 'active' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => { setSelectedMonth(o.value); setFilterCategory(''); setSearchQuery('') }}
                >
                  <span className="month-tab-name">
                    {monthName}
                  </span>
                  <span className="month-tab-year">
                    {yearName}{isToday ? ' (Atual)' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <button
          className="month-nav-btn"
          onClick={() => {
            const idx = monthOptions.findIndex(o => o.value === selectedMonth)
            if (idx < monthOptions.length - 1) {
              setSelectedMonth(monthOptions[idx + 1].value)
              setFilterCategory('')
              setSearchQuery('')
            }
          }}
          disabled={monthOptions.findIndex(o => o.value === selectedMonth) === monthOptions.length - 1}
          title="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ============ FILTER BAR ============ */}
      <div className="filter-bar">
        <select
          className="filter-select"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {uniqueMonthCategoryNames.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <div className="search-input">
          <Search size={14} className="search-icon" />
          <input
            placeholder="Buscar receita…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: 'var(--faint)' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {isFiltering && (
          <button
            className="btn-ghost"
            style={{ padding: '7px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => { setFilterCategory(''); setSearchQuery('') }}
          >
            <X size={13} /> Limpar filtros
          </button>
        )}
      </div>

      {/* ============ MAIN GRID ============ */}
      <div className="fd-grid">

        {/* List */}
        <div className="col-8">
          <section className="card fade-up">
            <div className="card-head">
              <div className="card-title">
                <span className="ti t-green"><ArrowDown size={17} /></span>
                {filterCategory
                  ? `${filterCategory} · ${getMonthLabel(selectedMonth)}`
                  : `Lançamentos de ${getMonthLabel(selectedMonth)}`}
              </div>
              <div className="card-sub">
                {filteredIncomes.length} entrada{filteredIncomes.length !== 1 ? 's' : ''}
                {currentTotal > 0 && (
                  <span style={{ marginLeft: 8, color: 'var(--green)', fontWeight: 800 }}>
                    · R$ {brl(currentTotal)}
                  </span>
                )}
              </div>
            </div>

            {filteredIncomes.length === 0 ? (
              <div className="empty-list">
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(40,167,69,.12)', color: '#1C7A33', display: 'grid', placeItems: 'center' }}>
                  {searchQuery ? <Search size={26} /> : <ArrowDown size={28} />}
                </div>
                <p>
                  {searchQuery
                    ? `Nenhuma receita encontrada para "${searchQuery}".`
                    : filterCategory
                      ? `Nenhuma receita de "${filterCategory}" em ${getMonthLabel(selectedMonth)}.`
                      : `Nenhuma receita em ${getMonthLabel(selectedMonth)}.`}
                </p>
                {!searchQuery && !filterCategory && (
                  <button className="btn-primary btn-orange" onClick={() => { setModalDefaults(undefined); setShowIncomeModal(true) }}>
                    <Plus size={16} /> Adicionar receita
                  </button>
                )}
              </div>
            ) : (
              filteredIncomes.map(item => {
                const cat = categories.find(c => c.name === item.category)
                const catColor = cat?.color ?? '#90A4AE'
                const catIcon = cat?.icon ?? 'Sparkles'
                return (
                  <div key={item.id} className="row-item">
                    <div className="row-ic" style={{ background: catColor + '22', color: catColor }}>
                      <DynIcon name={catIcon} size={19} />
                    </div>
                    <div className="row-main">
                      <div className="row-name">{item.description || item.category}</div>
                      <div className="row-sub">
                        {item.category} · {formatDate(item.date)}
                        {item.is_recurring && (
                          <span style={{
                            marginLeft: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            color: 'var(--teal)',
                            background: 'rgba(1, 88, 76, 0.08)',
                            padding: '2px 6px',
                            borderRadius: 6,
                            fontWeight: 800,
                            fontSize: 10,
                            verticalAlign: 'middle',
                          }}>
                            <CalendarClock size={10} /> Recorrente
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="row-amt pos">
                      <span className={`tabnums${hidden ? ' priv' : ''}`}>
                        + R$ {brl(Number(item.amount))}
                      </span>
                    </div>
                    <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => setEditIncome(item)} disabled={isPending} title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn delete-btn" style={{ width: 36, height: 36 }} onClick={() => handleDelete(item.id)} disabled={isPending} title="Excluir">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })
            )}
          </section>
        </div>

        {/* Right col */}
        <div className="col-4 fd-stack">
          {/* Donut chart */}
          <section className="card fade-up" style={{ animationDelay: '80ms' }}>
            <div className="card-head">
              <div className="card-title">
                <span className="ti t-orange"><Sparkles size={17} /></span>
                Por categoria
              </div>
              <div className="card-sub">{getShortMonthLabel(selectedMonth)}</div>
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="empty-msg">Sem dados para o mês selecionado.</p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, position: 'relative' }}>
                  <Donut
                    data={categoryBreakdown.map(c => ({ value: c.amount, color: c.color }))}
                    size={160} stroke={28}
                  />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <small style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 700 }}>Total</small>
                    <b className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.02em' }}>
                      R$ {brl(categoryBreakdown.reduce((s, c) => s + c.amount, 0))}
                    </b>
                  </div>
                </div>
                <div className="legend">
                  {categoryBreakdown.map((c, i) => (
                    <div key={i} className="leg-item">
                      <div className="leg-dot" style={{ background: c.color, borderRadius: 6, width: 10, height: 10 }} />
                      <span className="leg-name" style={{ fontSize: 13 }}>{c.name}</span>
                      <span className="leg-pct">{c.percentage}%</span>
                      <span className={`leg-val tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 13 }}>
                        R$ {brl(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Budget 50/30/20 Planner */}
          <IncomeAllocationWidget totalIncome={currentTotal} onAsk={onAsk} />

          {/* Recurring panel */}
          <RecurringPanel
            allIncomes={allIncomes}
            selectedMonth={selectedMonth}
            categories={categories}
            hidden={hidden}
            onLaunch={handleLaunchRecurring}
          />
        </div>
      </div>

      {/* ============ AI QUICK ACTIONS ============ */}
      <IncomeQuickActions onAsk={onAsk} />

      {/* ============ TREND CHART ============ */}
      <TrendChart allIncomes={allIncomes} selectedMonth={selectedMonth} hidden={hidden} />

      {/* ============ INSIGHTS ============ */}
      {insights.length > 0 && (
        <>
          <div className="insights-head">
            <span className="ti" style={{ background: 'linear-gradient(150deg, var(--teal), var(--teal-900))', color: 'var(--gold)' }}>
              <Sparkles size={18} />
            </span>
            <div>
              <h3>O que o Finnly percebeu</h3>
              <p>Análise inteligente da sua renda · {getMonthLabel(selectedMonth)}</p>
            </div>
          </div>
          <div className="fd-grid">
            {insights.map((ins, i) => {
              const cols = insights.length <= 2 ? 6 : insights.length === 3 ? 4 : 3
              return (
                <div key={i} className={`col-${cols}`}>
                  <div
                    className="insight fade-up"
                    style={{ '--ic-color': ins.color, animationDelay: `${i * 60}ms` } as React.CSSProperties}
                  >
                    <div className={`ic ${ins.tintClass}`}><DynIcon name={ins.iconName} size={18} /></div>
                    <p dangerouslySetInnerHTML={{ __html: ins.body }} />
                    <div className="ins-foot"><span className="tag">{ins.tag}</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ============ MODALS ============ */}
      {(showIncomeModal || editIncome) && (
        <PremiumIncomeModal
          income={editIncome}
          defaultValues={modalDefaults}
          categories={categories}
          onClose={() => { setShowIncomeModal(false); setEditIncome(null); setModalDefaults(undefined) }}
          onSaved={handleSaved}
          onRequestNewCategory={() => setShowCatModal(true)}
        />
      )}

      {showCatModal && (
        <NewCategoryModal
          onClose={() => setShowCatModal(false)}
          onSave={handleCategorySaved}
        />
      )}
    </div>
  )
}
