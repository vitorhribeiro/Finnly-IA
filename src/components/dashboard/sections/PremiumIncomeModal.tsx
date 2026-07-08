import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, Tag, Upload, Check, Clock, Plus } from 'lucide-react'
import { CustomDatePicker } from '@/components/ui/CustomDatePicker'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { QuickCategoryModal, QuickAccountModal } from '@/components/ui/QuickModals'
import { addIncome, updateIncome } from '@/app/dashboard/actions/incomes'
import type { Income, IncomeCategory, Account } from '@/types/database'

function formatCurrencyInput(val: string) {
  const digits = val.replace(/\D/g, '')
  if (!digits) return '0,00'
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseAndFormatPaste(text: string): string | null {
  let clean = text.replace(/R\$/g, '').replace(/\s/g, '').trim()
  if (clean.includes(',') && clean.includes('.')) {
    const commaIndex = clean.indexOf(',')
    const dotIndex = clean.indexOf('.')
    if (commaIndex < dotIndex) {
      clean = clean.replace(/,/g, '')
    } else {
      clean = clean.replace(/\./g, '').replace(',', '.')
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  }
  const num = parseFloat(clean)
  if (isNaN(num)) return null
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toIsoStr(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateToBRL(isoStr: string) {
  if (!isoStr) return ''
  const [y, m, d] = isoStr.split('-')
  return `${d}/${m}/${y}`
}

function getAmountWidth(val: string) {
  if (!val) return 100
  let width = 0
  for (let i = 0; i < val.length; i++) {
    const char = val[i]
    if (char === ',' || char === '.') width += 10
    else if (char === '1') width += 16
    else width += 24
  }
  return Math.max(width + 10, 100)
}

function calculateInstallments(total: number, count: number): number[] {
  const base = Math.floor((total / count) * 100) / 100
  const remainder = Math.round((total - (base * count)) * 100) / 100
  
  const list = []
  for (let i = 1; i <= count; i++) {
    if (i === 1) {
      list.push(Math.round((base + remainder) * 100) / 100)
    } else {
      list.push(base)
    }
  }
  return list
}

export interface PremiumIncomeModalProps {
  income: Income | null
  categories: IncomeCategory[]
  accounts: Account[]
  onClose: () => void
  onSaved: () => void
  onRequestNewCategory?: () => void
  defaultDate?: string
}

export function PremiumIncomeModal({ income, categories, accounts, onClose, onSaved, defaultDate }: PremiumIncomeModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isEdit = !!income && !!income.id

  const [amount, setAmount] = useState(() => {
    if (income) return Number(income.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return ''
  })
  const [paymentStatus, setPaymentStatus] = useState(income?.payment_status ?? true)
  
  const getTodayLocal = () => toIsoStr(new Date())
  const getYesterdayLocal = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return toIsoStr(d)
  }
  
  const [date, setDate] = useState(() => {
    if (income?.date) return income.date
    if (defaultDate) return defaultDate
    return getTodayLocal()
  })

  // Date picker state control
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  
  const [localCategories, setLocalCategories] = useState<IncomeCategory[]>(categories)
  const [localAccounts, setLocalAccounts] = useState<Account[]>(accounts)

  const [category, setCategory] = useState(income?.category ?? categories[0]?.name ?? 'Outros')
  const [description, setDescription] = useState(income?.description ?? '')
  
  const [accountId, setAccountId] = useState(income?.account_id ?? '')
  const [incomeMethod, setIncomeMethod] = useState(income?.income_method ?? '')
  const [incomeType, setIncomeType] = useState<'fixed' | 'variable'>(income?.income_type ?? 'variable')
  const [repeatType, setRepeatType] = useState<'single' | 'recurring' | 'installments'>(income?.is_recurring ? 'recurring' : (income?.installments_total && income.installments_total > 1 ? 'installments' : 'single'))
  const [installmentsTotal, setInstallmentsTotal] = useState(income?.installments_total ? String(income.installments_total) : '')
  
  const [tags, setTags] = useState<string[]>(income?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState(income?.notes ?? '')
  const [isClosing, setIsClosing] = useState(false)
  
  function handleCloseWithAnimation() {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 280)
  }
  
  const [showDetails, setShowDetails] = useState((income?.tags && income.tags.length > 0) || !!income?.notes)
  
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Quick modals
  const [showQuickCategory, setShowQuickCategory] = useState(false)
  const [showQuickAccount, setShowQuickAccount] = useState(false)
  
  const isAnyQuickModalOpen = showQuickCategory || showQuickAccount

  // Options
  const accountOptions = [
    { value: '', label: 'Selecione...', icon: 'Wallet', color: '#90A4AE' },
    ...localAccounts.map(a => ({ value: a.id, label: a.name, icon: 'Landmark', color: a.color })),
    { value: '__new_account__', label: '+ Nova conta', icon: 'Plus', color: '#01584C' }
  ]

  const categoryOptions = [
    ...localCategories.map(c => ({ value: c.name, label: c.name, icon: c.icon, color: c.color }))
  ]

  const isToday = date === getTodayLocal()
  const isYesterday = date === getYesterdayLocal()
  const isOther = !isToday && !isYesterday

  function handleAddTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const formatted = parseAndFormatPaste(text)
    if (formatted !== null) {
      setAmount(formatted)
    }
  }

  function handleSubmit() {
    if (isPending) return
    const cleanAmount = String(amount).replace(/\./g, '').replace(',', '.')
    const amt = parseFloat(cleanAmount)
    if (isNaN(amt) || amt <= 0) { setError('Informe um valor maior que zero.'); return }
    if (!category || category === '__new_category__') { setError('Selecione uma categoria'); return }
    if (!date) { setError('Informe uma data'); return }
    
    if (paymentStatus && (!accountId || accountId === '__new_account__')) {
      setError('Escolha a conta onde essa receita entrou.')
      return
    }

    if (repeatType === 'installments' && (!installmentsTotal || Number(installmentsTotal) < 2)) {
      setError('Parcelamento deve ter no mínimo 2 parcelas.')
      return
    }

    const fd = new FormData()
    fd.set('amount', String(amt))
    fd.set('category', category)
    fd.set('date', date)
    fd.set('description', description)
    fd.set('payment_status', String(paymentStatus))
    fd.set('income_type', incomeType)
    
    if (accountId && accountId !== '__new_account__') fd.set('account_id', accountId)
    if (incomeMethod) fd.set('income_method', incomeMethod)
    
    if (repeatType === 'recurring') {
      fd.set('is_recurring', 'true')
    } else if (repeatType === 'installments') {
      fd.set('installments_total', installmentsTotal)
    }
    
    if (tags.length > 0) tags.forEach(t => fd.append('tags', t))
    if (notes) fd.set('notes', notes)

    setError('')
    startTransition(async () => {
      const res = isEdit && income
        ? await updateIncome(income.id, fd)
        : await addIncome(fd)
      if (res && 'error' in res) { setError(res.error ?? 'Erro desconhecido'); return }
      
      setIsClosing(true)
      setTimeout(() => {
        onSaved()
      }, 280)
    })
  }
  
  // Dynamic financial impact preview
  const getPreviewText = () => {
    if (repeatType === 'recurring') {
      const parts = date.split('-').map(Number)
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2] || 1)
      const monthLabel = dateObj.toLocaleDateString('pt-BR', { month: 'long' })
      const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
      return `Esse lançamento será repetido mensalmente a partir de ${capitalizedMonth}.`
    }
    
    if (!paymentStatus) return 'Essa receita será criada como pendente.'
    
    if (!accountId || accountId === '__new_account__') {
      return 'Falta selecionar a conta de destino para simular o impacto.'
    }
    
    const acc = localAccounts.find(a => a.id === accountId)
    return `Será adicionado R$ ${amount || '0,00'} à conta ${acc ? acc.name : 'selecionada'}.`
  }

  // Generate Installment preview
  const renderInstallmentPreview = () => {
    if (repeatType !== 'installments') return null
    const count = parseInt(installmentsTotal) || 0
    if (count < 2) return null
    
    const totalVal = parseFloat(String(amount).replace(/\./g, '').replace(',', '.')) || 0
    if (totalVal <= 0) return null

    const installmentAmounts = calculateInstallments(totalVal, count)
    const [y, m, dVal] = date.split('-').map(Number)
    const baseDate = new Date(y, m - 1, dVal || 1)
    const list = []
    
    for (let i = 1; i <= Math.min(count, 5); i++) {
      const d = new Date(baseDate)
      d.setMonth(baseDate.getMonth() + i - 1)
      const ds = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      const valFormatted = installmentAmounts[i - 1].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      list.push(`${i}/${count} — ${ds} — R$ ${valFormatted}`)
    }
    
    return (
      <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 12, marginTop: 12, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
        {list.map((l, i) => <div key={i} style={{ marginBottom: 4 }}>{l}</div>)}
        {count > 5 && <div>... (mais {count - 5} parcelas)</div>}
      </div>
    )
  }

  return createPortal(
    <>
      <style>{`
        @keyframes filterModalFadeUp {
          from {
            opacity: 0;
            transform: translate(-50%, -46%) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes filterModalFadeDown {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -46%) scale(0.96);
          }
        }
        @keyframes scrimFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(8px); }
        }
        @keyframes scrimFadeOut {
          from { opacity: 1; backdrop-filter: blur(8px); }
          to { opacity: 0; backdrop-filter: blur(0px); }
        }
        .filter-modal-animate {
          animation: filterModalFadeUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .filter-modal-animate-out {
          animation: filterModalFadeDown 0.28s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
        }
        .scrim-animate {
          animation: scrimFadeIn 0.3s ease forwards;
        }
        .scrim-animate-out {
          animation: scrimFadeOut 0.25s ease forwards;
        }
        .premium-field-label {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .premium-field-label > span {
          font-size: 11px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .premium-form-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid var(--line-soft);
          background: var(--surface-2);
          font-size: 13px;
          outline: none;
          color: var(--ink);
          font-weight: 600;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .premium-form-input:focus {
          border-color: var(--teal) !important;
          box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.15);
        }
        .form-error-custom {
          color: #ef4444;
          font-size: 12.5px;
          font-weight: 600;
          margin: 0;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.08);
          border-radius: 12px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .premium-amount-input {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          -webkit-appearance: none;
          appearance: none;
        }
        .premium-amount-input:focus {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .payment-status-btn {
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .payment-status-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }
        .payment-status-btn:active {
          transform: translateY(0);
        }
      `}</style>
      <div 
        className={`modal-scrim scrim-animate ${isClosing ? 'scrim-animate-out' : ''}`}
        onClick={handleCloseWithAnimation} 
        style={{
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: isAnyQuickModalOpen ? 'none' : 'block'
        }}
      />
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: 'min(440px, calc(100vw - 32px))',
          maxHeight: 'min(calc(100vh - 40px), 760px)',
          background: 'var(--card)',
          border: '1px solid var(--line-soft)',
          borderRadius: 24,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.12)',
          display: isAnyQuickModalOpen ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 100000,
          color: 'var(--ink)'
        }}
        className={`filter-modal-animate ${isClosing ? 'filter-modal-animate-out' : ''}`}
      >
        
        {/* HEADER */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
              {isEdit ? 'Editar Receita' : 'Nova Receita'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              {isEdit ? 'Edite os dados desta transação de entrada.' : 'Preencha os dados para registrar uma entrada.'}
            </p>
          </div>
          <button 
            onClick={handleCloseWithAnimation} 
            disabled={isPending}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', color: 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
             <X size={18} style={{ strokeWidth: 2.5 }} />
          </button>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }} className="hide-scrollbar">
          {error && <div className="form-error-custom" style={{ marginBottom: 8 }}>{error}</div>}

          {/* VALOR NO TOPO */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>Valor da Receita</span>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--muted)' }}>R$</span>
              <input 
                type="text"
                inputMode="numeric"
                placeholder="0,00" 
                value={amount}
                onFocus={() => { if (amount === '0,00') setAmount('') }}
                onBlur={() => { if (!amount) setAmount('0,00') }}
                onPaste={handlePaste}
                onChange={e => {
                  const val = e.target.value
                  if (!val) setAmount('')
                  else setAmount(formatCurrencyInput(val))
                }}
                disabled={isPending}
                required
                className="premium-amount-input"
                style={{ 
                  width: `${getAmountWidth(amount || '0,00')}px`, 
                  maxWidth: '100%', 
                  fontSize: 44, 
                  fontWeight: 900, 
                  color: 'var(--teal)', 
                  letterSpacing: '-0.02em', 
                  padding: 0,
                  textAlign: 'left'
                }}
              />
            </div>
            
            <button
              type="button"
              onClick={() => { if (!isPending) setPaymentStatus(!paymentStatus) }}
              disabled={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: isPending ? 'default' : 'pointer',
                background: paymentStatus ? 'rgba(1, 107, 76, 0.08)' : 'var(--surface-2)',
                border: paymentStatus ? '1px solid rgba(1, 107, 76, 0.2)' : '1px solid var(--line-soft)',
                padding: '8px 16px',
                borderRadius: 24,
                marginTop: 4,
                color: paymentStatus ? 'var(--teal)' : 'var(--muted)',
                fontWeight: 700,
                fontSize: 13,
                outline: 'none',
                boxShadow: 'none',
                alignSelf: 'center'
              }}
              className="payment-status-btn"
            >
              <span 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transform: paymentStatus ? 'scale(1.1) rotate(0deg)' : 'scale(1) rotate(-10deg)',
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                {paymentStatus ? <Check size={14} style={{ strokeWidth: 3 }} /> : <Clock size={14} style={{ strokeWidth: 2.5 }} />}
              </span>
              <span style={{ transition: 'all 0.3s ease' }}>
                {paymentStatus ? 'Recebido' : 'Pendente'}
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            <div className="premium-field-label">
              <span>Data prevista <span style={{ color: '#ef4444' }}>*</span></span>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button 
                  type="button" 
                  onClick={() => { setDate(getTodayLocal()); setIsDatePickerOpen(false); }} 
                  disabled={isPending}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid',
                    borderColor: isToday ? 'var(--teal)' : 'var(--line-soft)',
                    background: isToday ? 'rgba(1, 88, 76, 0.08)' : 'var(--surface-2)',
                    color: isToday ? 'var(--teal)' : 'var(--ink)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.2s'
                  }}
                >
                  Hoje
                </button>
                <button 
                  type="button" 
                  onClick={() => { setDate(getYesterdayLocal()); setIsDatePickerOpen(false); }} 
                  disabled={isPending}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid',
                    borderColor: isYesterday ? 'var(--teal)' : 'var(--line-soft)',
                    background: isYesterday ? 'rgba(1, 88, 76, 0.08)' : 'var(--surface-2)',
                    color: isYesterday ? 'var(--teal)' : 'var(--ink)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.2s'
                  }}
                >
                  Ontem
                </button>
                <div style={{ flex: 1, position: 'relative' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} 
                    disabled={isPending}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1px solid',
                      borderColor: isOther ? 'var(--teal)' : 'var(--line-soft)',
                      background: isOther ? 'rgba(1, 88, 76, 0.08)' : 'var(--surface-2)',
                      color: isOther ? 'var(--teal)' : 'var(--ink)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 13,
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <span>{isOther ? formatDateToBRL(date) : 'Outra data'}</span>
                  </button>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                    <CustomDatePicker
                      value={date}
                      onChange={(val) => {
                        setDate(val)
                        setIsDatePickerOpen(false)
                      }}
                      externalOpen={isDatePickerOpen}
                      onExternalOpenChange={setIsDatePickerOpen}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="premium-field-label">
              <span>Descrição</span>
              <input className="premium-form-input" placeholder="Ex: Salário" value={description} onChange={e => setDescription(e.target.value)} disabled={isPending} />
            </div>

            <div className="premium-field-label">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Categoria <span style={{ color: '#ef4444' }}>*</span></span>
                <button
                  type="button"
                  onClick={() => setShowQuickCategory(true)}
                  disabled={isPending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--teal)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--teal-900)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--teal)'}
                >
                  <Plus size={12} style={{ strokeWidth: 3 }} /> Nova Categoria
                </button>
              </div>
              <CustomSelect
                options={categoryOptions}
                value={category}
                onChange={setCategory}
                placeholder="Selecione..."
              />
            </div>

            <div className="premium-field-label">
              <span>Conta de destino {paymentStatus && <span style={{ color: '#ef4444' }}>*</span>}</span>
              <CustomSelect
                options={accountOptions}
                value={accountId}
                onChange={val => {
                  if (val === '__new_account__') setShowQuickAccount(true)
                  else setAccountId(val)
                }}
                placeholder="Selecione..."
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="premium-field-label" style={{ flex: 1 }}>
                <span>Tipo de entrada</span>
                <select className="premium-form-input" value={incomeType} onChange={e => setIncomeType(e.target.value as 'fixed' | 'variable')} disabled={isPending}>
                  <option value="variable">Variável</option>
                  <option value="fixed">Fixa</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>
                  {incomeType === 'fixed' 
                    ? 'Fixa: salário, aluguel recebido ou contrato mensal.' 
                    : 'Variável: freela, venda, bônus ou pix avulso.'}
                </div>
              </div>

              <div className="premium-field-label" style={{ flex: 1 }}>
                <span>Forma de recebimento</span>
                <select className="premium-form-input" value={incomeMethod} onChange={e => setIncomeMethod(e.target.value)} disabled={isPending}>
                  <option value="">Não informado</option>
                  <option value="pix">Pix</option>
                  <option value="transfer">Transferência</option>
                  <option value="cash">Dinheiro</option>
                  <option value="boleto">Boleto</option>
                  <option value="deposit">Depósito</option>
                  <option value="card">Cartão</option>
                  <option value="other">Outros</option>
                </select>
              </div>
            </div>

            <div className="premium-field-label">
              <span>Como lançar?</span>
              <select className="premium-form-input" value={repeatType} onChange={e => setRepeatType(e.target.value as 'single' | 'recurring' | 'installments')} disabled={isPending}>
                <option value="single">Só uma vez</option>
                <option value="recurring">Todo mês</option>
                <option value="installments">Parcelado</option>
              </select>
              
              {repeatType === 'installments' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Qtd Parcelas:</span>
                  <input className="premium-form-input" type="number" min="2" max="99" value={installmentsTotal} onChange={e => setInstallmentsTotal(e.target.value)} disabled={isPending} style={{ width: 80 }} placeholder="Ex: 3" />
                </div>
              )}
            </div>
            
            {renderInstallmentPreview()}

            {/* SANFONA MAIS DETALHES */}
            <div style={{ marginTop: 12, borderTop: '1px solid var(--line-soft)', paddingTop: 16 }}>
              <button 
                type="button" 
                onClick={() => setShowDetails(!showDetails)}
                disabled={isPending}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink)' }}
              >
                <span style={{ fontSize: 14, fontWeight: 700 }}>{showDetails ? 'Menos detalhes' : 'Mais detalhes'}</span>
                <ChevronDown size={18} style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {showDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                  {/* TAGS */}
                  <div className="premium-field-label">
                    <span>Tags</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {tags.map(t => (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(1, 88, 76, 0.06)', color: 'var(--teal-900)', borderRadius: 16, fontSize: 11, fontWeight: 700 }}>
                          <Tag size={12} style={{ color: 'var(--teal-900)' }} />
                          {t}
                          <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} disabled={isPending} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--teal-900)' }}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="text" 
                        placeholder="Adicionar tag (ex: extra)" 
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                        disabled={isPending}
                        className="premium-form-input"
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        onClick={handleAddTag} 
                        disabled={isPending} 
                        style={{ 
                          padding: '10px 16px', 
                          borderRadius: 12, 
                          border: '1px solid var(--line-soft)', 
                          background: 'var(--surface-2)', 
                          color: 'var(--ink)', 
                          fontWeight: 700, 
                          fontSize: 13, 
                          cursor: 'pointer' 
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* OBSERVAÇÃO */}
                  <div className="premium-field-label">
                    <span>Observação (opcional)</span>
                    <textarea 
                      placeholder="Algum detalhe adicional..." 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      disabled={isPending} 
                      rows={2} 
                      className="premium-form-input"
                    />
                  </div>

                  {/* ANEXOS */}
                  <div className="premium-field-label">
                    <span>Anexar arquivo</span>
                    <button type="button" disabled style={{ width: '100%', padding: '16px', background: 'var(--surface-2)', border: '1px dashed var(--line-soft)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'not-allowed', color: 'var(--muted)' }}>
                      <Upload size={20} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Anexos estarão disponíveis em breve</span>
                    </button>
                  </div>

                </div>
              )}
            </div>
            
            <div style={{ fontSize: 12, color: 'var(--teal)', textAlign: 'center', marginTop: 16, fontWeight: 700, padding: '10px 14px', background: 'rgba(1, 88, 76, 0.05)', borderRadius: 12, border: '1px solid rgba(1, 88, 76, 0.1)' }}>
              {getPreviewText()}
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line-soft)', display: 'flex', gap: 12, background: 'var(--card)' }}>
          <button 
            type="button" 
            onClick={handleCloseWithAnimation} 
            disabled={isPending}
            style={{ 
              flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--line-soft)',
              background: 'var(--card)', color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--card)'}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isPending}
            style={{ 
              flex: 1, padding: '12px', borderRadius: 12, border: 'none',
              background: 'var(--teal-900)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--teal)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--teal-900)'}
          >
            {isPending ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Salvar Receita')}
          </button>
        </div>
      </div>
      
      {showQuickCategory && (
        <QuickCategoryModal 
          type="income" 
          onClose={() => setShowQuickCategory(false)} 
          onSaved={(newCat) => { 
            setLocalCategories(prev => [...prev, newCat as IncomeCategory])
            setCategory(newCat.name)
            setShowQuickCategory(false)
          }} 
        />
      )}
      {showQuickAccount && (
        <QuickAccountModal 
          onClose={() => setShowQuickAccount(false)} 
          onSaved={(newAcc) => { 
            setLocalAccounts(prev => [...prev, newAcc])
            setAccountId(newAcc.id)
            setShowQuickAccount(false)
          }} 
        />
      )}
    </>,
    document.body
  )
}
