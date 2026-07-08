'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { CustomDatePicker } from '@/components/ui/CustomDatePicker'

export interface FilterState {
  period: 'global' | 'this_month' | 'last_month' | 'last_7' | 'last_30' | 'custom'
  customDateStart?: string
  customDateEnd?: string
  categoryId: string
  accountId: string
  creditCardId: string
  paymentMethod: string
  transactionType: 'all' | 'fixed' | 'variable'
  tags: string[]
  minAmount?: string
  maxAmount?: string
  order: 'newest' | 'oldest' | 'highest' | 'lowest'
}

export const defaultFilterState: FilterState = {
  period: 'global',
  categoryId: 'all',
  accountId: 'all',
  creditCardId: 'all',
  paymentMethod: 'all',
  transactionType: 'all',
  tags: [],
  order: 'newest'
}

interface TransactionsFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  type: 'income' | 'expense'
  activeFilters: FilterState
  onApply: (filters: FilterState) => void
  categories: any[]
  accounts: any[]
  cards?: any[]
}

export default function TransactionsFilterDrawer({
  isOpen, onClose, type, activeFilters, onApply, categories, accounts, cards = []
}: TransactionsFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(activeFilters)
  const [tagInput, setTagInput] = useState('')
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(activeFilters)
      document.body.style.overflow = 'hidden'
      setShouldRender(true)
      setIsClosing(false)
    } else {
      document.body.style.overflow = 'auto'
      if (shouldRender) {
        setIsClosing(true)
        const t = setTimeout(() => {
          setShouldRender(false)
        }, 280)
        return () => {
          clearTimeout(t)
          document.body.style.overflow = 'auto'
        }
      }
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [isOpen, activeFilters, shouldRender])

  if (!mounted || !shouldRender) return null

  const handleApply = () => {
    onApply(localFilters)
    onClose()
  }

  const handleClear = () => {
    setLocalFilters(defaultFilterState)
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
    if ((e.type === 'keydown' && (e as React.KeyboardEvent).key === 'Enter' || (e as React.KeyboardEvent).key === ',') || e.type === 'blur') {
      e.preventDefault()
      const val = tagInput.replace(',', '').trim()
      if (val && !localFilters.tags.includes(val)) {
        setLocalFilters({ ...localFilters, tags: [...localFilters.tags, val] })
      }
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setLocalFilters({ ...localFilters, tags: localFilters.tags.filter(t => t !== tag) })
  }

  const formatCurrencyInput = (val: string) => {
    const numericValue = val.replace(/\D/g, '')
    const floatValue = parseFloat(numericValue) / 100
    if (isNaN(floatValue)) return ''
    return floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const categoryOptions = [
    { value: 'all', label: 'Todas as categorias' },
    ...categories.map(c => ({ value: c.id, label: c.name }))
  ]

  const accountOptions = [
    { value: 'all', label: type === 'expense' ? 'Todas as contas' : 'Todas as contas' },
    ...accounts.map(a => ({ value: a.id, label: a.name }))
  ]

  const cardOptions = [
    { value: 'all', label: 'Todos os cartões' },
    ...cards.map(c => ({ value: c.id, label: c.name }))
  ]

  const incomeMethods = [
    { value: 'all', label: 'Todas as formas' },
    { value: 'pix', label: 'Pix' },
    { value: 'transfer', label: 'Transferência' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'deposit', label: 'Depósito' },
    { value: 'card', label: 'Cartão' },
    { value: 'other', label: 'Outros' },
    { value: 'null', label: 'Não informado' }
  ]

  const expenseMethods = [
    { value: 'all', label: 'Todas as formas' },
    { value: 'pix', label: 'Pix' },
    { value: 'debit', label: 'Débito' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'transfer', label: 'Transferência' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'other', label: 'Outros' },
    { value: 'null', label: 'Não informado' }
  ]

  const methodsOptions = type === 'income' ? incomeMethods : expenseMethods

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
        onClick={onClose}
        style={{
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      />
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: 'min(500px, calc(100vw - 32px))',
          maxHeight: 'min(calc(100vh - 40px), 760px)',
          background: 'var(--card)',
          border: '1px solid var(--line-soft)',
          borderRadius: 24,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 100000,
          color: 'var(--ink)'
        }}
        className={`filter-modal-animate ${isClosing ? 'filter-modal-animate-out' : ''}`}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Filtros</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Refine as transações exibidas na tabela.</p>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', color: 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }} className="hide-scrollbar">
          
          {/* Período */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Período</span>
            <CustomSelect
              options={[
                { value: 'global', label: 'Mês selecionado no painel' },
                { value: 'this_month', label: 'Este mês (calendário)' },
                { value: 'last_month', label: 'Mês anterior' },
                { value: 'last_7', label: 'Últimos 7 dias' },
                { value: 'last_30', label: 'Últimos 30 dias' },
                { value: 'custom', label: 'Personalizado' },
              ]}
              value={localFilters.period}
              onChange={(val: string) => setLocalFilters({ ...localFilters, period: val as any })}
            />
            {localFilters.period === 'custom' && (
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <div style={{ flex: 1 }}>
                  <CustomDatePicker 
                    value={localFilters.customDateStart || ''} 
                    onChange={(val: string) => setLocalFilters({ ...localFilters, customDateStart: val })} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <CustomDatePicker 
                    value={localFilters.customDateEnd || ''} 
                    onChange={(val: string) => setLocalFilters({ ...localFilters, customDateEnd: val })} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Grid de 2 colunas para Categoria e Conta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoria</span>
              <CustomSelect options={categoryOptions} value={localFilters.categoryId} onChange={(val: string) => setLocalFilters({ ...localFilters, categoryId: val })} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {type === 'expense' ? 'Conta Bancária' : 'Conta de Destino'}
              </span>
              <CustomSelect options={accountOptions} value={localFilters.accountId} onChange={(val: string) => setLocalFilters({ ...localFilters, accountId: val })} />
            </div>
          </div>

          {/* Se for Expense e tiver Cartão, mostramos os dois em linha. Se não, mostramos o Método e Tipo em 2 colunas */}
          {type === 'expense' && cards.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cartão de Crédito</span>
                <CustomSelect options={cardOptions} value={localFilters.creditCardId} onChange={(val: string) => setLocalFilters({ ...localFilters, creditCardId: val })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forma de pagamento</span>
                <CustomSelect options={methodsOptions} value={localFilters.paymentMethod} onChange={(val: string) => setLocalFilters({ ...localFilters, paymentMethod: val })} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {type === 'expense' ? 'Forma de pagamento' : 'Forma de recebimento'}
                </span>
                <CustomSelect options={methodsOptions} value={localFilters.paymentMethod} onChange={(val: string) => setLocalFilters({ ...localFilters, paymentMethod: val })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</span>
                <CustomSelect 
                  options={[{ value: 'all', label: 'Todas' }, { value: 'fixed', label: 'Fixa' }, { value: 'variable', label: 'Variável' }]} 
                  value={localFilters.transactionType} 
                  onChange={(val: string) => setLocalFilters({ ...localFilters, transactionType: val as any })} 
                />
              </div>
            </div>
          )}

          {/* Se for Expense e tiver Cartão, Tipo e Ordenação em 2 colunas. Se não, Ordenação inteira */}
          {type === 'expense' && cards.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</span>
                <CustomSelect 
                  options={[{ value: 'all', label: 'Todas' }, { value: 'fixed', label: 'Fixa' }, { value: 'variable', label: 'Variável' }]} 
                  value={localFilters.transactionType} 
                  onChange={(val: string) => setLocalFilters({ ...localFilters, transactionType: val as any })} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ordenar por</span>
                <CustomSelect 
                  options={[
                    { value: 'newest', label: 'Mais recentes' },
                    { value: 'oldest', label: 'Mais antigas' },
                    { value: 'highest', label: 'Maior valor' },
                    { value: 'lowest', label: 'Menor valor' }
                  ]} 
                  value={localFilters.order} 
                  onChange={(val: string) => setLocalFilters({ ...localFilters, order: val as any })} 
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ordenar por</span>
              <CustomSelect 
                options={[
                  { value: 'newest', label: 'Mais recentes' },
                  { value: 'oldest', label: 'Mais antigas' },
                  { value: 'highest', label: 'Maior valor' },
                  { value: 'lowest', label: 'Menor valor' }
                ]} 
                value={localFilters.order} 
                onChange={(val: string) => setLocalFilters({ ...localFilters, order: val as any })} 
              />
            </div>
          )}

          {/* Faixa de Valor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faixa de Valor (R$)</span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input 
                type="text" placeholder="Mínimo" 
                value={localFilters.minAmount || ''}
                onChange={e => setLocalFilters({ ...localFilters, minAmount: formatCurrencyInput(e.target.value) })}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line-soft)', background: 'var(--surface-2)', fontSize: 13, outline: 'none', color: 'var(--ink)', fontWeight: 600,
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--teal)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--line-soft)'}
              />
              <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>até</span>
              <input 
                type="text" placeholder="Máximo" 
                value={localFilters.maxAmount || ''}
                onChange={e => setLocalFilters({ ...localFilters, maxAmount: formatCurrencyInput(e.target.value) })}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line-soft)', background: 'var(--surface-2)', fontSize: 13, outline: 'none', color: 'var(--ink)', fontWeight: 600,
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--teal)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--line-soft)'}
              />
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
             <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags</span>
             {localFilters.tags.length > 0 && (
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                 {localFilters.tags.map(tag => (
                   <span key={tag} style={{ background: 'rgba(1, 88, 76, 0.06)', color: 'var(--teal-900)', padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                     {tag}
                     <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--teal-900)', display: 'flex' }}>
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                     </button>
                   </span>
                 ))}
               </div>
             )}
             <input 
               type="text" 
               placeholder="Adicionar tag e apertar Enter..." 
               value={tagInput}
               onChange={e => setTagInput(e.target.value)}
               onKeyDown={handleAddTag}
               style={{
                 width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line-soft)',
                 background: 'var(--surface-2)', fontSize: 13, color: 'var(--ink)', outline: 'none', fontWeight: 600,
                 transition: 'border-color 0.2s ease'
               }}
               onFocus={(e) => e.currentTarget.style.borderColor = 'var(--teal)'}
               onBlur={(e) => { handleAddTag(e); e.currentTarget.style.borderColor = 'var(--line-soft)'; }}
             />
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line-soft)', display: 'flex', gap: 12, background: 'var(--card)' }}>
          <button 
            onClick={handleClear}
            style={{ 
              flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--line-soft)',
              background: 'var(--card)', color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--card)'}
          >
            Limpar Filtros
          </button>
          <button 
            onClick={handleApply}
            style={{ 
              flex: 1, padding: '12px', borderRadius: 12, border: 'none',
              background: 'var(--teal-900)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--teal)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--teal-900)'}
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
