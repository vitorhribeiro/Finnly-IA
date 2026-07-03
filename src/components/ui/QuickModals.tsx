import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { createIncomeCategory } from '@/app/dashboard/actions/income-categories'
import { createExpenseCategory } from '@/app/dashboard/actions/expense-categories'
import { createAccount } from '@/app/dashboard/actions/accounts'
import { createCreditCard } from '@/app/dashboard/actions/credit-cards'
import type { IncomeCategory, ExpenseCategory, Account, CreditCard } from '@/types/database'

// -- QUICK CATEGORY MODAL --
export function QuickCategoryModal({ 
  type, 
  onClose, 
  onSaved 
}: { 
  type: 'income' | 'expense'
  onClose: () => void
  onSaved: (category: IncomeCategory | ExpenseCategory) => void 
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#01584C')
  const icon = 'Tag'
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const colors = ['#01584C', '#F57C00', '#28A745', '#0288D1', '#7B1FA2', '#B9842F', '#E53935']

  async function handleSave() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', name.trim())
      fd.set('color', color)
      fd.set('icon', icon)

      const res = type === 'income' 
        ? await createIncomeCategory(fd)
        : await createExpenseCategory(fd)
      
      if (res && 'error' in res && res.error) { 
        setError(res.error)
        return 
      }
      if (res && 'category' in res && res.category) {
        onSaved(res.category)
      }
    })
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={isPending ? undefined : onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: 'var(--surface)', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Nova Categoria</h3>
          <button className="icon-btn" onClick={onClose} disabled={isPending}><X size={18} /></button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Nome</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Mercado" disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4 }} />
        </label>
        
        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Cor</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {colors.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} disabled={isPending} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn-ghost" onClick={onClose} disabled={isPending}>Cancelar</button>
          <button className="btn-primary" style={{ background: type === 'income' ? 'var(--teal)' : 'var(--orange)' }} onClick={handleSave} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// -- QUICK ACCOUNT MODAL --
export function QuickAccountModal({ 
  onClose, 
  onSaved 
}: { 
  onClose: () => void
  onSaved: (account: Account) => void 
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState('corrente')
  const [balance, setBalance] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    const initialBalance = parseFloat(balance.replace(',', '.')) || 0
    setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', name.trim())
      fd.set('type', type)
      fd.set('balance', String(initialBalance))
      fd.set('color', '#01584C')

      const res = await createAccount(fd)
      if (res && 'error' in res && res.error) { 
        setError(res.error)
        return 
      }
      if (res && 'account' in res && res.account) {
        onSaved(res.account)
      }
    })
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={isPending ? undefined : onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: 'var(--surface)', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Nova Conta</h3>
          <button className="icon-btn" onClick={onClose} disabled={isPending}><X size={18} /></button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Nome da conta</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank" disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4 }} />
        </label>

        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Tipo</span>
          <select value={type} onChange={e => setType(e.target.value)} disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4, background: 'var(--surface)', fontSize: 13, color: 'var(--ink)' }}>
            <option value="corrente">Corrente</option>
            <option value="poupanca">Poupança</option>
            <option value="investimento">Investimento</option>
            <option value="carteira">Carteira</option>
            <option value="outros">Outros</option>
          </select>
        </label>
        
        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Saldo inicial</span>
          <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4 }} />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn-ghost" onClick={onClose} disabled={isPending}>Cancelar</button>
          <button className="btn-primary" style={{ background: 'var(--teal)' }} onClick={handleSave} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// -- QUICK CREDIT CARD MODAL --
export function QuickCardModal({ 
  onClose, 
  onSaved 
}: { 
  onClose: () => void
  onSaved: (card: CreditCard) => void 
}) {
  const [name, setName] = useState('')
  const [limit, setLimit] = useState('')
  const [closingDay, setClosingDay] = useState('5')
  const [dueDay, setDueDay] = useState('12')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    const limitNum = parseFloat(limit.replace(',', '.')) || 0
    if (limitNum <= 0) { setError('Informe um limite maior que zero'); return }

    const closingNum = parseInt(closingDay, 10)
    const dueNum = parseInt(dueDay, 10)
    if (isNaN(closingNum) || closingNum < 1 || closingNum > 31) { setError('Dia de fechamento deve ser entre 1 e 31'); return }
    if (isNaN(dueNum) || dueNum < 1 || dueNum > 31) { setError('Dia de vencimento deve ser entre 1 e 31'); return }

    setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', name.trim())
      fd.set('limit', String(limitNum))
      fd.set('closing_day', String(closingNum))
      fd.set('due_day', String(dueNum))
      fd.set('color', '#B9842F')

      const res = await createCreditCard(fd)
      if (res && 'error' in res && res.error) { 
        setError(res.error)
        return 
      }
      if (res && 'card' in res && res.card) {
        onSaved(res.card)
      }
    })
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={isPending ? undefined : onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: 'var(--surface)', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Novo Cartão</h3>
          <button className="icon-btn" onClick={onClose} disabled={isPending}><X size={18} /></button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Nome do cartão</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nu Ultravioleta" disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4 }} />
        </label>
        
        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Limite</span>
          <input type="number" step="0.01" value={limit} onChange={e => setLimit(e.target.value)} placeholder="0.00" disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4 }} />
        </label>

        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Fechamento</span>
            <input type="number" min="1" max="31" value={closingDay} onChange={e => setClosingDay(e.target.value)} placeholder="5" disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4 }} />
          </label>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Vencimento</span>
            <input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} placeholder="12" disabled={isPending} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4 }} />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn-ghost" onClick={onClose} disabled={isPending}>Cancelar</button>
          <button className="btn-primary" style={{ background: 'var(--orange-ink)' }} onClick={handleSave} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
