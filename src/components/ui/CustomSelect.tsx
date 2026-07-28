import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

interface Option {
  value: string
  label: string
  icon?: React.ReactNode | string
  color?: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  id?: string
  disabled?: boolean
}

export function CustomSelect({ value, onChange, options, placeholder = 'Selecione...', id, disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(o => o.value === value)

  const renderIcon = (icon: React.ReactNode | string | undefined, color?: string) => {
    if (!icon) return null
    if (typeof icon === 'string') {
      const IconComp = (LucideIcons as any)[icon]
      return IconComp ? <IconComp size={16} color={color} /> : null
    }
    return icon
  }

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
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: disabled ? 'var(--surface-2)' : '#ffffff',
          border: isOpen ? '1px solid var(--teal)' : '1px solid var(--border)',
          borderRadius: 12,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'all 0.2s',
          boxShadow: isOpen ? '0 0 0 4px rgba(1, 88, 76, 0.08)' : 'none',
          opacity: disabled ? 0.6 : 1,
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}>
          {selectedOption?.color && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: selectedOption.color, display: 'inline-block', flexShrink: 0 }} />
          )}
          {selectedOption?.icon && (
            <span style={{ display: 'flex', alignItems: 'center', color: selectedOption.color || 'var(--muted)', flexShrink: 0 }}>
              {renderIcon(selectedOption.icon, selectedOption.color)}
            </span>
          )}
          <span style={{ 
            color: selectedOption ? 'var(--ink)' : 'var(--muted)',
            fontWeight: selectedOption ? 500 : 400,
            fontSize: 13,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
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
            const isNewOption = opt.value.startsWith('__new_')
            
            // Choose colors based on option type
            let itemColor = 'var(--ink)'
            if (isSelected) {
              itemColor = 'var(--teal)'
            } else if (isNewOption) {
              itemColor = 'var(--teal)'
            }
            
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
                  fontWeight: isSelected || isNewOption ? 600 : 500,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(1, 88, 76, 0.08)' : 'transparent',
                  color: itemColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s'
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
                {opt.color && (
                  <span style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    background: opt.color,
                    display: 'inline-block',
                    flexShrink: 0
                  }} />
                )}
                {opt.icon && (
                  <span style={{ display: 'flex', alignItems: 'center', color: opt.color || 'var(--muted)', flexShrink: 0 }}>
                    {renderIcon(opt.icon, opt.color)}
                  </span>
                )}
                <span>{opt.label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
    </>
  )
}
