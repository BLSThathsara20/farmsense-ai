import { cn } from '../../lib/utils'

export function Input({
  label,
  error,
  success,
  helperText,
  icon: Icon,
  id,
  className,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${inputId}-error` : undefined
  const successId = success && !error ? `${inputId}-success` : undefined
  const helperId = helperText && !error && !success ? `${inputId}-helper` : undefined

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="ek-label block mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            className={cn(
              'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4',
              error
                ? 'text-error'
                : success
                  ? 'text-primary'
                  : 'text-text-muted dark:text-text-dark-muted'
            )}
            aria-hidden="true"
          />
        )}
        <input
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={cn(errorId, successId, helperId) || undefined}
          className={cn(
            'w-full h-11 px-3.5 rounded-md border bg-surface dark:bg-surface-dark',
            'text-sm text-text-primary dark:text-text-dark-primary tracking-ek',
            'border-border dark:border-border-dark',
            'placeholder:text-text-muted dark:placeholder:text-text-dark-muted',
            'transition-[border-color,box-shadow] duration-200 ease-ek',
            'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40',
            'min-h-[44px]',
            Icon && 'pl-10',
            error && 'border-error focus:ring-error/25 focus:border-error',
            !error && success && 'border-primary focus:ring-primary/25 focus:border-primary',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-error" role="alert">
          {error}
        </p>
      )}
      {success && !error && (
        <p id={successId} className="mt-1.5 text-xs text-primary">
          {success}
        </p>
      )}
      {helperText && !error && !success && (
        <p id={helperId} className="mt-1.5 text-xs text-text-muted dark:text-text-dark-muted">
          {helperText}
        </p>
      )}
    </div>
  )
}
