import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, Tag, Upload, AlertCircle, Plus } from 'lucide-react'
import { CustomDatePicker } from '@/components/ui/CustomDatePicker'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { QuickCategoryModal, QuickAccountModal, QuickCardModal } from '@/components/ui/QuickModals'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { addExpense, updateExpense, undoExpensePayment } from '@/app/dashboard/actions/expenses'
import type { Expense, ExpenseCategory, Account, CreditCard } from '@/types/database'

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

export interface PremiumExpenseModalProps {
  expense: Expense | null
  categories: ExpenseCategory[]
  accounts: Account[]
  creditCards: CreditCard[]
  onClose: () => void
  onSaved: () => void
}

export function PremiumExpenseModal({ expense, categories, accounts, creditCards, onClose, onSaved }: PremiumExpenseModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isEdit = !!expense && !!expense.id

  const [amount, setAmount] = useState(() => {
    if (expense) return Number(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return ''
  })
  
  const getTodayLocal = () => toIsoStr(new Date())
  const getYesterdayLocal = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return toIsoStr(d)
  }
  
  const [date, setDate] = useState(() => {
    if (expense?.date) return expense.date
    return getTodayLocal()
  })

  // Date picker state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isPaidDatePickerOpen, setIsPaidDatePickerOpen] = useState(false)
  
  const [localCategories, setLocalCategories] = useState<ExpenseCategory[]>(categories)
  const [localAccounts, setLocalAccounts] = useState<Account[]>(accounts)
  const [localCreditCards, setLocalCreditCards] = useState<CreditCard[]>(creditCards)

  const [category, setCategory] = useState(expense?.category ?? categories[0]?.name ?? 'Outros')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [expenseType, setExpenseType] = useState<'fixed' | 'variable'>(expense?.expense_type ?? 'variable')
  
  const [paidAccountId, setPaidAccountId] = useState(expense?.paid_account_id ?? '')
  const [paymentMethod, setPaymentMethod] = useState(expense?.payment_method ?? '')
  const [paidAt, setPaidAt] = useState(expense?.paid_at ?? date)
  
  // Account vs Card tab
  const [payWith, setPayWith] = useState<'account' | 'card'>(expense?.credit_card_id ? 'card' : 'account')
  const [accountId, setAccountId] = useState(expense?.account_id ?? '')
  const [creditCardId, setCreditCardId] = useState(expense?.credit_card_id ?? '')

  const [paymentStatus, setPaymentStatus] = useState(expense?.payment_status ?? false)

  const [repeatType, setRepeatType] = useState<'single' | 'recurring' | 'installments'>(expense?.is_recurring ? 'recurring' : (expense?.installments_total && expense.installments_total > 1 ? 'installments' : 'single'))
  const [installmentsTotal, setInstallmentsTotal] = useState(expense?.installments_total ? String(expense.installments_total) : '')
  
  const [tags, setTags] = useState<string[]>(expense?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [isClosing, setIsClosing] = useState(false)
  
  function handleCloseWithAnimation() {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 280)
  }
  
  const [showDetails, setShowDetails] = useState((expense?.tags && expense.tags.length > 0) || !!expense?.notes || (expense?.payment_status && !expense.credit_card_id))
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Quick Modals states
  const [showQuickCategory, setShowQuickCategory] = useState(false)
  const [showQuickAccount, setShowQuickAccount] = useState(false)
  const [showQuickCard, setShowQuickCard] = useState(false)
  
  const isAnyQuickModalOpen = showQuickCategory || showQuickAccount || showQuickCard

  // Confirm dialog state
  const [showConfirmUndo, setShowConfirmUndo] = useState(false)



  const accountOptions = [
    { value: '', label: 'Selecione...', icon: 'Wallet', color: '#90A4AE' },
    ...localAccounts.map(a => ({ value: a.id, label: a.name, icon: 'Landmark', color: a.color })),
    { value: '__new_account__', label: '+ Nova conta', icon: 'Plus', color: '#01584C' }
  ]

  const cardOptions = [
    { value: '', label: 'Selecione...', icon: 'CreditCard', color: '#90A4AE' },
    ...localCreditCards.map(c => ({ value: c.id, label: c.name, icon: 'CreditCard', color: c.color })),
    { value: '__new_card__', label: '+ Novo cartão', icon: 'Plus', color: '#01584C' }
  ]

  const categoryOptions = [
    ...localCategories.map(c => ({ value: c.name, label: c.name, icon: c.icon, color: c.color }))
  ]

  const paidAccountOptions = [
    { value: '', label: 'Selecione a conta...' },
    ...localAccounts.map(a => ({ value: a.id, label: a.name }))
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

  async function handleUndoPayment() {
    if (!expense || !expense.id) return
    setError('')
    startTransition(async () => {
      const res = await undoExpensePayment(expense.id)
      if (res && 'error' in res && res.error) {
        setError(res.error)
        return
      }
      setPaymentStatus(false)
      setPaidAccountId('')
      setPaymentMethod('')
      setShowConfirmUndo(false)
      // Call parent onSaved to refresh list/totals in background
      onSaved()
    })
  }

  function handleSubmit() {
    if (isPending) return
    const cleanAmount = String(amount).replace(/\./g, '').replace(',', '.')
    const amt = parseFloat(cleanAmount)
    if (isNaN(amt) || amt <= 0) { setError('Informe um valor maior que zero.'); return }
    if (!category || category === '__new_category__') { setError('Selecione uma categoria'); return }
    if (!date) { setError('Informe uma data'); return }
    
    if (payWith === 'account') {
      if (paymentStatus) {
        if (!paidAccountId || paidAccountId === '__new_account__') {
          setError('Informe a conta, forma e data do pagamento para dar baixa nesta despesa.')
          return
        }
        if (!paymentMethod) {
          setError('Informe a conta, forma e data do pagamento para dar baixa nesta despesa.')
          return
        }
        if (!paidAt) {
          setError('Informe a conta, forma e data do pagamento para dar baixa nesta despesa.')
          return
        }
      }
    } else {
      // Credit Card checks
      if (!creditCardId || creditCardId === '__new_card__') {
        setError('Selecione um cartão de crédito.')
        return
      }
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
    fd.set('expense_type', expenseType)
    
    if (payWith === 'account') {
      if (accountId && accountId !== '__new_account__') fd.set('account_id', accountId)
    } else {
      if (creditCardId && creditCardId !== '__new_card__') fd.set('credit_card_id', creditCardId)
    }
    
    fd.set('payment_status', String(paymentStatus))
    if (payWith === 'account' && paymentStatus) {
      fd.set('paid_at', paidAt)
      fd.set('paid_account_id', paidAccountId)
      fd.set('payment_method', paymentMethod)
    }
    
    if (repeatType === 'recurring') {
      fd.set('is_recurring', 'true')
    } else if (repeatType === 'installments') {
      fd.set('installments_total', installmentsTotal)
    }
    
    if (tags.length > 0) tags.forEach(t => fd.append('tags', t))
    if (notes) fd.set('notes', notes)

    setError('')
    startTransition(async () => {
      const res = isEdit && expense
        ? await updateExpense(expense.id, fd)
        : await addExpense(fd)
      if (res && 'error' in res) { setError(res.error ?? 'Erro desconhecido'); return }
      
      setIsClosing(true)
      setTimeout(() => {
        onSaved()
      }, 280)
    })
  }

  const getPreviewText = () => {
    if (payWith === 'card') {
      if (!creditCardId || creditCardId === '__new_card__') {
        return 'Falta selecionar o cartão para simular o impacto.'
      }
      const card = localCreditCards.find(c => c.id === creditCardId)
      return `Essa despesa será lançada na fatura do cartão ${card ? card.name : 'selecionado'}.`
    }
    
    if (repeatType === 'recurring') {
      const parts = date.split('-').map(Number)
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2] || 1)
      const monthLabel = dateObj.toLocaleDateString('pt-BR', { month: 'long' })
      const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
      return `Esse lançamento será repetido mensalmente a partir de ${capitalizedMonth}.`
    }
    
    if (!paymentStatus) return 'Essa despesa será criada como pendente.'
    
    if (!paidAccountId || paidAccountId === '__new_account__' || !paymentMethod) {
      return 'Falta preencher os dados de pagamento para simular o impacto.'
    }
    
    const acc = localAccounts.find(a => a.id === paidAccountId)
    const m = paymentMethod === 'pix' ? 'via Pix' : (paymentMethod === 'debit' ? 'no Débito' : 'da conta')
    return `Será debitado R$ ${amount || '0,00'} da conta ${acc ? acc.name : 'selecionada'} ${m}.`
  }

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
      `}</style>
      <div 
        className={`modal-scrim scrim-animate ${isClosing ? 'scrim-animate-out' : ''}`}
        onClick={handleCloseWithAnimation} 
        style={{
          display: isAnyQuickModalOpen ? 'none' : 'block'
        }}
      />
      <div 
        className={`modal-box filter-modal-animate ${isClosing ? 'filter-modal-animate-out' : ''}`} 
        style={{ maxWidth: 440, padding: 0, overflow: 'hidden', display: isAnyQuickModalOpen ? 'none' : 'flex' }}
      >
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {isEdit ? 'Editar despesa' : 'Nova despesa'}
          </h3>
          <button className="icon-btn" onClick={handleCloseWithAnimation} disabled={isPending}><X size={18} /></button>
        </div>

        {/* BODY */}
        <div style={{ padding: '24px 20px', maxHeight: '70vh', overflowY: 'auto' }} className="fd-stack">
          {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* VALOR NO TOPO */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--faint)' }}>Valor da Despesa</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--muted)', marginTop: 4 }}>R$</span>
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
                style={{ width: `${Math.max(amount.length, 4)}ch`, maxWidth: '100%', minWidth: 100, fontSize: 40, fontWeight: 900, border: 'none', background: 'transparent', outline: 'none', color: 'var(--neg)', textAlign: 'center', letterSpacing: '-0.02em', padding: 0 }}
              />
            </div>
            
            {payWith === 'card' ? (
              <div style={{ background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 20, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--orange-ink)', fontSize: 12, fontWeight: 700 }}>
                <AlertCircle size={14} /> Despesas de cartão devem ser pagas pela fatura.
              </div>
            ) : isEdit && expense?.payment_status ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <label style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, 
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '6px 12px', borderRadius: 20, marginTop: 4, opacity: 0.8
                }}>
                  <input 
                    type="checkbox" 
                    checked={paymentStatus} 
                    disabled={true} 
                    style={{ width: 16, height: 16, accentColor: 'var(--neg)', cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neg)' }}>
                    Foi paga
                  </span>
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowConfirmUndo(true)}
                  disabled={isPending}
                  style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', 
                    color: 'var(--neg)', fontSize: 11, fontWeight: 800, textDecoration: 'underline',
                    padding: '2px 8px'
                  }}
                >
                  Estornar Pagamento
                </button>
              </div>
            ) : (
              <label style={{ 
                display: 'flex', alignItems: 'center', gap: 8, cursor: isPending ? 'default' : 'pointer',
                background: paymentStatus ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-2)',
                padding: '6px 12px', borderRadius: 20, marginTop: 4, transition: 'all 0.2s'
              }}>
                <input 
                  type="checkbox" 
                  checked={paymentStatus} 
                  onChange={e => setPaymentStatus(e.target.checked)} 
                  disabled={isPending}
                  style={{ width: 16, height: 16, accentColor: 'var(--neg)', cursor: isPending ? 'default' : 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: paymentStatus ? 'var(--neg)' : 'var(--faint)' }}>
                  {paymentStatus ? 'Foi paga' : 'Pendente'}
                </span>
              </label>
            )}
          </div>

          <div className="entry-form">
            <div className="field-group">
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span>Vencimento / Data da despesa <span className="req">*</span></span>
              </span>
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
                    borderColor: isToday ? 'var(--orange-ink)' : 'var(--border)',
                    background: isToday ? 'rgba(245, 124, 0, 0.08)' : 'var(--surface-2)',
                    color: isToday ? 'var(--orange-ink)' : 'var(--muted)',
                    fontWeight: 800,
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
                    borderColor: isYesterday ? 'var(--orange-ink)' : 'var(--border)',
                    background: isYesterday ? 'rgba(245, 124, 0, 0.08)' : 'var(--surface-2)',
                    color: isYesterday ? 'var(--orange-ink)' : 'var(--muted)',
                    fontWeight: 800,
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
                      borderColor: isOther ? 'var(--orange-ink)' : 'var(--border)',
                      background: isOther ? 'rgba(245, 124, 0, 0.08)' : 'var(--surface-2)',
                      color: isOther ? 'var(--orange-ink)' : 'var(--muted)',
                      fontWeight: 800,
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

            <div className="field-group">
              <span>Descrição</span>
              <input placeholder="Ex: Mercado" value={description} onChange={e => setDescription(e.target.value)} disabled={isPending} />
            </div>

            <div className="field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Categoria <span className="req">*</span></span>
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
            
            {/* PAGAR COM SEGMENTED CONTROLS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Pagar com</span>
              <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => { setPayWith('account'); setCreditCardId(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: payWith === 'account' ? 'var(--surface)' : 'transparent',
                    color: payWith === 'account' ? 'var(--ink)' : 'var(--muted)',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.2s'
                  }}
                >
                  Conta
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setPayWith('card')
                    setAccountId('')
                    setPaymentStatus(false)
                    setPaidAccountId('')
                    setPaymentMethod('')
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: payWith === 'card' ? 'var(--surface)' : 'transparent',
                    color: payWith === 'card' ? 'var(--ink)' : 'var(--muted)',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.2s'
                  }}
                >
                  Cartão
                </button>
              </div>
            </div>

            {/* SELECTION DROPDOWN BASED ON TABS */}
            {payWith === 'account' ? (
              <div className="field-group">
                <span>Conta vinculada</span>
                <CustomSelect
                  options={accountOptions}
                  value={accountId}
                  onChange={val => {
                    if (val === '__new_account__') setShowQuickAccount(true)
                    else setAccountId(val)
                  }}
                  placeholder="Selecione a conta..."
                />
              </div>
            ) : (
              <div className="field-group">
                <span>Cartão de crédito</span>
                <CustomSelect
                  options={cardOptions}
                  value={creditCardId}
                  onChange={val => {
                    if (val === '__new_card__') setShowQuickCard(true)
                    else setCreditCardId(val)
                  }}
                  placeholder="Selecione o cartão..."
                />
              </div>
            )}

            <div className="field-group">
              <span>Como lançar?</span>
              <select value={repeatType} onChange={e => setRepeatType(e.target.value as 'single' | 'recurring' | 'installments')} disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                <option value="single">Só uma vez</option>
                <option value="recurring">Todo mês</option>
                <option value="installments">Parcelado</option>
              </select>
              
              {repeatType === 'installments' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Qtd Parcelas:</span>
                  <input type="number" min="2" max="99" value={installmentsTotal} onChange={e => setInstallmentsTotal(e.target.value)} disabled={isPending} style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', color: 'var(--ink)' }} placeholder="Ex: 3" />
                </div>
              )}
            </div>
            
            {renderInstallmentPreview()}

            <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
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
                  
                  {/* EXPENSE PAGA POR CONTA COMPLEMENTS */}
                  {paymentStatus && payWith === 'account' && (
                    <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.03)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid rgba(239, 68, 68, 0.08)' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--neg)' }}>Baixa do Pagamento</div>
                      
                      <div className="field-group">
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Data que foi pago *</span>
                        <div style={{ position: 'relative', marginTop: 4 }}>
                          <button 
                            type="button"
                            onClick={() => setIsPaidDatePickerOpen(!isPaidDatePickerOpen)}
                            disabled={isPending}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 12,
                              border: '1px solid var(--border)',
                              background: 'var(--surface-2)',
                              color: paidAt ? 'var(--ink)' : 'var(--muted)',
                              fontWeight: 800,
                              cursor: 'pointer',
                              fontSize: 13,
                              textAlign: 'left'
                            }}
                          >
                            {paidAt ? formatDateToBRL(paidAt) : 'Selecione a data...'}
                          </button>
                          <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                            <CustomDatePicker 
                               value={paidAt} 
                               onChange={(val) => {
                                 setPaidAt(val)
                                 setIsPaidDatePickerOpen(false)
                               }} 
                               externalOpen={isPaidDatePickerOpen}
                               onExternalOpenChange={setIsPaidDatePickerOpen}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div className="field-group" style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Conta de origem *</span>
                          <select value={paidAccountId} onChange={e => setPaidAccountId(e.target.value)} disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                            {paidAccountOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div className="field-group" style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Forma de pago *</span>
                          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                            <option value="">Selecione...</option>
                            <option value="pix">Pix</option>
                            <option value="debit">Débito</option>
                            <option value="transfer">Transferência</option>
                            <option value="boleto">Boleto</option>
                            <option value="cash">Dinheiro</option>
                            <option value="other">Outros</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="field-group">
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Tipo de Despesa</span>
                    <select value={expenseType} onChange={e => setExpenseType(e.target.value as 'fixed' | 'variable')} disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                      <option value="variable">Variável</option>
                      <option value="fixed">Fixa</option>
                    </select>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>
                      {expenseType === 'fixed' 
                        ? 'Fixa: aluguel, internet, academia ou assinatura.' 
                        : 'Variável: mercado, lazer, compras ou delivery.'}
                    </div>
                  </div>

                  <div className="field-group">
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Tags</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {tags.map(t => (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--surface-2)', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                          <Tag size={12} style={{ color: 'var(--muted)' }} />
                          {t}
                          <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} disabled={isPending} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--faint)' }}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" placeholder="Adicionar tag (ex: carro)" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} disabled={isPending} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', color: 'var(--ink)' }} />
                      <button type="button" onClick={handleAddTag} disabled={isPending} className="btn-secondary" style={{ padding: '0 16px' }}>Add</button>
                    </div>
                  </div>

                  <div className="field-group">
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Observação (opcional)</span>
                    <textarea placeholder="Algum detalhe adicional..." value={notes} onChange={e => setNotes(e.target.value)} disabled={isPending} rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--surface)' }} />
                  </div>

                  <div className="field-group">
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Anexar arquivo</span>
                    <button type="button" disabled style={{ width: '100%', padding: '16px', background: 'var(--surface-2)', border: '1px dashed var(--line-soft)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'not-allowed', color: 'var(--faint)' }}>
                      <Upload size={20} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Anexos estarão disponíveis em breve</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: 'var(--orange-ink)', textAlign: 'center', marginTop: 16, fontWeight: 700, padding: '10px 14px', background: 'rgba(245, 124, 0, 0.05)', borderRadius: 12, border: '1px solid rgba(245, 124, 0, 0.1)' }}>
              {getPreviewText()}
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--surface-2)' }}>
          <button type="button" className="btn-ghost" onClick={handleCloseWithAnimation} disabled={isPending}>Cancelar</button>
          <button type="button" className="btn-primary" style={{ background: 'var(--orange-ink)' }} onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Salvar Despesa')}
          </button>
        </div>
      </div>
      
      {showQuickCategory && (
        <QuickCategoryModal 
          type="expense" 
          onClose={() => setShowQuickCategory(false)} 
          onSaved={(newCat) => { 
            setLocalCategories(prev => [...prev, newCat as ExpenseCategory])
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
            if (payWith === 'account') setAccountId(newAcc.id)
            else setPaidAccountId(newAcc.id)
            setShowQuickAccount(false)
          }} 
        />
      )}
      {showQuickCard && (
        <QuickCardModal 
          onClose={() => setShowQuickCard(false)} 
          onSaved={(newCard) => { 
            setLocalCreditCards(prev => [...prev, newCard])
            setCreditCardId(newCard.id)
            setShowQuickCard(false)
          }} 
        />
      )}

      <ConfirmDialog 
        isOpen={showConfirmUndo}
        title="Estornar Pagamento"
        description="Essa ação vai devolver o valor para a conta usada no pagamento e transformar a despesa em pendente. Deseja continuar?"
        onConfirm={handleUndoPayment}
        onCancel={() => setShowConfirmUndo(false)}
      />
    </>,
    document.body
  )
}
