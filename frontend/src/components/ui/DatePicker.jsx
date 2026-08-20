import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatShortDate } from '../../lib/utils'
import { spring } from '../../lib/motion'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function toIsoDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIsoDate(value) {
  if (!value || typeof value !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (
    d.getFullYear() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
  ) {
    return null
  }
  return d
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function buildMonthGrid(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1)
  // Monday-first: JS Sun=0 → shift so Mon=0
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(viewYear, viewMonth, day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/**
 * Nice calendar date picker — popover month grid, ISO value YYYY-MM-DD.
 */
export function DatePicker({
  id,
  label,
  value = '',
  onChange,
  error,
  helperText,
  disabled = false,
  minDate,
  maxDate,
  placeholder = 'Pick a date',
  className,
}) {
  const autoId = useId()
  const inputId = id || autoId
  const rootRef = useRef(null)
  const selected = parseIsoDate(value)
  const today = useMemo(() => startOfDay(new Date()), [])
  const min = minDate ? startOfDay(minDate instanceof Date ? minDate : parseIsoDate(minDate) || today) : null
  const max = maxDate ? startOfDay(maxDate instanceof Date ? maxDate : parseIsoDate(maxDate) || today) : today

  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const base = selected || today
    return { year: base.getFullYear(), month: base.getMonth() }
  })

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!selected) return
    setView({ year: selected.getFullYear(), month: selected.getMonth() })
  }, [value])

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view.year, view.month])
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const isDisabledDay = (d) => {
    if (!d) return true
    const day = startOfDay(d)
    if (min && day < min) return true
    if (max && day > max) return true
    return false
  }

  const canPrev =
    !min || new Date(view.year, view.month, 1) > new Date(min.getFullYear(), min.getMonth(), 1)
  const canNext =
    !max ||
    new Date(view.year, view.month, 1) < new Date(max.getFullYear(), max.getMonth(), 1)

  const display = selected ? formatShortDate(selected) : placeholder
  const errorId = error ? `${inputId}-error` : undefined
  const helperId = helperText && !error ? `${inputId}-helper` : undefined

  return (
    <div ref={rootRef} className={cn('relative w-full sm:max-w-[280px]', className)}>
      {label && (
        <label htmlFor={inputId} className="ek-label block mb-2">
          {label}
        </label>
      )}

      <button
        id={inputId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={cn(errorId, helperId) || undefined}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'w-full min-h-[48px] px-3.5 rounded-lg border bg-surface dark:bg-surface-dark',
          'inline-flex items-center gap-2.5 text-left text-sm tracking-ek',
          'border-border dark:border-border-dark',
          'text-text-primary dark:text-text-dark-primary',
          'transition-[border-color,box-shadow] duration-200 ease-ek',
          'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          error && 'border-error focus:ring-error/25 focus:border-error',
          open && !error && 'ring-2 ring-primary/25 border-primary/40'
        )}
      >
        <CalendarDays
          className={cn(
            'h-4 w-4 shrink-0',
            error ? 'text-error' : 'text-primary'
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            'flex-1 truncate font-medium',
            !selected && 'font-normal text-text-muted dark:text-text-dark-muted'
          )}
        >
          {display}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Choose a date"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={spring.snappy}
            className={cn(
              'absolute z-50 mt-2 w-[min(100vw-2.5rem,300px)] left-0',
              'rounded-xl border border-border dark:border-border-dark',
              'bg-surface dark:bg-surface-dark shadow-lg',
              'p-3'
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <button
                type="button"
                aria-label="Previous month"
                disabled={!canPrev}
                onClick={() =>
                  setView((v) => {
                    const d = new Date(v.year, v.month - 1, 1)
                    return { year: d.getFullYear(), month: d.getMonth() }
                  })
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border dark:border-border-dark text-text-secondary hover:bg-surface-alt dark:hover:bg-surface-dark-alt disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-text-primary dark:text-text-dark-primary tabular-nums">
                {monthLabel}
              </p>
              <button
                type="button"
                aria-label="Next month"
                disabled={!canNext}
                onClick={() =>
                  setView((v) => {
                    const d = new Date(v.year, v.month + 1, 1)
                    return { year: d.getFullYear(), month: d.getMonth() }
                  })
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border dark:border-border-dark text-text-secondary hover:bg-surface-alt dark:hover:bg-surface-dark-alt disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="h-8 flex items-center justify-center text-[11px] font-medium text-text-muted dark:text-text-dark-muted"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <div key={`e-${i}`} className="h-9" />
                const iso = toIsoDate(d)
                const selectedDay = sameDay(d, selected)
                const isToday = sameDay(d, today)
                const dayDisabled = isDisabledDay(d)
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={dayDisabled}
                    onClick={() => {
                      onChange?.(iso)
                      setOpen(false)
                    }}
                    className={cn(
                      'h-9 rounded-md text-sm tabular-nums transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      dayDisabled && 'opacity-25 cursor-not-allowed',
                      !dayDisabled &&
                        !selectedDay &&
                        'text-text-primary dark:text-text-dark-primary hover:bg-primary/10',
                      selectedDay && 'bg-primary text-white font-semibold shadow-sm',
                      !selectedDay && isToday && 'ring-1 ring-inset ring-primary/40 font-medium'
                    )}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border dark:border-border-dark pt-2">
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline disabled:opacity-40"
                disabled={isDisabledDay(today)}
                onClick={() => {
                  onChange?.(toIsoDate(today))
                  setOpen(false)
                }}
              >
                Today
              </button>
              {selected && (
                <button
                  type="button"
                  className="text-xs font-medium text-text-muted hover:text-text-primary dark:hover:text-text-dark-primary"
                  onClick={() => {
                    onChange?.('')
                    setOpen(false)
                  }}
                >
                  Clear selection
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-error" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-xs text-text-muted dark:text-text-dark-muted">
          {helperText}
        </p>
      )}
    </div>
  )
}

export function isValidIsoDate(value) {
  return Boolean(parseIsoDate(value))
}

export function isoDateInRange(value, { minDate, maxDate } = {}) {
  const d = parseIsoDate(value)
  if (!d) return false
  const day = startOfDay(d)
  if (minDate) {
    const min = startOfDay(minDate instanceof Date ? minDate : parseIsoDate(minDate))
    if (min && day < min) return false
  }
  if (maxDate) {
    const max = startOfDay(maxDate instanceof Date ? maxDate : parseIsoDate(maxDate))
    if (max && day > max) return false
  }
  return true
}
