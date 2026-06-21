'use client'

import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

export function InfoTooltip({ text, Icon = Info }: { text: string; Icon?: React.ElementType }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [open])

  return (
    <div
      ref={ref}
      className={`info-wrap${open ? ' open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="info-btn"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label="Mais informações"
        type="button"
      >
        <Icon size={12} />
      </button>
      <div className="info-bubble" role="tooltip">{text}</div>
    </div>
  )
}
