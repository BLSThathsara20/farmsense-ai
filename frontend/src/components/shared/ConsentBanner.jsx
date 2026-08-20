import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Cookie, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { Toggle } from '../ui/Toggle'
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_OPEN_EVENT,
  getConsent,
  hasConsentDecision,
  saveConsent,
} from '../../lib/consent'
import { cn } from '../../lib/utils'

const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/privacy']

export function ConsentBanner() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [customise, setCustomise] = useState(false)
  const [preferences, setPreferences] = useState(true)

  const isPublic = publicPaths.includes(location.pathname)
  const hideOnPrivacyFirstVisit = location.pathname === '/privacy' && !hasConsentDecision()

  useEffect(() => {
    const sync = () => {
      const current = getConsent()
      if (current) setPreferences(Boolean(current.preferences))
      setVisible(!hasConsentDecision())
    }
    sync()
    const onChanged = () => sync()
    const onOpen = () => {
      const current = getConsent()
      setPreferences(current ? Boolean(current.preferences) : true)
      setCustomise(true)
      setVisible(true)
    }
    window.addEventListener(CONSENT_CHANGED_EVENT, onChanged)
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChanged)
      window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
    }
  }, [])

  const decide = (allowPreferences) => {
    saveConsent({ preferences: allowPreferences })
    setVisible(false)
    setCustomise(false)
  }

  if (!visible || hideOnPrivacyFirstVisit) return null

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-[70] px-3 pointer-events-none',
        isPublic
          ? 'bottom-3 sm:bottom-4'
          : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4'
      )}
    >
      <aside
        role="dialog"
        aria-modal="false"
        aria-labelledby="consent-title"
        className={cn(
          'pointer-events-auto mx-auto w-full max-w-2xl',
          'rounded-xl border border-border dark:border-border-dark',
          'bg-surface dark:bg-surface-dark shadow-card-hover',
          'p-4 sm:p-5'
        )}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Cookie className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="consent-title" className="text-sm font-semibold tracking-ek mb-1">
              Cookies &amp; privacy (UK)
            </h2>
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary leading-relaxed">
              FarmSense is built for UK farms. We store what we need to keep you signed in and
              run your crop plans. We do <strong>not</strong> use advertising cookies.
              Optional storage only remembers display settings on this device.{' '}
              <Link to="/privacy" className="text-primary font-medium hover:underline">
                Privacy notice
              </Link>
            </p>
          </div>
        </div>

        {customise && (
          <div className="mb-4 rounded-lg bg-surface-alt dark:bg-surface-dark-alt p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                  Essential
                </p>
                <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">
                  Sign-in, security, and saving your farm plans. Always on.
                </p>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-primary shrink-0 mt-1">
                Required
              </span>
            </div>
            <Toggle
              id="consent-preferences"
              checked={preferences}
              onChange={setPreferences}
              label="Remember display settings (theme and simple mode) on this device"
            />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2">
          <button
            type="button"
            className="sm:mr-auto text-sm text-text-secondary hover:text-text-primary dark:text-text-dark-secondary dark:hover:text-text-dark-primary min-h-[44px] px-1 text-left"
            onClick={() => setCustomise((v) => !v)}
          >
            {customise ? 'Hide choices' : 'Customise'}
          </button>
          <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => decide(false)}>
            Essential only
          </Button>
          <Button
            variant="accent"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => decide(customise ? preferences : true)}
          >
            Accept all
          </Button>
        </div>
      </aside>
    </div>
  )
}
