'use client'

import { Info } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function CardInfoTooltip({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [])

  return (
    <div 
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(!open);
      }}
      style={{ 
        position: 'relative', 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        cursor: 'pointer', 
        padding: '4px',
        marginLeft: 'auto'
      }}
      title={open ? '' : content} // Fallback nativo
    >
      <Info size={15} color="var(--muted)" style={{ opacity: open ? 1 : 0.6, transition: 'opacity 0.2s' }} />
      
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: '-10px',
          marginBottom: '8px',
          background: '#2D3748',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 500,
          lineHeight: 1.4,
          width: 'max-content',
          maxWidth: '240px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 100,
          textAlign: 'left'
        }}>
          {content}
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '15px',
            borderWidth: '5px',
            borderStyle: 'solid',
            borderColor: '#2D3748 transparent transparent transparent'
          }} />
        </div>
      )}
    </div>
  )
}
