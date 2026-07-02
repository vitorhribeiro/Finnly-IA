import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  id?: string
}

export function CustomSelect({ value, onChange, options, placeholder = 'Selecione...', id }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(o => o.value === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <>
      <style>{`
        @keyframes customSelectFadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          width: '100%',
          padding: '11px 14px',
          fontSize: 13,
          fontWeight: 800,
          borderRadius: 12,
          border: '1px solid',
          borderColor: isOpen ? 'var(--teal)' : 'var(--border)',
          background: 'var(--surface-2)',
          color: selectedOption ? 'var(--ink)' : 'var(--muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s',
          textAlign: 'left'
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--muted)', 
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} 
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '100%',
            maxHeight: 220,
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
            zIndex: 10000,
            margin: 0,
            padding: 6,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            animation: 'customSelectFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                style={{
                  padding: '10px 12px',
                  fontSize: 13,
                  fontWeight: 800,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(1, 88, 76, 0.08)' : 'transparent',
                  color: isSelected ? 'var(--teal)' : 'var(--ink)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--surface-2)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {opt.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
    </>
  )
}
