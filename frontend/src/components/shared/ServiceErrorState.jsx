import { motion } from 'framer-motion'
import { Mail, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'
import { SUPPORT_CONTACT_EMAIL } from '../../lib/serviceError'
import { useBackendReconnect } from '../../hooks/useBackendReconnect'

/**
 * Friendly outage panel — contact support + limited auto-reconnect (max 5 health probes).
 */
export function ServiceErrorState({
  error,
  onRetry,
  onBack,
  onRecovered,
  backLabel = 'Back to sign in',
  className,
  enableReconnect = true,
}) {
  const email = error?.contactEmail || SUPPORT_CONTACT_EMAIL
  const reconnectEnabled = Boolean(enableReconnect && onRecovered && error)

  const reconnect = useBackendReconnect({
    enabled: reconnectEnabled,
    onRecovered,
  })

  if (!error) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('w-full max-w-[420px]', className)}
      role="alert"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 20% -10%, rgba(22,163,74,0.12), transparent 55%), linear-gradient(165deg, rgba(24,24,27,0.02), transparent 40%)',
          }}
        />

        <div className="relative p-7 sm:p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border dark:border-border-dark bg-surface-alt dark:bg-surface-dark-alt text-primary">
            <Mail className="h-5 w-5" strokeWidth={1.75} />
          </div>

          <h1 className="ek-headline text-2xl text-text-primary dark:text-text-dark-primary mb-2">
            {error.title || 'Something went wrong'}
          </h1>
          <p className="text-sm leading-relaxed text-text-secondary dark:text-text-dark-secondary mb-3">
            {error.description}
          </p>
          <p className="text-sm leading-relaxed text-text-secondary dark:text-text-dark-secondary mb-4">
            Please try again in a moment, or contact{' '}
            <a href={`mailto:${email}`} className="text-primary font-medium hover:underline">
              {email}
            </a>{' '}
            for help.
          </p>

          {reconnectEnabled && (
            <p className="text-xs text-text-muted dark:text-text-dark-muted mb-6 flex items-center justify-center gap-1.5 min-h-[1.25rem]">
              {reconnect.phase === 'recovered' ? (
                'Connection restored — continuing…'
              ) : reconnect.isExhausted ? (
                `Stopped auto-check after ${reconnect.maxAttempts} tries. Use Try again when ready.`
              ) : reconnect.attempt === 0 ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking connection soon…
                </>
              ) : (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking connection… {reconnect.attempt} of {reconnect.maxAttempts}
                </>
              )}
            </p>
          )}

          {!reconnectEnabled && <div className="mb-6" />}

          <div className="flex flex-col sm:flex-row gap-2.5">
            {onRetry && (
              <Button type="button" variant="accent" className="w-full sm:flex-1" onClick={onRetry}>
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            )}
            {onBack && (
              <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
