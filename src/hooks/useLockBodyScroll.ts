import { useEffect } from 'react'

export function useLockBodyScroll(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return

    // Save current state
    const originalStyle = window.getComputedStyle(document.body).overflow
    const scrollY = window.scrollY

    // Lock body
    document.body.style.overflow = 'hidden'
    
    // For iOS Safari (prevent background scroll trick)
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      // Restore
      document.body.style.overflow = originalStyle
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      
      // Restore scroll position
      window.scrollTo(0, scrollY)
    }
  }, [isLocked])
}
