import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, Tag, Upload, AlertCircle } from 'lucide-react'
import { CustomDatePicker } from '@/components/ui/CustomDatePicker'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { QuickCategoryModal, QuickAccountModal } from '@/components/ui/QuickModals'
import { addExpense, updateExpense } from '@/app/dashboard/actions/expenses'
import type { Expense, ExpenseCategory, Account, CreditCard as CreditCardType } from '@/types/database'

function formatCurrencyInput(val: string) {
  const digits = val.replace(/\D/g, '')
  if (!digits) return '0,00'
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface PremiumExpenseModalProps {
  expense: Expense | null
  categories: ExpenseCategory[]
  accounts: Account[]
  creditCards: CreditCardType[]
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
    if (expense) return formatCurrencyInput(String(expense.amount))
    return ''
  })
  
  const getToday = () => new Date().toISOString().split('T')[0]
  const getYesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0] }
  
  const [date, setDate] = useState(() => {
    if (expense?.date) return expense.date
    return getToday()
  })
  
  const [category, setCategory] = useState(expense?.category ?? categories[0]?.name ?? 'Outros')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [expenseType, setExpenseType] = useState<'fixed' | 'variable'>(expense?.expense_type ?? 'variable')
  
  const [paidAccountId, setPaidAccountId] = useState(expense?.paid_account_id ?? '')
  const [paymentMethod, setPaymentMethod] = useState(expense?.payment_method ?? '')
  const [paidAt, setPaidAt] = useState(expense?.paid_at ?? date)
  
  const [fundingSource, setFundingSource] = useState(() => {
    if (expense?.credit_card_id) return `card:${expense.credit_card_id}`
    if (expense?.account_id) return `account:${expense.account_id}`
    return ''
  })

  const isCard = fundingSource.startsWith('card:')
  const [paymentStatus, setPaymentStatus] = useState(expense?.payment_status ?? false)

  const [repeatType, setRepeatType] = useState<'single' | 'recurring' | 'installments'>(expense?.is_recurring ? 'recurring' : (expense?.installments_total && expense.installments_total > 1 ? 'installments' : 'single'))
  const [installmentsTotal, setInstallmentsTotal] = useState(expense?.installments_total ? String(expense.installments_total) : '')
  
  const [tags, setTags] = useState<string[]>(expense?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState(expense?.notes ?? '')
  
  const [showDetails, setShowDetails] = useState((expense?.tags && expense.tags.length > 0) || !!expense?.notes)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const [showQuickCategory, setShowQuickCategory] = useState(false)
  const [showQuickAccount, setShowQuickAccount] = useState(false)

  useEffect(() => {
    if (isCard) {
      setPaymentStatus(false)
      setPaidAccountId('')
      setPaymentMethod('')
    }
  }, [isCard])

  function handleAddTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  function handleSubmit() {
    const cleanAmount = String(amount).replace(/\./g, '').replace(',', '.')
    const amt = parseFloat(cleanAmount)
    if (!amt || amt <= 0) { setError('Informe um valor maior que zero.'); return }
    if (!category) { setError('Selecione uma categoria'); return }
    if (!date) { setError('Informe uma data'); return }
    
    if (paymentStatus) {
      if (isCard) {
        setError('Despesas de cartão não podem ser marcadas como pagas diretamente aqui.')
        return
      }
      if (!paidAccountId) {
         setError('Para despesas pagas, selecione a Conta de origem.')
         return
      }
      if (!paymentMethod) {
         setError('Para despesas pagas, informe a forma de pagamento.')
         return
      }
      if (!paidAt) {
         setError('Informe a data de pagamento real.')
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
    
    if (fundingSource.startsWith('account:')) {
      fd.set('account_id', fundingSource.replace('account:', ''))
    } else if (fundingSource.startsWith('card:')) {
      fd.set('credit_card_id', fundingSource.replace('card:', ''))
    }
    
    fd.set('payment_status', String(paymentStatus))
    if (paymentStatus) {
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
      onSaved()
    })
  }

  const sourceOptions = [
    { value: '', label: 'Selecione...', icon: 'Wallet', color: '#90A4AE' },
    ...accounts.map(a => ({ value: `account:${a.id}`, label: a.name, icon: 'Landmark', color: a.color })),
    ...creditCards.map(c => ({ value: `card:${c.id}`, label: c.name, icon: 'CreditCard', color: c.color })),
    { value: 'NEW', label: '+ Nova conta', icon: 'Plus', color: '#01584C' }
  ]

  const categoryOptions = [
    ...categories.map(c => ({ value: c.name, label: c.name, icon: c.icon, color: c.color })),
    { value: 'NEW', label: '+ Nova categoria', icon: 'Plus', color: '#01584C' }
  ]

  const paidAccountOptions = [
    { value: '', label: 'Selecione a conta...' },
    ...accounts.map(a => ({ value: a.id, label: a.name }))
  ]

  const getPreviewText = () => {
    if (isCard) {
      const card = creditCards.find(c => c.id === fundingSource.replace('card:', ''))
      return `Essa despesa será lançada na fatura do cartão ${card ? card.name : 'selecionado'}.`
    }
    if (repeatType === 'recurring') {
      const monthLabel = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long' })
      return `Esse lançamento será repetido mensalmente a partir de ${monthLabel}.`
    }
    if (!paymentStatus) return 'Essa despesa será criada como pendente.'
    
    const acc = accounts.find(a => a.id === paidAccountId)
    const m = paymentMethod === 'pix' ? 'via Pix' : (paymentMethod === 'debit' ? 'no Débito' : 'da conta')
    return `Será debitado R$ ${amount || '0,00'} da conta ${acc ? acc.name : 'selecionada'} ${m}.`
  }

  const renderInstallmentPreview = () => {
    if (repeatType !== 'installments') return null
    const count = parseInt(installmentsTotal) || 0
    if (count < 2) return null
    
    const val = (parseFloat(String(amount).replace(/\./g, '').replace(',', '.')) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    const baseDate = new Date(date + 'T00:00:00')
    const list = []
    
    for (let i = 1; i <= Math.min(count, 5); i++) {
      const d = new Date(baseDate)
      d.setMonth(d.getMonth() + i - 1)
      const ds = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      list.push(`${i}/${count} — ${ds} — R$ ${val}`)
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
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-box" style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {isEdit ? 'Editar despesa' : 'Nova despesa'}
          </h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '24px 20px', maxHeight: '70vh', overflowY: 'auto' }} className="fd-stack">
          {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--faint)' }}>Valor da Despesa</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--muted)', marginTop: 4 }}>R$</span>
              <input 
                type="text"
                inputMode="numeric"
                placeholder="0,00" 
                value={amount}
                onFocus={() => { if (amount === '0,00') setAmount('') }}
                onBlur={() => { if (!amount) setAmount('0,00') }}
                onChange={e => {
                  const val = e.target.value
                  if (!val) setAmount('')
                  else setAmount(formatCurrencyInput(val))
                }}
                required
                style={{ width: `${Math.max(amount.length, 4)}ch`, maxWidth: '100%', minWidth: 100, fontSize: 40, fontWeight: 900, border: 'none', background: 'transparent', outline: 'none', color: 'var(--neg)', textAlign: 'center', letterSpacing: '-0.02em', padding: 0 }}
              />
            </div>
            
            {isCard ? (
              <div style={{ background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 20, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--orange-ink)', fontSize: 12, fontWeight: 600 }}>
                <AlertCircle size={14} /> Fatura do Cartão
              </div>
            ) : (
              <label style={{ 
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                background: paymentStatus ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-2)',
                padding: '6px 12px', borderRadius: 20, marginTop: 4, transition: 'all 0.2s'
              }}>
                <input 
                  type="checkbox" 
                  checked={paymentStatus} 
                  onChange={e => setPaymentStatus(e.target.checked)} 
                  style={{ width: 16, height: 16, accentColor: 'var(--neg)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: paymentStatus ? 'var(--neg)' : 'var(--faint)' }}>
                  {paymentStatus ? 'Foi paga' : 'Pendente'}
                </span>
              </label>
            )}
          </div>

          <div className="entry-form">
            <label>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Vencimento / Data da despesa <span className="req">*</span></span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" onClick={() => setDate(getYesterday())} style={{ background: date === getYesterday() ? 'var(--line)' : 'transparent', border: '1px solid var(--line)', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, color: 'var(--muted)', cursor: 'pointer' }}>Ontem</button>
                  <button type="button" onClick={() => setDate(getToday())} style={{ background: date === getToday() ? 'var(--line)' : 'transparent', border: '1px solid var(--line)', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, color: 'var(--muted)', cursor: 'pointer' }}>Hoje</button>
                </div>
              </span>
              <CustomDatePicker value={date} onChange={setDate} />
            </label>

            <label>
              <span>Descrição</span>
              <input placeholder="Ex: Mercado" value={description} onChange={e => setDescription(e.target.value)} />
            </label>

            <label>
              <span>Categoria <span className="req">*</span></span>
              <CustomSelect
                options={categoryOptions}
                value={category}
                onChange={val => {
                  if (val === 'NEW') setShowQuickCategory(true)
                  else setCategory(val)
                }}
                placeholder="Selecione..."
              />
            </label>
            
            <label>
              <span>Pagar com (Conta / Cartão)</span>
              <CustomSelect
                options={sourceOptions}
                value={fundingSource}
                onChange={val => {
                  if (val === 'NEW') setShowQuickAccount(true)
                  else {
                    setFundingSource(val)
                    if (val.startsWith('card:')) setPaymentStatus(false)
                  }
                }}
                placeholder="Selecione..."
              />
            </label>

            <label>
              <span>Como lançar?</span>
              <select value={repeatType} onChange={e => setRepeatType(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14, color: 'var(--ink)' }}>
                <option value="single">Só uma vez</option>
                <option value="recurring">Todo mês</option>
                <option value="installments">Parcelado</option>
              </select>
              
              {repeatType === 'installments' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Qtd Parcelas:</span>
                  <input type="number" min="2" max="99" value={installmentsTotal} onChange={e => setInstallmentsTotal(e.target.value)} style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }} placeholder="Ex: 3" />
                </div>
              )}
            </label>
            
            {renderInstallmentPreview()}

            <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <button 
                type="button" 
                onClick={() => setShowDetails(!showDetails)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink)' }}
              >
                <span style={{ fontSize: 14, fontWeight: 700 }}>{showDetails ? 'Menos detalhes' : 'Mais detalhes'}</span>
                <ChevronDown size={18} style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {showDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                  
                  {paymentStatus && !isCard && (
                    <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--neg)' }}>Baixa do Pagamento</div>
                      
                      <label>
                        <span style={{ fontSize: 12, color: 'var(--neg)' }}>Data que foi pago *</span>
                        <CustomDatePicker value={paidAt} onChange={setPaidAt} />
                      </label>
                      
                      <div style={{ display: 'flex', gap: 12 }}>
                        <label style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, color: 'var(--neg)' }}>Conta de origem *</span>
                          <select value={paidAccountId} onChange={e => setPaidAccountId(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.2)', background: 'var(--surface)' }}>
                            {paidAccountOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </label>
                        <label style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, color: 'var(--neg)' }}>Forma de pago *</span>
                          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.2)', background: 'var(--surface)' }}>
                            <option value="">Selecione...</option>
                            <option value="pix">PIX</option>
                            <option value="debit">Débito</option>
                            <option value="transfer">Transferência</option>
                            <option value="boleto">Boleto</option>
                            <option value="cash">Dinheiro</option>
                            <option value="other">Outros</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  )}

                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Tipo de Despesa</span>
                    <select value={expenseType} onChange={e => setExpenseType(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14, color: 'var(--ink)' }}>
                      <option value="variable">Variável</option>
                      <option value="fixed">Fixa</option>
                    </select>
                  </label>

                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Tags</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {tags.map(t => (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--surface-2)', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                          <Tag size={12} style={{ color: 'var(--muted)' }} />
                          {t}
                          <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--faint)' }}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" placeholder="Adicionar tag (ex: carro)" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)' }} />
                      <button type="button" onClick={handleAddTag} className="btn-secondary" style={{ padding: '0 16px' }}>Add</button>
                    </div>
                  </label>

                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Observação (opcional)</span>
                    <textarea placeholder="Algum detalhe adicional..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)' }} />
                  </label>

                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Anexar arquivo</span>
                    <button type="button" disabled style={{ width: '100%', padding: '16px', background: 'var(--surface-2)', border: '1px dashed var(--line-soft)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'not-allowed', color: 'var(--faint)' }}>
                      <Upload size={20} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Anexos estarão disponíveis em breve</span>
                    </button>
                  </label>

                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 16, fontWeight: 600, padding: 8, background: 'var(--surface-2)', borderRadius: 8 }}>
              {getPreviewText()}
            </div>

          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--surface-2)' }}>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" style={{ background: 'var(--orange-ink)' }} onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Salvar Despesa')}
          </button>
        </div>
      </div>
      
      {showQuickCategory && <QuickCategoryModal type="expense" onClose={() => setShowQuickCategory(false)} onSaved={(name) => { setShowQuickCategory(false); setCategory(name) }} />}
      {showQuickAccount && <QuickAccountModal onClose={() => setShowQuickAccount(false)} onSaved={(id) => { setShowQuickAccount(false); setFundingSource(`account:${id}`) }} />}
    </>,
    document.body
  )
}
