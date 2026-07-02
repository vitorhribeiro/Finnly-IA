
'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Trash2, ArrowUp, Pencil } from 'lucide-react'
import { addExpense, deleteExpense, getAllExpenses } from '@/app/dashboard/actions/expenses'
import { getAccounts } from '@/app/dashboard/actions/accounts'
import { getCreditCards } from '@/app/dashboard/actions/credit-cards'
import { getExpenseCategories } from '@/app/dashboard/actions/expense-categories'
import { CATEGORY_COLORS } from '@/types/database'
import type { Expense, Account, CreditCard, ExpenseCategory } from '@/types/database'
import { PremiumExpenseModal } from './PremiumExpenseModal'
import TransactionsFilterDrawer, { FilterState, defaultFilterState } from '@/components/dashboard/filters/TransactionsFilterDrawer'
import { Filter, Search, X } from 'lucide-react'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DespesasSection({ hidden }: { hidden: boolean }) {
  const [items, setItems] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [isPending, startTransition] = useTransition()

  async function load() {
    setLoading(true)
    const [data, acc, cards, cats] = await Promise.all([
      getAllExpenses(),
      getAccounts(),
      getCreditCards(),
      getExpenseCategories()
    ])
    setItems(data as Expense[])
    setAccounts(acc)
    setCreditCards(cards)
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExpense(id)
      await load()
    })
  }

  function handleSaved() {
    setShowForm(false)
    setEditExpense(null)
    load()
  }

    const filteredItems = items.filter(inc => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const desc = (inc.description || '').toLowerCase()
      const cat = inc.category.toLowerCase()
      if (!desc.includes(q) && !cat.includes(q)) return false
    }
    
    // Period filter
    if (filterState.period === 'this_month') {
      const ym = new Date().toISOString().slice(0, 7)
      if (inc.date.slice(0, 7) !== ym) return false
    } else if (filterState.period === 'last_month') {
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      if (inc.date.slice(0, 7) !== d.toISOString().slice(0, 7)) return false
    } else if (filterState.period === 'last_7') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      if (inc.date < d.toISOString().slice(0, 10)) return false
    } else if (filterState.period === 'last_30') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      if (inc.date < d.toISOString().slice(0, 10)) return false
    } else if (filterState.period === 'custom' && filterState.customDateStart && filterState.customDateEnd) {
      if (inc.date < filterState.customDateStart || inc.date > filterState.customDateEnd) return false
    }
    
    // Category
    if (filterState.categoryId && inc.category !== filterState.categoryId) return false
    
    // Status
    if (filterState.paymentMethod === 'received' && !inc.payment_status) return false
    if (filterState.paymentMethod === 'pending' && inc.payment_status) return false
    
    // Type
    if (filterState.transactionType !== 'all' && inc.expense_type !== filterState.transactionType) return false
    
    // Tags
    if (filterState.tags && filterState.tags.length > 0) {
      const incTags = inc.tags || []
      const hasAllTags = filterState.tags.every(t => incTags.includes(t))
      if (!hasAllTags) return false
    }
    
    // Amount
    if (filterState.minAmount && Number(inc.amount) < Number(filterState.minAmount)) return false
    if (filterState.maxAmount && Number(inc.amount) > Number(filterState.maxAmount)) return false

    return true
  }).sort((a, b) => {
    if (filterState.order === 'newest') return b.date.localeCompare(a.date)
    if (filterState.order === 'oldest') return a.date.localeCompare(b.date)
    if (filterState.order === 'highest') return Number(b.amount) - Number(a.amount)
    if (filterState.order === 'lowest') return Number(a.amount) - Number(b.amount)
    return 0
  })

  const total = items.reduce((s, r) => s + Number(r.amount), 0)

  // Resumo por categoria
  const catMap: Record<string, number> = {}
  for (const e of items) catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount)
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="fd-stack fade-up">
      <div className="topbar-inline">
        <div>
          <h2 className="section-title">Despesas</h2>
          <p className="section-sub">Acompanhe e categorize seus gastos</p>
        </div>
        <button className="btn-primary btn-orange" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nova despesa
        </button>
      </div>

      <div className="fd-grid">
        <div className="col-4">
          <div className="kpi kpi-wide">
            <div className="kpi-top">
              <div className="kpi-ic t-orange"><ArrowUp size={20} /></div>
              <div className="kpi-label">Total registrado</div>
            </div>
            <div className="kpi-val">
              <span className={`tabnums${hidden ? ' priv' : ''}`}>
                <span className="cur">R$</span>{brl(total)}
              </span>
            </div>
            <div className="kpi-foot">
              <span className="mut">{items.length} lançamento{items.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {cats.length > 0 && (
          <div className="col-8">
            <section className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Por categoria</div>
              {cats.map(([cat, val]) => {
                const pct = total > 0 ? Math.round((val / total) * 100) : 0
                const color = CATEGORY_COLORS[cat] ?? '#90A4AE'
                return (
                  <div key={cat} className="cat-row">
                    <div className="cat-name">
                      <span className="cat-dot" style={{ background: color }} />
                      {cat}
                    </div>
                    <div>
                      <div className="cat-track">
                        <i style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="cat-pct" style={{ marginTop: 5 }}>{pct}%</div>
                    </div>
                    <div className="cat-val">
                      <span className={`tabnums${hidden ? ' priv' : ''}`}>R$ {brl(val)}</span>
                    </div>
                  </div>
                )
              })}
            </section>
          </div>
        )}
      </div>

      {(showForm || editExpense) && (
        <PremiumExpenseModal 
          expense={editExpense}
          categories={categories}
          accounts={accounts}
          creditCards={creditCards}
          onClose={() => { setShowForm(false); setEditExpense(null); }}
          onSaved={handleSaved}
        />
      )}

            <div className="filter-bar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <button 
          className="btn-secondary" 
          style={{ padding: '8px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => setIsDrawerOpen(true)}
        >
          <Filter size={15} /> Filtros avançados
          {Object.keys(filterState).length > 2 && <div style={{ width: 6, height: 6, borderRadius: 6, background: 'var(--orange)' }} />}
        </button>

        <div className="search-input">
          <Search size={14} className="search-icon" />
          <input
            placeholder="Buscar despesa…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: 'var(--faint)' }}>
              <X size={13} />
            </button>
          )}
        </div>
        
        <TransactionsFilterDrawer 
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          type="expense"
          activeFilters={filterState}
          onApply={setFilterState}
          categories={categories}
          accounts={accounts}
          cards={creditCards}
        />
      </div>
      
      <section className="card">
        {loading ? (
          <p className="empty-msg">Carregando…</p>
        ) : filteredItems.length === 0 ? (
          <div className="empty-list">
            <ArrowUp size={32} className="t-orange" />
            <p>Nenhuma despesa registrada ainda.</p>
            <button className="btn-primary btn-orange" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Adicionar primeira despesa
            </button>
          </div>
        ) : (
          filteredItems.map(item => {
            const color = CATEGORY_COLORS[item.category] ?? '#90A4AE'
            return (
              <div key={item.id} className="row-item">
                <div className="row-ic" style={{ background: color + '22', color }}><ArrowUp size={19} /></div>
                <div className="row-main">
                  <div className="row-name">{item.description ?? item.category}</div>
                  <div className="row-sub">{item.category} · {formatDate(item.date)}</div>
                </div>
                <div className="row-amt neg-amt">
                  <span className={`tabnums${hidden ? ' priv' : ''}`}>
                    – R$ {brl(Number(item.amount))}
                  </span>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => setEditExpense(item)}
                  disabled={isPending}
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-btn delete-btn"
                  onClick={() => handleDelete(item.id)}
                  disabled={isPending}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
