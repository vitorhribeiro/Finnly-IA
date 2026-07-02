
import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X, CalendarClock, ChevronDown, Plus, CreditCard, Banknote, Landmark, Wallet, Upload, Tag, Search, ArrowUp } from 'lucide-react'
import { CustomDatePicker } from '@/components/ui/CustomDatePicker'
import { CustomSelect } from '@/components/ui/CustomSelect'
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

  const isEdit = !!expense

  const [amount, setAmount] = useState(() => {
    if (expense) return formatCurrencyInput(String(expense.amount))
    return ''
  })
  const [paymentStatus, setPaymentStatus] = useState(expense?.payment_status ?? false)
  
  const [date, setDate] = useState(() => {
    if (expense?.date) return expense.date
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  
  const [category, setCategory] = useState(expense?.category ?? categories[0]?.name ?? 'Outros')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [expenseType, setExpenseType] = useState<'fixed' | 'variable'>(expense?.expense_type ?? 'variable')
  
  // Payment Details
  const [paidAccountId, setPaidAccountId] = useState(expense?.paid_account_id ?? '')
  const [paymentMethod, setPaymentMethod] = useState(expense?.payment_method ?? '')
  const [paidAt, setPaidAt] = useState(expense?.paid_at ?? date)
  
  // Funding source (Conta ou Cartão)
  const [fundingSource, setFundingSource] = useState(() => {
    if (expense?.credit_card_id) return `card:${expense.credit_card_id}`
    if (expense?.account_id) return `account:${expense.account_id}`
    return ''
  })

  const [repeatType, setRepeatType] = useState<'single' | 'installments'>('single')
  const [installmentsTotal, setInstallmentsTotal] = useState('')
  
  useEffect(() => {
    if (expense?.installments_total && expense.installments_total > 1) {
      setRepeatType('installments')
      setInstallmentsTotal(String(expense.installments_total))
    }
  }, [expense])

  const [tags, setTags] = useState<string[]>(expense?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState(expense?.notes ?? '')
  
  const [showDetails, setShowDetails] = useState((expense?.tags && expense.tags.length > 0) || !!expense?.notes || expense?.expense_type === 'fixed' || (expense?.installments_total && expense.installments_total > 1) || paymentStatus)
  
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Sync paid_at with date if not explicitly set
  useEffect(() => {
    if (paymentStatus && !expense?.paid_at) {
      setPaidAt(date)
    }
  }, [paymentStatus, date, expense])

  function handleAddTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  function handleRemoveTag(t: string) {
    setTags(tags.filter(x => x !== t))
  }

  function handleSubmit() {
    const cleanAmount = String(amount).replace(/\./g, '').replace(',', '.')
    const amt = parseFloat(cleanAmount)
    if (!amt || amt <= 0) { setError('Informe um valor válido'); return }
    if (!category) { setError('Selecione uma categoria'); return }
    if (!date) { setError('Informe uma data'); return }
    
    if (paymentStatus) {
      if (!fundingSource.startsWith('account:') && !fundingSource.startsWith('card:')) {
         setError('Para despesas pagas, é obrigatório informar a Conta de pagamento.')
         return
      }
      if (!paidAt) {
         setError('Informe a data de pagamento da despesa.')
         return
      }
      // If paymentMethod is empty but it's paid from an account, default to 'other'
      if (fundingSource.startsWith('account:') && !paymentMethod) {
         setPaymentMethod('other')
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
      if (fundingSource.startsWith('account:')) {
        fd.set('paid_account_id', fundingSource.replace('account:', ''))
        fd.set('payment_method', paymentMethod || 'other')
      }
    }
    
    if (repeatType === 'installments') {
      fd.set('installments_total', installmentsTotal)
    }
    
    if (tags.length > 0) {
      tags.forEach(t => fd.append('tags', t))
    }
    
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

  // Combine accounts and cards for funding source
  const sourceOptions = [
    { value: '', label: 'Selecione...', icon: 'Wallet', color: '#90A4AE' },
    ...accounts.map(a => ({ value: `account:${a.id}`, label: a.name, icon: 'Landmark', color: a.color })),
    ...creditCards.map(c => ({ value: `card:${c.id}`, label: c.name, icon: 'CreditCard', color: c.color }))
  ]

  return createPortal(
    <>
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-box" style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {isEdit ? 'Editar despesa' : 'Nova despesa'}
          </h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* BODY */}
        <div style={{ padding: '24px 20px', maxHeight: '70vh', overflowY: 'auto' }} className="fd-stack">
          {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* VALOR NO TOPO */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--faint)' }}>Valor da Despesa</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--muted)', marginTop: 4 }}>R$</span>
              <input 
                type="tel"
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
                style={{ width: `${Math.max(amount.length, 4)}ch`, maxWidth: '100%', minWidth: 100, fontSize: 40, fontWeight: 900, border: 'none', background: 'transparent', outline: 'none', color: 'var(--ink)', textAlign: 'center', letterSpacing: '-0.02em', padding: 0 }}
              />
            </div>
            
            {/* STATUS PAGO/PENDENTE */}
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
                {paymentStatus ? 'Pago' : 'Pendente'}
              </span>
            </label>
          </div>

          <div className="entry-form">
            <label>
              <span>Descrição</span>
              <input placeholder="Ex: Mercado" value={description} onChange={e => setDescription(e.target.value)} />
            </label>

            <label>
              <span>Categoria <span className="req">*</span></span>
              <CustomSelect
                options={categories.map(c => ({ value: c.name, label: c.name, icon: c.icon, color: c.color }))}
                value={category}
                onChange={val => setCategory(val)}
                placeholder="Selecione..."
              />
            </label>

            <label>
              <span>Data da Despesa <span className="req">*</span></span>
              <CustomDatePicker value={date} onChange={setDate} />
            </label>
            
            <label>
              <span>Conta / Cartão</span>
              <CustomSelect
                options={sourceOptions}
                value={fundingSource}
                onChange={val => {
                  setFundingSource(val)
                  // Auto-switch payment status based on selection
                  if (val.startsWith('card:')) setPaymentStatus(false)
                }}
                placeholder="Selecione..."
              />
            </label>

            {/* SANFONA MAIS DETALHES */}
            <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <button 
                type="button" 
                onClick={() => setShowDetails(!showDetails)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink)' }}
              >
                <span style={{ fontSize: 14, fontWeight: 700 }}>Mais detalhes</span>
                <ChevronDown size={18} style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {showDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                  
                  {/* PAGAMENTO DETALHES (Se estiver pago) */}
                  {paymentStatus && (
                    <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Detalhes do Pagamento</div>
                      <label>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Data que foi pago</span>
                        <CustomDatePicker value={paidAt} onChange={setPaidAt} />
                      </label>
                      {fundingSource.startsWith('account:') && (
                        <label>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Forma de pagamento</span>
                          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)' }}>
                            <option value="">Selecione...</option>
                            <option value="pix">PIX</option>
                            <option value="debit">Cartão de Débito</option>
                            <option value="transfer">Transferência</option>
                            <option value="boleto">Boleto</option>
                            <option value="cash">Dinheiro</option>
                            <option value="other">Outro</option>
                          </select>
                        </label>
                      )}
                    </div>
                  )}

                  {/* TIPO */}
                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Tipo de Despesa</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: expenseType === 'fixed' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-2)', border: `1px solid ${expenseType === 'fixed' ? 'var(--neg)' : 'transparent'}`, borderRadius: 10, cursor: 'pointer', color: expenseType === 'fixed' ? 'var(--neg)' : 'var(--muted)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}>
                        <input type="radio" name="expenseType" checked={expenseType === 'fixed'} onChange={() => setExpenseType('fixed')} style={{ display: 'none' }} />
                        Despesa Fixa
                      </label>
                      <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: expenseType === 'variable' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-2)', border: `1px solid ${expenseType === 'variable' ? 'var(--neg)' : 'transparent'}`, borderRadius: 10, cursor: 'pointer', color: expenseType === 'variable' ? 'var(--neg)' : 'var(--muted)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}>
                        <input type="radio" name="expenseType" checked={expenseType === 'variable'} onChange={() => setExpenseType('variable')} style={{ display: 'none' }} />
                        Despesa Variável
                      </label>
                    </div>
                  </label>

                  {/* REPETIR */}
                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Como lançar?</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <select value={repeatType} onChange={e => setRepeatType(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14, color: 'var(--ink)' }}>
                        <option value="single">Só desta vez</option>
                        <option value="installments">Parcelado (Cartão)</option>
                      </select>
                      
                      {repeatType === 'installments' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Em quantas vezes?</span>
                          <input type="number" min="2" max="99" value={installmentsTotal} onChange={e => setInstallmentsTotal(e.target.value)} style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }} placeholder="Ex: 3" />
                        </div>
                      )}
                    </div>
                  </label>

                  {/* TAGS */}
                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Tags</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {tags.map(t => (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--surface-2)', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                          <Tag size={12} style={{ color: 'var(--muted)' }} />
                          {t}
                          <button type="button" onClick={() => handleRemoveTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--faint)' }}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="text" 
                        placeholder="Adicionar tag (ex: carro)" 
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                        style={{ flex: 1 }}
                      />
                      <button type="button" onClick={handleAddTag} className="btn-secondary" style={{ padding: '0 16px' }}>Add</button>
                    </div>
                  </label>

                  {/* OBSERVAÇÃO */}
                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Observação (opcional)</span>
                    <textarea 
                      placeholder="Algum detalhe adicional..." 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                    />
                  </label>

                  {/* ANEXOS */}
                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Comprovante</span>
                    <button type="button" disabled style={{ width: '100%', padding: '16px', background: 'var(--surface-2)', border: '1px dashed var(--line-soft)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'not-allowed', color: 'var(--faint)' }}>
                      <Upload size={20} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Anexos estarão disponíveis em breve</span>
                    </button>
                  </label>

                </div>
              )}
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--surface-2)' }}>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary btn-orange" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Salvando…' : (isEdit ? 'Salvar alterações' : 'Salvar despesa')}
          </button>
        </div>

      </div>
    </>,
    document.body
  )
}
