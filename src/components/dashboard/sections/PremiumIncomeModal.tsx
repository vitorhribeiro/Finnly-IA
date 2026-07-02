
import { useEffect, useState, useTransition, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, CalendarClock, ChevronDown, CheckCircle2, Search, ArrowDown, Plus, Sparkles, TrendingUp, TrendingDown, Calendar, Wallet, Percent, Pencil, Trash2, Tag, Upload } from 'lucide-react'
import { CustomDatePicker } from '@/components/ui/CustomDatePicker'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { addIncome, updateIncome } from '@/app/dashboard/actions/incomes'
import type { Income, IncomeCategory } from '@/types/database'

function formatCurrencyInput(val: string) {
  const digits = val.replace(/\D/g, '')
  if (!digits) return '0,00'
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Map strings to Lucide components for dynamic icons
const iconMap: Record<string, React.ElementType> = {
  Sparkles, Wallet, Percent, TrendingUp, TrendingDown, Calendar, Plus, CalendarClock
}
function DynIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = iconMap[name] || Sparkles
  return <Icon size={size} />
}

export interface PremiumIncomeModalProps {
  income: Income | null
  defaultValues?: { category?: string; amount?: number; is_recurring?: boolean }
  categories: IncomeCategory[]
  onClose: () => void
  onSaved: () => void
  onRequestNewCategory: () => void
}

export function PremiumIncomeModal({ income, defaultValues, categories, onClose, onSaved, onRequestNewCategory }: PremiumIncomeModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isEdit = !!income

  const [amount, setAmount] = useState(() => {
    if (income) return formatCurrencyInput(String(income.amount))
    if (defaultValues?.amount) return formatCurrencyInput(String(defaultValues.amount))
    return ''
  })
  const [paymentStatus, setPaymentStatus] = useState(income?.payment_status ?? true)
  
  const [date, setDate] = useState(() => {
    if (income?.date) return income.date
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  
  const [category, setCategory] = useState(
    income?.category ?? defaultValues?.category ?? categories[0]?.name ?? 'Outros'
  )
  const [description, setDescription] = useState(income?.description ?? '')
  
  const [incomeType, setIncomeType] = useState<'fixed' | 'variable'>(income?.income_type ?? 'variable')
  
  const [repeatType, setRepeatType] = useState<'single' | 'recurring' | 'installments'>('single')
  const [installmentsTotal, setInstallmentsTotal] = useState('')
  
  useEffect(() => {
    if (income) {
      if (income.is_recurring) setRepeatType('recurring')
      else if (income.installments_total && income.installments_total > 1) {
        setRepeatType('installments')
        setInstallmentsTotal(String(income.installments_total))
      }
    }
  }, [income])

  const [tags, setTags] = useState<string[]>(income?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState(income?.notes ?? '')
  
  const [showDetails, setShowDetails] = useState((income?.tags && income.tags.length > 0) || !!income?.notes || income?.income_type === 'fixed' || (income?.is_recurring || (income?.installments_total && income.installments_total > 1)))
  
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

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
    
    if (repeatType === 'recurring') {
      fd.set('is_recurring', 'true')
    } else if (repeatType === 'installments') {
      fd.set('installments_total', installmentsTotal)
    }
    
    if (tags.length > 0) {
      tags.forEach(t => fd.append('tags', t))
    }
    
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

  return createPortal(
    <>
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-box" style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {isEdit ? 'Editar receita' : 'Nova receita'}
          </h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
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
            
            {/* STATUS PAGO/RECEBIDO */}
            <label style={{ 
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              background: paymentStatus ? 'rgba(40, 167, 69, 0.1)' : 'var(--surface-2)',
              padding: '6px 12px', borderRadius: 20, marginTop: 4, transition: 'all 0.2s'
            }}>
              <input 
                type="checkbox" 
                checked={paymentStatus} 
                onChange={e => setPaymentStatus(e.target.checked)} 
                style={{ width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: paymentStatus ? 'var(--green)' : 'var(--faint)' }}>
                {paymentStatus ? 'Recebido' : 'Pendente'}
              </span>
            </label>
          </div>

          <div className="entry-form">
            <label>
              <span>Descrição</span>
              <input placeholder="Ex: Salário" value={description} onChange={e => setDescription(e.target.value)} />
            </label>

            <label>
              <span>Categoria <span className="req">*</span></span>
              <CustomSelect
                options={categories.map(c => ({ value: c.name, label: c.name, icon: c.icon, color: c.color }))}
                value={category}
                onChange={val => setCategory(val)}
                placeholder="Selecione..."
              />
              <button 
                type="button" 
                onClick={onRequestNewCategory}
                style={{ background: 'none', border: 'none', color: 'var(--teal)', fontWeight: 700, fontSize: 13, marginTop: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> Criar nova categoria
              </button>
            </label>

            <label>
              <span>Data <span className="req">*</span></span>
              <CustomDatePicker value={date} onChange={setDate} />
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
                  
                  {/* TIPO */}
                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Tipo de Receita</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: incomeType === 'fixed' ? 'rgba(1, 88, 76, 0.1)' : 'var(--surface-2)', border: `1px solid ${incomeType === 'fixed' ? 'var(--teal)' : 'transparent'}`, borderRadius: 10, cursor: 'pointer', color: incomeType === 'fixed' ? 'var(--teal)' : 'var(--muted)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}>
                        <input type="radio" name="incomeType" checked={incomeType === 'fixed'} onChange={() => setIncomeType('fixed')} style={{ display: 'none' }} />
                        Receita Fixa
                      </label>
                      <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: incomeType === 'variable' ? 'rgba(1, 88, 76, 0.1)' : 'var(--surface-2)', border: `1px solid ${incomeType === 'variable' ? 'var(--teal)' : 'transparent'}`, borderRadius: 10, cursor: 'pointer', color: incomeType === 'variable' ? 'var(--teal)' : 'var(--muted)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}>
                        <input type="radio" name="incomeType" checked={incomeType === 'variable'} onChange={() => setIncomeType('variable')} style={{ display: 'none' }} />
                        Receita Variável
                      </label>
                    </div>
                  </label>

                  {/* REPETIR */}
                  <label>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Como lançar?</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <select value={repeatType} onChange={e => setRepeatType(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14, color: 'var(--ink)' }}>
                        <option value="single">Só desta vez</option>
                        <option value="recurring">Recorrente (todo mês)</option>
                        <option value="installments">Parcelado</option>
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
                        placeholder="Adicionar tag (ex: extra)" 
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
            {isPending ? 'Salvando…' : (isEdit ? 'Salvar alterações' : 'Salvar receita')}
          </button>
        </div>

      </div>
    </>,
    document.body
  )
}
