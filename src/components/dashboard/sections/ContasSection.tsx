'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { Plus, Trash2, ArrowRightLeft, X, Edit3, Landmark, Wallet, PiggyBank, BarChart2 } from 'lucide-react'
import { getAccounts, createAccount, updateAccount, deleteAccount } from '@/app/dashboard/actions/accounts'
import { createTransfer, getTransfers } from '@/app/dashboard/actions/transfers'
import type { Account, Transfer } from '@/types/database'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const COLOR_OPTIONS = [
  '#01584C', // Dark Teal
  '#0288D1', // Blue
  '#FFB300', // Gold
  '#F57C00', // Orange
  '#7B1FA2', // Purple
  '#28A745', // Green
  '#455A64', // Slate
]

export function ContasSection({ hidden }: { hidden: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editAcc, setEditAcc] = useState<Account | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [type, setType] = useState<Account['type']>('corrente')
  const [balance, setBalance] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0])

  // Campos de transferência
  const [transferAmount, setTransferAmount] = useState('')
  const [sourceAccId, setSourceAccId] = useState('')
  const [destAccId, setDestAccId] = useState('')
  const [transferDesc, setTransferDesc] = useState('')
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0])

  async function loadData() {
    setLoading(true)
    const [accData, transfData] = await Promise.all([
      getAccounts(),
      getTransfers()
    ])
    setAccounts(accData)
    setTransfers(transfData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function openNewAccount() {
    setEditAcc(null)
    setName('')
    setType('corrente')
    setBalance('0')
    setSelectedColor(COLOR_OPTIONS[0])
    setError('')
    setShowAccountModal(true)
  }

  function openEditAccount(acc: Account) {
    setEditAcc(acc)
    setName(acc.name)
    setType(acc.type)
    setBalance(String(acc.balance))
    setSelectedColor(acc.color)
    setError('')
    setShowAccountModal(true)
  }

  function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome da conta é obrigatório'); return }

    const fd = new FormData()
    fd.set('name', name.trim())
    fd.set('type', type)
    fd.set('balance', balance)
    fd.set('color', selectedColor)

    startTransition(async () => {
      let res
      if (editAcc) {
        res = await updateAccount(editAcc.id, fd)
      } else {
        res = await createAccount(fd)
      }

      if (res && 'error' in res) {
        setError(res.error || 'Erro ao salvar a conta')
      } else {
        setShowAccountModal(false)
        await loadData()
      }
    })
  }

  function handleDeleteAccount(id: string) {
    if (!confirm('Deseja realmente excluir esta conta? Isso removerá o saldo associado.')) return
    startTransition(async () => {
      await deleteAccount(id)
      await loadData()
    })
  }

  function openTransfer() {
    if (accounts.length < 2) {
      alert('Você precisa ter pelo menos 2 contas cadastradas para realizar uma transferência.')
      return
    }
    setTransferAmount('')
    setSourceAccId(accounts[0]?.id || '')
    setDestAccId(accounts[1]?.id || '')
    setTransferDesc('')
    setTransferDate(new Date().toISOString().split('T')[0])
    setError('')
    setShowTransferModal(true)
  }

  function handleSaveTransfer(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(transferAmount.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) { setError('Digite um valor de transferência válido'); return }
    if (sourceAccId === destAccId) { setError('A conta de origem e destino devem ser diferentes'); return }

    const fd = new FormData()
    fd.set('amount', transferAmount)
    fd.set('source_account_id', sourceAccId)
    fd.set('destination_account_id', destAccId)
    fd.set('description', transferDesc)
    fd.set('date', transferDate)

    startTransition(async () => {
      const res = await createTransfer(fd)
      if (res && 'error' in res) {
        setError(res.error || 'Erro ao realizar transferência')
      } else {
        setShowTransferModal(false)
        await loadData()
      }
    })
  }

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

  function getAccountIcon(accType: Account['type']) {
    switch (accType) {
      case 'corrente': return Landmark
      case 'carteira': return Wallet
      case 'poupanca': return PiggyBank
      case 'investimento': return BarChart2
      default: return Wallet
    }
  }

  return (
    <div className="fd-stack fade-up">
      <div className="topbar-inline">
        <div>
          <h2 className="section-title">Contas & Saldos</h2>
          <p className="section-sub">Gerencie seus bancos, carteira de dinheiro e poupança</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={openTransfer} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowRightLeft size={16} /> Transferir
          </button>
          <button className="btn-primary" onClick={openNewAccount}>
            <Plus size={18} /> Nova conta
          </button>
        </div>
      </div>

      <div className="fd-grid">
        <div className="col-4">
          <div className="kpi kpi-wide" style={{ background: 'var(--teal-tint)' }}>
            <div className="kpi-top">
              <div className="kpi-ic t-teal"><Landmark size={20} /></div>
              <div className="kpi-label" style={{ color: 'var(--teal-900)' }}>Saldo Líquido Total</div>
            </div>
            <div className="kpi-val" style={{ color: 'var(--teal-900)' }}>
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(totalBalance)}
              </span>
            </div>
            <div className="kpi-foot">
              <span className="mut">{accounts.length} conta{accounts.length !== 1 ? 's' : ''} cadastrada{accounts.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="col-8">
          <section className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Minhas Contas</div>
            {loading ? (
              <p className="empty-msg">Carregando contas…</p>
            ) : (
              <div className="fd-grid" style={{ gap: 12 }}>
                {accounts.map(acc => {
                  const Icon = getAccountIcon(acc.type)
                  return (
                    <div key={acc.id} className="col-6 col-sm-12" style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 14,
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--surface-2)',
                      borderLeft: `4px solid ${acc.color}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: acc.color + '15', color: acc.color,
                          display: 'grid', placeItems: 'center'
                        }}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal-900)' }}>{acc.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{acc.type}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`tabnums${hidden ? ' priv' : ''}`} style={{ fontSize: 16, fontWeight: 800, color: 'var(--teal-900)' }}>
                          R$ {brl(Number(acc.balance))}
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="icon-btn" onClick={() => openEditAccount(acc)} title="Editar"><Edit3 size={14} /></button>
                          {accounts.length > 1 && (
                            <button className="icon-btn delete-btn" onClick={() => handleDeleteAccount(acc.id)} title="Excluir"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Histórico de Transferências</div>
        {loading ? (
          <p className="empty-msg">Carregando histórico…</p>
        ) : transfers.length === 0 ? (
          <p className="empty-msg">Nenhuma transferência registrada recentemente.</p>
        ) : (
          <div>
            {transfers.map(tr => {
              const srcAcc = accounts.find(a => a.id === tr.source_account_id)
              const destAcc = accounts.find(a => a.id === tr.destination_account_id)
              return (
                <div key={tr.id} className="row-item">
                  <div className="row-ic t-orange" style={{ background: '#FFB30022' }}><ArrowRightLeft size={18} /></div>
                  <div className="row-main">
                    <div className="row-name">{tr.description || 'Transferência entre contas'}</div>
                    <div className="row-sub">
                      De: <b>{srcAcc?.name || 'Conta excluída'}</b> → Para: <b>{destAcc?.name || 'Conta excluída'}</b>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div className={`row-amt tabnums${hidden ? ' priv' : ''}`} style={{ fontWeight: 800 }}>
                      R$ {brl(Number(tr.amount))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{formatDate(tr.date)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* MODAL CONTA */}
      {showAccountModal && (
        <>
          <div className="modal-scrim" onClick={() => setShowAccountModal(false)} />
          <div className="modal-box">
            <div className="modal-head">
              <h3>{editAcc ? 'Editar Conta' : 'Nova Conta'}</h3>
              <button className="icon-btn" onClick={() => setShowAccountModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveAccount} className="entry-form">
              <label>
                <span>Nome da Conta <span className="req">*</span></span>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Itaú, Carteira Férias..." required />
              </label>
              <div className="form-row">
                <label>
                  <span>Tipo de Conta <span className="req">*</span></span>
                  <select value={type} onChange={e => setType(e.target.value as Account['type'])} required>
                    <option value="corrente">Conta Corrente</option>
                    <option value="carteira">Dinheiro / Carteira</option>
                    <option value="poupanca">Poupança</option>
                    <option value="investimento">Conta Investimentos</option>
                    <option value="outros">Outros</option>
                  </select>
                </label>
                <label>
                  <span>Saldo Inicial (R$) <span className="req">*</span></span>
                  <input value={balance} onChange={e => setBalance(e.target.value)} type="number" step="0.01" placeholder="0,00" required />
                </label>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>Cor do Indicador</div>
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
                <button type="button" className="btn-ghost" onClick={() => setShowAccountModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? 'Salvando…' : 'Salvar conta'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* MODAL TRANSFERENCIA */}
      {showTransferModal && (
        <>
          <div className="modal-scrim" onClick={() => setShowTransferModal(false)} />
          <div className="modal-box">
            <div className="modal-head">
              <h3>Transferência entre Contas</h3>
              <button className="icon-btn" onClick={() => setShowTransferModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveTransfer} className="entry-form">
              <label>
                <span>Valor (R$) <span className="req">*</span></span>
                <input value={transferAmount} onChange={e => setTransferAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="0,00" required />
              </label>

              <div className="form-row">
                <label>
                  <span>De (Conta Origem) <span className="req">*</span></span>
                  <select value={sourceAccId} onChange={e => setSourceAccId(e.target.value)} required>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (R$ {brl(Number(a.balance))})</option>)}
                  </select>
                </label>
                <label>
                  <span>Para (Conta Destino) <span className="req">*</span></span>
                  <select value={destAccId} onChange={e => setDestAccId(e.target.value)} required>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (R$ {brl(Number(a.balance))})</option>)}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Descrição (Opcional)
                  <input value={transferDesc} onChange={e => setTransferDesc(e.target.value)} placeholder="Ex: Guardando na poupança" />
                </label>
                <label>
                  <span>Data <span className="req">*</span></span>
                  <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} required />
                </label>
              </div>

              {error && <p className="form-error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowTransferModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? 'Transferindo…' : 'Executar transferência'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
