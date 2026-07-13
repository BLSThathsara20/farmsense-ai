import { useEffect, useId, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { cn } from '../../lib/utils'

/** Tap the icon to show a short tip — keeps the main UI simple for farmers. */
export function InfoTip({ text, className, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const tipId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!text) return null

  return (
    <span ref={ref} className={cn('relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-label="More information"
        aria-expanded={open}
        aria-controls={tipId}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-full',
          'text-text-muted hover:text-primary hover:bg-primary/10',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
        )}
      >
        <Info className="h-4 w-4" strokeWidth={2.25} />
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className={cn(
            'absolute z-40 top-full mt-1.5 w-56 sm:w-64 rounded-lg border border-border dark:border-border-dark',
            'bg-surface dark:bg-surface-dark p-3 text-xs leading-relaxed text-text-secondary dark:text-text-dark-secondary shadow-dock dark:shadow-dock-dark',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {text}
        </span>
      )}
    </span>
  )
}
