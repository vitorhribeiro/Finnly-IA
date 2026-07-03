import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

// -- QUICK CATEGORY MODAL --
export function QuickCategoryModal({ type, onClose, onSaved }: { type: 'income' | 'expense'; onClose: () => void; onSaved: (name: string) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#01584C')
  const [icon, setIcon] = useState('Tag')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const colors = ['#01584C', '#F57C00', '#28A745', '#0288D1', '#7B1FA2', '#B9842F', '#E53935']

  async function handleSave() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setError('')
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const table = type === 'income' ? 'income_categories' : 'expense_categories'
      const { data, error } = await supabase.from(table).insert({
        user_id: user.id,
        name: name.trim(),
        color,
        icon,
        is_default: false
      }).select().single()
      
      if (error) { setError(error.message); return }
      if (data) onSaved(data.name)
    })
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: 'var(--surface)', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Nova Categoria</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Nome</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Mercado" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4 }} />
        </label>
        
        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Cor</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {colors.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" style={{ background: type === 'income' ? 'var(--teal)' : 'var(--orange)' }} onClick={handleSave} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// -- QUICK ACCOUNT MODAL --
export function QuickAccountModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: name.trim(),
        type,
        balance: initialBalance,
        initial_balance: initialBalance,
        color: '#01584C'
      }).select().single()
      
      if (error) { setError(error.message); return }
      if (data) onSaved(data.id)
    })
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: 'var(--surface)', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Nova Conta</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Nome da conta</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4 }} />
        </label>
        
        <label>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Saldo atual</span>
          <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', marginTop: 4 }} />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" style={{ background: 'var(--teal)' }} onClick={handleSave} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
