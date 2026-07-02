import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

interface CustomDatePickerProps {
  value: string // Format: YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  id?: string
}

function parseDate(isoStr: string) {
  if (!isoStr) return null
  const [y, m, d] = isoStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateToBRL(isoStr: string) {
  if (!isoStr) return ''
  const [y, m, d] = isoStr.split('-')
  return `${d}/${m}/${y}`
}

function toIsoStr(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function CustomDatePicker({ value, onChange, placeholder = 'Selecionar...', id }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const selectedDate = parseDate(value)
  const initialViewDate = selectedDate || new Date()
  
  // Track which month/year the calendar is currently showing
  const [viewYear, setViewYear] = useState(initialViewDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth())

  const updatePosition = () => {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
    }
  }

  useEffect(() => {
    if (isOpen) {
      updatePosition()
      // removed setState to fix cascading renders
      
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen, value])

  useEffect(() => {
    if (isOpen && popupRef.current && rect && typeof window !== 'undefined' && window.innerWidth > 600) {
      const popupRect = popupRef.current.getBoundingClientRect()
      // If it overflows the bottom of the screen, open it ABOVE the trigger
      if (rect.bottom + popupRect.height + 8 > window.innerHeight) {
        popupRef.current.style.top = `${Math.max(8, rect.top - popupRect.height - 8)}px`
      } else {
        popupRef.current.style.top = `${rect.bottom + 8}px`
      }
    }
  }, [isOpen, rect, viewMonth, viewYear])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        popupRef.current && !popupRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen])

  // Calendar logic
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay() // 0 = Sun
  
  const days = []
  
  // Fill previous month trailing days
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(viewYear, viewMonth - 1, prevMonthDays - i),
      isCurrentMonth: false
    })
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(viewYear, viewMonth, i),
      isCurrentMonth: true
    })
  }
  
  // Fill next month leading days
  const remainingSlots = 42 - days.length
  for (let i = 1; i <= remainingSlots; i++) {
    days.push({
      date: new Date(viewYear, viewMonth + 1, i),
      isCurrentMonth: false
    })
  }

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const todayIso = toIsoStr(new Date())

  return (
    <>
      <style>{`
        @keyframes customDatePickerFadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes customDatePickerFadeInMobile {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            const d = parseDate(value) || new Date()
            setViewYear(d.getFullYear())
            setViewMonth(d.getMonth())
          }
          setIsOpen(!isOpen)
        }}
        aria-haspopup="dialog"
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
          color: value ? 'var(--ink)' : 'var(--muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s',
          textAlign: 'left'
        }}
      >
        <span>{value ? formatDateToBRL(value) : placeholder}</span>
        <CalendarIcon size={16} style={{ color: 'var(--muted)' }} />
      </button>

      {isOpen && rect && typeof window !== 'undefined' && createPortal(
        <div 
          ref={popupRef}
          style={{
            position: 'fixed',
            // Default desktop pos (will be overridden by useEffect if overflowing):
            top: window.innerWidth > 600 ? rect.bottom + 8 : '50%',
            left: window.innerWidth > 600 ? rect.left : '50%',
            transform: window.innerWidth > 600 ? 'none' : 'translate(-50%, -50%)',
            width: window.innerWidth > 600 ? Math.max(rect.width, 280) : 300,
            maxHeight: 'calc(100vh - 16px)',
            overflowY: 'auto',
            background: '#FDFBF7', // Cream
            border: '1px solid var(--border)',
            borderRadius: 20,
            boxShadow: '0 16px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
            zIndex: 100000,
            padding: 20,
            animation: window.innerWidth > 600 
              ? 'customDatePickerFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              : 'customDatePickerFadeInMobile 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              onClick={handlePrevMonth}
              type="button"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 16,
                color: 'var(--teal-900)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(1, 88, 76, 0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontWeight: 800, color: 'var(--teal-900)', fontSize: 13.5 }}>
              {monthNames[viewMonth]} de {viewYear}
            </span>
            <button 
              onClick={handleNextMonth}
              type="button"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 16,
                color: 'var(--teal-900)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(1, 88, 76, 0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Grid */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
              {weekDays.map((wd, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                  {wd}
                </div>
              ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {days.map((d, i) => {
                const isSelected = value === toIsoStr(d.date)
                const isToday = todayIso === toIsoStr(d.date)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(toIsoStr(d.date))
                      setIsOpen(false)
                    }}
                    style={{
                      aspectRatio: '1',
                      background: isSelected ? 'var(--teal)' : 'transparent',
                      color: isSelected ? '#fff' : (d.isCurrentMonth ? 'var(--teal-900)' : 'var(--faint)'),
                      border: isToday && !isSelected ? '1px solid var(--teal)' : '1px solid transparent',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: isSelected ? 800 : 700,
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      opacity: d.isCurrentMonth ? 1 : 0.4,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(1, 88, 76, 0.08)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    {d.date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line-soft)', paddingTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              style={{
                background: 'none', border: 'none', fontSize: 12, fontWeight: 800, color: 'var(--muted)', cursor: 'pointer'
              }}
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayIso)
                setIsOpen(false)
              }}
              style={{
                background: 'none', border: 'none', fontSize: 12, fontWeight: 800, color: 'var(--teal)', cursor: 'pointer'
              }}
            >
              Hoje
            </button>
          </div>
        </div>
      , document.body)}
    </>
  )
}
