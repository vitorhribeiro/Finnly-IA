'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Trash2, CreditCard as CardIcon, X, Calendar, Wallet, Check, Landmark, ArrowUp } from 'lucide-react'
import { getCreditCards, createCreditCard, deleteCreditCard, payCreditCardInvoice } from '@/app/dashboard/actions/credit-cards'
import { getAccounts } from '@/app/dashboard/actions/accounts'
import { getAllExpenses } from '@/app/dashboard/actions/expenses'
import type { CreditCard, Account, Expense } from '@/types/database'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const COLOR_OPTIONS = [
  '#B9842F', // Bronze
  '#7C3AED', // Purple
  '#2563EB', // Blue
  '#10B981', // Emerald
  '#EF4444', // Red
  '#1E293B', // Slate
]

export function CartoesSection({ hidden }: { hidden: boolean }) {
  const [cards, setCards] = useState<(CreditCard & { currentInvoice: number })[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddCard, setShowAddCard] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Form de cartão
  const [name, setName] = useState('')
  const [limit, setLimit] = useState('')
  const [closingDay, setClosingDay] = useState('5')
  const [dueDay, setDueDay] = useState('12')
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0])

  // Form de pagamento de fatura
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')

  async function loadData() {
    setLoading(true)
    const [cardsData, accountsData, expensesData] = await Promise.all([
      getCreditCards(),
      getAccounts(),
      getAllExpenses()
    ])
    setCards(cardsData)
    setAccounts(accountsData)
    setAllExpenses(expensesData as Expense[])

    if (cardsData.length > 0 && !selectedCardId) {
      setSelectedCardId(cardsData[0].id)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function handleSaveCard(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome do cartão é obrigatório'); return }
    const limitVal = parseFloat(limit.replace(',', '.'))
    if (isNaN(limitVal) || limitVal <= 0) { setError('Digite um limite válido'); return }

    const fd = new FormData()
    fd.set('name', name.trim())
    fd.set('limit', limit)
    fd.set('closing_day', closingDay)
    fd.set('due_day', dueDay)
    fd.set('color', selectedColor)

    startTransition(async () => {
      const res = await createCreditCard(fd)
      if (res && 'error' in res) {
        setError(res.error || 'Erro ao criar cartão')
      } else {
        setShowAddCard(false)
        await loadData()
      }
    })
  }

  function handleDeleteCard(id: string) {
    if (!confirm('Deseja realmente excluir este cartão de crédito? Isso apagará todas as despesas não pagas atreladas a ele.')) return
    startTransition(async () => {
      await deleteCreditCard(id)
      setSelectedCardId(null)
      await loadData()
    })
  }

  function openPayment() {
    const card = cards.find(c => c.id === selectedCardId)
    if (!card) return
    if (card.currentInvoice <= 0) {
      alert('Esta fatura já está zerada!')
      return
    }
    if (accounts.length === 0) {
      alert('Você precisa cadastrar uma conta bancária antes de pagar faturas.')
      return
    }
    setSourceAccountId(accounts[0]?.id || '')
    setPaymentAmount(String(card.currentInvoice))
    setError('')
    setShowPayModal(true)
  }

  function handleSavePayment(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(paymentAmount.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) { setError('Digite um valor de pagamento válido'); return }
    if (!selectedCardId) return

    startTransition(async () => {
      const res = await payCreditCardInvoice(selectedCardId, sourceAccountId, amt)
      if (res && 'error' in res) {
        setError(res.error || 'Erro ao efetuar pagamento')
      } else {
        setShowPayModal(false)
        await loadData()
      }
    })
  }

  const selectedCard = cards.find(c => c.id === selectedCardId)
  
  // Despesas atreladas a esse cartão na fatura aberta (payment_status === false)
  const cardExpenses = allExpenses.filter(e => 
    e.credit_card_id === selectedCardId && e.payment_status === false
  )

  const availableLimit = selectedCard ? Math.max(0, Number(selectedCard.limit) - selectedCard.currentInvoice) : 0
  const limitPct = selectedCard ? Math.min(100, Math.round((selectedCard.currentInvoice / Number(selectedCard.limit)) * 100)) : 0

  return (
    <div className="fd-stack fade-up">
      <div className="topbar-inline" style={{ justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={() => {
          setName('')
          setLimit('')
          setClosingDay('5')
          setDueDay('12')
          setSelectedColor(COLOR_OPTIONS[0])
          setError('')
          setShowAddCard(true)
        }}>
          <Plus size={18} /> Novo cartão
        </button>
      </div>

      <div className="fd-grid">
        <div className="col-4 col-sm-12">
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card-title">Selecione o cartão</div>
            {loading ? (
              <p className="empty-msg">Carregando...</p>
            ) : cards.length === 0 ? (
              <p className="empty-msg">Nenhum cartão cadastrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cards.map(c => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCardId(c.id)}
                    style={{
                      background: selectedCardId === c.id ? 'var(--surface-2)' : 'transparent',
                      border: selectedCardId === c.id ? `2px solid ${c.color}` : '1px solid var(--border-color)',
                      borderRadius: 14,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border 0.2s, background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 22, borderRadius: 4,
                        background: c.color, display: 'grid', placeItems: 'center',
                        color: '#fff', fontSize: 9, fontWeight: 900
                      }}>
                        FINN
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-900)' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Vence dia {c.due_day}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal-900)' }} className={`tabnums${hidden ? ' priv' : ''}`}>
                        R$ {brl(c.currentInvoice)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>fatura</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {selectedCard && (
          <div className="col-8 col-sm-12">
            <div className="fd-grid">
              <div className="col-12">
                <section className="card" style={{
                  background: `linear-gradient(135deg, ${selectedCard.color}dd, ${selectedCard.color} 90%)`,
                  color: '#fff',
                  borderRadius: 18,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Background overlay design */}
                  <div style={{
                    position: 'absolute', right: '-10%', bottom: '-20%',
                    width: 200, height: 200, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <div style={{ fontSize: 13, opacity: 0.85 }}>Fatura atual em aberto</div>
                      <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4 }} className={`tabnums${hidden ? ' priv' : ''}`}>
                        R$ {brl(selectedCard.currentInvoice)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-primary" onClick={openPayment} style={{
                        background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                        fontSize: 12, padding: '6px 14px', borderRadius: 12
                      }}>
                        Pagar Fatura
                      </button>
                      <button className="icon-btn delete-btn" onClick={() => handleDeleteCard(selectedCard.id)} style={{
                        background: 'rgba(255,68,68,0.25)', color: '#FF7D7D', border: 'none'
                      }} title="Excluir Cartão">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span>Limite utilizado: {limitPct}%</span>
                      <span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(selectedCard.currentInvoice)} / R$ {brl(Number(selectedCard.limit))}</span>
                    </div>
                    <div className="thermometer-bar-container" style={{ background: 'rgba(255,255,255,0.2)' }}>
                      <div className="thermometer-bar-fill" style={{ width: `${limitPct}%`, background: '#fff' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.9 }}>
                    <span>Fechamento: dia <b>{selectedCard.closing_day}</b></span>
                    <span>Vencimento: dia <b>{selectedCard.due_day}</b></span>
                    <span className={`tabnums${hidden ? ' priv' : ''}`}>Limite disponível: <b>R$ {brl(availableLimit)}</b></span>
                  </div>
                </section>
              </div>

              <div className="col-12">
                <section className="card">
                  <div className="card-title" style={{ marginBottom: 16 }}>Lançamentos desta Fatura</div>
                  {cardExpenses.length === 0 ? (
                    <p className="empty-msg">Nenhuma despesa lançada nesta fatura ainda.</p>
                  ) : (
                    <div>
                      {cardExpenses.map(item => (
                        <div key={item.id} className="row-item">
                          <div className="row-ic t-orange" style={{ background: '#F57C0018' }}><ArrowUp size={18} /></div>
                          <div className="row-main">
                            <div className="row-name">{item.description ?? item.category}</div>
                            <div className="row-sub">{item.category} · {formatDate(item.date)}</div>
                          </div>
                          <div className="row-amt neg-amt">
                            <span className={`tabnums${hidden ? ' priv' : ''}`}>
                              – R$ {brl(Number(item.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR CARTÃO */}
      {showAddCard && (
        <>
          <div className="modal-scrim" onClick={() => setShowAddCard(false)} />
          <div className="modal-box">
            <div className="modal-head">
              <h3>Novo Cartão de Crédito</h3>
              <button className="icon-btn" onClick={() => setShowAddCard(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCard} className="entry-form">
              <label>
                <span>Nome do Cartão <span className="req">*</span></span>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank, XP..." required />
              </label>
              <label>
                <span>Limite Total (R$) <span className="req">*</span></span>
                <input value={limit} onChange={e => setLimit(e.target.value)} type="number" min="0.01" step="0.01" placeholder="0,00" required />
              </label>
              <div className="form-row">
                <label>
                  <span>Dia Fechamento <span className="req">*</span></span>
                  <input type="number" min="1" max="31" value={closingDay} onChange={e => setClosingDay(e.target.value)} required />
                </label>
                <label>
                  <span>Dia Vencimento <span className="req">*</span></span>
                  <input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} required />
                </label>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>Cor do Cartão</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`color-swatch${c === selectedColor ? ' selected' : ''}`}
                      style={{ background: c, width: 32, height: 32, borderRadius: '50%', border: selectedColor === c ? '3px solid #1A1A1A' : '3px solid transparent' }}
                      onClick={() => setSelectedColor(c)}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="form-error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowAddCard(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? 'Salvando…' : 'Salvar cartão'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* MODAL PAGAR FATURA */}
      {showPayModal && (
        <>
          <div className="modal-scrim" onClick={() => setShowPayModal(false)} />
          <div className="modal-box">
            <div className="modal-head">
              <h3>Pagamento de Fatura</h3>
              <button className="icon-btn" onClick={() => setShowPayModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSavePayment} className="entry-form">
              <label>
                <span>Valor do Pagamento (R$) <span className="req">*</span></span>
                <input value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} type="number" min="0.01" step="0.01" required />
              </label>

              <label>
                <span>Conta Origem (Débito) <span className="req">*</span></span>
                <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} required>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (R$ {brl(Number(a.balance))})</option>)}
                </select>
              </label>

              <div style={{
                background: 'var(--surface-2)', padding: '12px', borderRadius: '10px',
                border: '1px solid var(--border-color)', fontSize: 13, color: 'var(--muted)',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <Check size={16} className="t-green" />
                Ao pagar, as despesas em aberto deste cartão serão marcadas como pagas e um débito será lançado na conta selecionada.
              </div>

              {error && <p className="form-error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowPayModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? 'Efetuando Pagamento…' : 'Confirmar Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
