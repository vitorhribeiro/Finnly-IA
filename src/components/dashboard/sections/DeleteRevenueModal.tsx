import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Trash2, TriangleAlert, AlertCircle, Loader2 } from 'lucide-react'
import type { Income, IncomeCategory, Account } from '@/types/database'
import { getTransactionStatus } from '@/lib/utils'

function brl(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatShortDate(dStr: string) {
  if (!dStr) return ''
  const cleanStr = dStr.slice(0, 10)
  const [y, m, d] = cleanStr.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const year = dateObj.getFullYear()
  return `${day}/${month}/${year}`
}

export interface DeleteRevenueModalProps {
  open: boolean
  revenue: Income | null
  categories: IncomeCategory[]
  accounts: Account[]
  isDeleting: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
  onExitComplete: () => void
}

export function DeleteRevenueModal({
  open,
  revenue,
  categories,
  accounts,
  isDeleting,
  error,
  onClose,
  onConfirm,
  onExitComplete
}: DeleteRevenueModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const cancelBtnRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const isMounted = typeof window !== 'undefined'

  // Scroll lock
  useEffect(() => {
    if (!open || !isMounted) return

    const originalStyle = window.getComputedStyle(document.body).overflow
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    
    document.body.style.overflow = 'hidden'
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }

    return () => {
      document.body.style.overflow = originalStyle
      document.body.style.paddingRight = ''
    }
  }, [open, isMounted])

  // Focus trap and ESC
  useEffect(() => {
    if (!open || !isMounted) return

    previousFocusRef.current = document.activeElement as HTMLElement
    const timer = setTimeout(() => {
      if (cancelBtnRef.current) cancelBtnRef.current.focus()
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isDeleting) onClose()
        return
      }
      if (e.key === 'Tab') {
        if (!modalRef.current) return
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [open, isDeleting, onClose, isMounted])

  if (!isMounted) return null

  // Animações
  const overlayVariants: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeIn' } }
  }

  const modalVariants: any = {
    hidden: { opacity: 0, scale: prefersReducedMotion ? 1 : 0.96, y: prefersReducedMotion ? 0 : 12 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { 
        duration: prefersReducedMotion ? 0 : 0.3, 
        ease: [0.22, 1, 0.36, 1] 
      } 
    },
    exit: { 
      opacity: 0, 
      scale: prefersReducedMotion ? 1 : 0.97, 
      y: prefersReducedMotion ? 0 : 8, 
      transition: { 
        duration: prefersReducedMotion ? 0 : 0.2, 
        ease: 'easeIn' 
      } 
    }
  }

  // Prepara dados do resumo da receita
  const cat = revenue ? categories.find(c => c.name === revenue.category) : null
  const catName = revenue?.category || ''
  const catColor = cat?.color || '#006B5B'
  const account = revenue ? accounts.find(a => a.id === revenue.account_id) : null
  const status = revenue ? getTransactionStatus(revenue.payment_status, revenue.date) : null

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <div 
          className="fixed inset-0 flex items-center justify-center" 
          style={{ zIndex: 9999999 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-revenue-title"
          aria-describedby="delete-revenue-description"
        >
          {/* Backdrop */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0"
            style={{ 
              background: 'rgba(7, 30, 27, 0.55)', 
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)'
            }}
            onClick={() => {
              if (!isDeleting) onClose()
            }}
          />

          {/* Modal Card */}
          <motion.div
            ref={modalRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative bg-[#FFFCF8] rounded-[28px] shadow-[0_32px_64px_rgba(7,30,27,0.12)] border border-[#E9E3DA] flex flex-col w-[calc(100vw-32px)] max-w-[520px] max-h-[calc(100dvh-32px)] overflow-y-auto"
            style={{ margin: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8 flex flex-col items-center text-center">
              {/* Ícone Lixeira */}
              <div className="w-[76px] h-[76px] rounded-full bg-[#FFF0EC] flex items-center justify-center mb-5 border border-[#FFE0D9] shadow-[0_8px_24px_rgba(255,90,73,0.12)]">
                <Trash2 size={32} className="text-[#E84637]" />
              </div>

              {/* Badge Atenção */}
              <div className="flex items-center gap-1.5 bg-[#FFF0EC] text-[#E84637] px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-[#FFE0D9]">
                <TriangleAlert size={14} />
                <span>Atenção</span>
              </div>

              {/* Textos */}
              <h2 id="delete-revenue-title" className="text-2xl md:text-[28px] font-bold text-[#113B35] mb-3 leading-tight">
                Excluir receita?
              </h2>
              <p id="delete-revenue-description" className="text-[15px] text-[#687976] leading-relaxed max-w-[380px] mb-6">
                Tem certeza que deseja excluir esta receita? Essa ação não poderá ser desfeita.
              </p>

              {/* Resumo da Receita */}
              {revenue && (
                <div className="w-full bg-white border border-[#E9E3DA] rounded-[16px] p-4 text-left mb-6 flex flex-col gap-1 shadow-sm">
                  <div className="font-bold text-[#113B35] text-base whitespace-nowrap overflow-hidden text-ellipsis">
                    {revenue.description || revenue.category}
                  </div>
                  <div className="text-[14px] text-[#687976] flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <span className="font-semibold text-[#113B35]">R$ {brl(Number(revenue.amount))}</span>
                    <span className="text-[#D1C9C0]">•</span>
                    <span>{formatShortDate(revenue.date)}</span>
                  </div>
                  {(catName || account || status) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {catName && (
                        <div className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: catColor + '15', color: catColor }}>
                          {catName}
                        </div>
                      )}
                      {account && (
                        <div className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {account.name}
                        </div>
                      )}
                      {status && (
                        <div className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          status === 'paid' ? 'bg-green-100 text-green-700' :
                          status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {status === 'paid' ? 'Recebido' : status === 'overdue' ? 'Atrasado' : 'Pendente'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Erro */}
              {error && (
                <div 
                  className="w-full mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2"
                  aria-live="polite"
                >
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span className="text-left leading-tight font-medium">{error}</span>
                </div>
              )}

              {/* Botões */}
              <div className="w-full flex flex-col-reverse md:flex-row gap-3">
                <button
                  ref={cancelBtnRef}
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3.5 rounded-[16px] text-[#006B5B] font-bold text-[15px] border border-[#006B5B] bg-transparent transition-all hover:bg-[#006B5B]/5 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006B5B]/30 focus-visible:ring-offset-2 active:scale-[0.98]"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3.5 rounded-[16px] text-white font-bold text-[15px] border border-transparent bg-[#FF5A49] transition-all hover:bg-[#E84637] shadow-[0_4px_12px_rgba(255,90,73,0.25)] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A49]/50 focus-visible:ring-offset-2 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      <span>Excluir receita</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
