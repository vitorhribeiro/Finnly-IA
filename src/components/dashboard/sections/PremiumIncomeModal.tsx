import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, Tag, Upload } from 'lucide-react'
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
}

export function PremiumIncomeModal({ income, categories, accounts, onClose, onSaved }: PremiumIncomeModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isEdit = !!income && !!income.id

  const [amount, setAmount] = useState(() => {
    if (income) return formatCurrencyInput(String(income.amount))
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
  
  const [showDetails, setShowDetails] = useState((income?.tags && income.tags.length > 0) || !!income?.notes)
  
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Quick modals
  const [showQuickCategory, setShowQuickCategory] = useState(false)
  const [showQuickAccount, setShowQuickAccount] = useState(false)

  // Options
  const accountOptions = [
    { value: '', label: 'Selecione...', icon: 'Wallet', color: '#90A4AE' },
    ...localAccounts.map(a => ({ value: a.id, label: a.name, icon: 'Landmark', color: a.color })),
    { value: '__new_account__', label: '+ Nova conta', icon: 'Plus', color: '#01584C' }
  ]

  const categoryOptions = [
    ...localCategories.map(c => ({ value: c.name, label: c.name, icon: c.icon, color: c.color })),
    { value: '__new_category__', label: '+ Nova categoria', icon: 'Plus', color: '#01584C' }
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
      onSaved()
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
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-box" style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {isEdit ? 'Editar receita' : 'Nova receita'}
          </h3>
          <button className="icon-btn" onClick={onClose} disabled={isPending}><X size={18} /></button>
        </div>

        {/* BODY */}
        <div style={{ padding: '24px 20px', maxHeight: '70vh', overflowY: 'auto' }} className="fd-stack">
          {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* VALOR NO TOPO */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--faint)' }}>Valor da Receita</span>
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
                style={{ width: `${Math.max(amount.length, 4)}ch`, maxWidth: '100%', minWidth: 100, fontSize: 40, fontWeight: 900, border: 'none', background: 'transparent', outline: 'none', color: 'var(--teal)', textAlign: 'center', letterSpacing: '-0.02em', padding: 0 }}
              />
            </div>
            
            <label style={{ 
              display: 'flex', alignItems: 'center', gap: 8, cursor: isPending ? 'default' : 'pointer',
              background: paymentStatus ? 'rgba(4, 120, 87, 0.1)' : 'var(--surface-2)',
              padding: '6px 12px', borderRadius: 20, marginTop: 4, transition: 'all 0.2s'
            }}>
              <input 
                type="checkbox" 
                checked={paymentStatus} 
                onChange={e => setPaymentStatus(e.target.checked)} 
                disabled={isPending}
                style={{ width: 16, height: 16, accentColor: 'var(--teal)', cursor: isPending ? 'default' : 'pointer' }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: paymentStatus ? 'var(--teal)' : 'var(--faint)' }}>
                {paymentStatus ? 'Recebido' : 'Pendente'}
              </span>
            </label>
          </div>

          <div className="entry-form">
            
            <label>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span>Data prevista <span className="req">*</span></span>
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
                    borderColor: isToday ? 'var(--teal)' : 'var(--border)',
                    background: isToday ? 'rgba(1, 88, 76, 0.08)' : 'var(--surface-2)',
                    color: isToday ? 'var(--teal)' : 'var(--muted)',
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
                    borderColor: isYesterday ? 'var(--teal)' : 'var(--border)',
                    background: isYesterday ? 'rgba(1, 88, 76, 0.08)' : 'var(--surface-2)',
                    color: isYesterday ? 'var(--teal)' : 'var(--muted)',
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
                      borderColor: isOther ? 'var(--teal)' : 'var(--border)',
                      background: isOther ? 'rgba(1, 88, 76, 0.08)' : 'var(--surface-2)',
                      color: isOther ? 'var(--teal)' : 'var(--muted)',
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
            </label>

            <label>
              <span>Descrição</span>
              <input placeholder="Ex: Salário" value={description} onChange={e => setDescription(e.target.value)} disabled={isPending} />
            </label>

            <label>
              <span>Categoria <span className="req">*</span></span>
              <CustomSelect
                options={categoryOptions}
                value={category}
                onChange={val => {
                  if (val === '__new_category__') setShowQuickCategory(true)
                  else setCategory(val)
                }}
                placeholder="Selecione..."
              />
            </label>

            <label>
              <span>Conta de destino {paymentStatus && <span className="req">*</span>}</span>
              <CustomSelect
                options={accountOptions}
                value={accountId}
                onChange={val => {
                  if (val === '__new_account__') setShowQuickAccount(true)
                  else setAccountId(val)
                }}
                placeholder="Selecione..."
              />
            </label>

            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1 }}>
                <span>Tipo de entrada</span>
                <select value={incomeType} onChange={e => setIncomeType(e.target.value as 'fixed' | 'variable')} disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  <option value="variable">Variável</option>
                  <option value="fixed">Fixa</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>
                  {incomeType === 'fixed' 
                    ? 'Fixa: salário, aluguel recebido ou contrato mensal.' 
                    : 'Variável: freela, venda, bônus ou pix avulso.'}
                </div>
              </label>

              <label style={{ flex: 1 }}>
                <span>Forma de recebimento</span>
                <select value={incomeMethod} onChange={e => setIncomeMethod(e.target.value)} disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  <option value="">Não informado</option>
                  <option value="pix">Pix</option>
                  <option value="transfer">Transferência</option>
                  <option value="cash">Dinheiro</option>
                  <option value="boleto">Boleto</option>
                  <option value="deposit">Depósito</option>
                  <option value="card">Cartão</option>
                  <option value="other">Outros</option>
                </select>
              </label>
            </div>

            <label>
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
            </label>
            
            {renderInstallmentPreview()}

            {/* SANFONA MAIS DETALHES */}
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
                  {/* TAGS */}
                  <label>
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
                      <input 
                        type="text" 
                        placeholder="Adicionar tag (ex: extra)" 
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                        disabled={isPending}
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', color: 'var(--ink)' }}
                      />
                      <button type="button" onClick={handleAddTag} disabled={isPending} className="btn-secondary" style={{ padding: '0 16px' }}>Add</button>
                    </div>
                  </label>

                  {/* OBSERVAÇÃO */}
                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Observação (opcional)</span>
                    <textarea placeholder="Algum detalhe adicional..." value={notes} onChange={e => setNotes(e.target.value)} disabled={isPending} rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--surface)' }} />
                  </label>

                  {/* ANEXOS */}
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
            
            <div style={{ fontSize: 12, color: 'var(--teal)', textAlign: 'center', marginTop: 16, fontWeight: 700, padding: '10px 14px', background: 'rgba(4, 120, 87, 0.05)', borderRadius: 12, border: '1px solid rgba(4, 120, 87, 0.1)' }}>
              {getPreviewText()}
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--surface-2)' }}>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={isPending}>Cancelar</button>
          <button type="button" className="btn-primary" style={{ background: 'var(--teal)' }} onClick={handleSubmit} disabled={isPending}>
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
