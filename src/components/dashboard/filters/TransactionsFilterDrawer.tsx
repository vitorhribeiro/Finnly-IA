'use client'

import React, { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(activeFilters)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [isOpen, activeFilters])

  if (!isOpen) return null

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

  return (
    <>
      <div 
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)',
          zIndex: 9999, opacity: isOpen ? 1 : 0, transition: 'opacity 0.3s ease'
        }}
      />
      <div 
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '100%', maxWidth: 440,
          background: 'var(--surface-50)',
          zIndex: 10000,
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
          borderTopLeftRadius: 24, borderBottomLeftRadius: 24,
          display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-900)' }}>Filtros</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>Refine as transações exibidas na tabela.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', color: 'var(--muted)' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Período */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)' }}>Período</span>
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

          {/* Categoria */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)' }}>Categoria</span>
            <CustomSelect options={categoryOptions} value={localFilters.categoryId} onChange={(val: string) => setLocalFilters({ ...localFilters, categoryId: val })} />
          </div>

          {/* Conta / Cartão */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)' }}>{type === 'expense' ? 'Conta Bancária' : 'Conta de Destino'}</span>
              <CustomSelect options={accountOptions} value={localFilters.accountId} onChange={(val: string) => setLocalFilters({ ...localFilters, accountId: val })} />
            </div>
            {type === 'expense' && cards.length > 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)' }}>Cartão de Crédito</span>
                <CustomSelect options={cardOptions} value={localFilters.creditCardId} onChange={(val: string) => setLocalFilters({ ...localFilters, creditCardId: val })} />
              </div>
            )}
          </div>

          {/* Forma */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)' }}>{type === 'expense' ? 'Forma de pagamento' : 'Forma de recebimento'}</span>
            <CustomSelect options={methodsOptions} value={localFilters.paymentMethod} onChange={(val: string) => setLocalFilters({ ...localFilters, paymentMethod: val })} />
          </div>

          {/* Tipo e Tags */}
          <div style={{ display: 'flex', gap: 12 }}>
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)' }}>Tipo</span>
                <CustomSelect 
                  options={[{ value: 'all', label: 'Todas' }, { value: 'fixed', label: 'Fixa' }, { value: 'variable', label: 'Variável' }]} 
                  value={localFilters.transactionType} 
                  onChange={(val: string) => setLocalFilters({ ...localFilters, transactionType: val as any })} 
                />
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
             <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)' }}>Tags</span>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: localFilters.tags.length > 0 ? 8 : 0 }}>
               {localFilters.tags.map(tag => (
                 <span key={tag} style={{ background: 'var(--teal-50)', color: 'var(--teal-700)', padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                   {tag}
                   <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--teal-700)', display: 'flex' }}>
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                   </button>
                 </span>
               ))}
             </div>
             <input 
               type="text" 
               placeholder="Adicionar tag e apertar Enter..." 
               value={tagInput}
               onChange={e => setTagInput(e.target.value)}
               onKeyDown={handleAddTag}
               onBlur={handleAddTag}
               style={{
                 width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
                 background: '#fff', fontSize: 14, color: 'var(--text-800)', outline: 'none'
               }}
             />
          </div>

          {/* Faixa de Valor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)' }}>Faixa de Valor (R$)</span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input 
                type="text" placeholder="Mínimo" 
                value={localFilters.minAmount || ''}
                onChange={e => setLocalFilters({ ...localFilters, minAmount: formatCurrencyInput(e.target.value) })}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', fontSize: 14, outline: 'none' }}
              />
              <span style={{ color: 'var(--muted)' }}>até</span>
              <input 
                type="text" placeholder="Máximo" 
                value={localFilters.maxAmount || ''}
                onChange={e => setLocalFilters({ ...localFilters, maxAmount: formatCurrencyInput(e.target.value) })}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>

          {/* Ordenação */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)' }}>Ordenar por</span>
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

        {/* Footer */}
        <div style={{ padding: 24, borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: 12, background: 'var(--surface-50)' }}>
          <button 
            onClick={handleClear}
            style={{ 
              flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)',
              background: '#fff', color: 'var(--text-800)', fontSize: 14, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Limpar Filtros
          </button>
          <button 
            onClick={handleApply}
            style={{ 
              flex: 1, padding: '12px', borderRadius: 12, border: 'none',
              background: 'var(--teal-600)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </>
  )
}
