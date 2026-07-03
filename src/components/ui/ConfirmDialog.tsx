import React, { useTransition } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm()
    })
  }

  return createPortal(
    <>
      <div 
        className="modal-scrim" 
        style={{ zIndex: 999999 }} 
        onClick={isPending ? undefined : onCancel} 
      />
      <div 
        className="modal-box" 
        style={{ 
          maxWidth: 380, 
          padding: 24, 
          zIndex: 1000000, 
          borderRadius: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: 'var(--surface)',
          border: '1px solid var(--line-soft)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 20, 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: 'var(--neg)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={20} />
          </div>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
            {title}
          </h4>
        </div>

        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: '1.5', fontWeight: 600 }}>
          {description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button 
            type="button" 
            className="btn-ghost" 
            onClick={onCancel}
            disabled={isPending}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleConfirm}
            disabled={isPending}
            style={{ 
              background: 'var(--neg)', 
              color: '#ffffff',
              padding: '8px 16px', 
              fontSize: 13, 
              fontWeight: 700, 
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isPending ? 'Confirmando...' : confirmText}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
