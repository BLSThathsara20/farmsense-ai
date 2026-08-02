import { useEffect, useState } from 'react'
import { Type, Eye } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../api'
import {
  applySimpleModeToDom,
  hasSeenSimpleModePrompt,
  markSimpleModePrompted,
} from '../../hooks/useSimpleMode'
import { isAdminUser } from '../../lib/roles'

/**
 * One-shot prompt for farmers who have not chosen Simple Mode yet
 * (new accounts after register, or existing accounts before this feature).
 */
export function SimpleModePrompt({ forceOpen = false, onDone } = {}) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user || isAdminUser(user)) {
      setOpen(false)
      return
    }
    if (forceOpen) {
      setOpen(true)
      return
    }
    if (user.simpleMode) {
      markSimpleModePrompted()
      setOpen(false)
      return
    }
    if (!hasSeenSimpleModePrompt()) {
      setOpen(true)
    }
  }, [isAuthenticated, user, forceOpen])

  const finish = async (enable) => {
    setBusy(true)
    try {
      if (enable) {
        const res = await authService.updatePreferences({ simpleMode: true })
        const next = res?.user || { ...user, simpleMode: true }
        updateProfile(next)
        applySimpleModeToDom(true)
      }
      markSimpleModePrompted()
      setOpen(false)
      onDone?.(enable)
    } catch {
      markSimpleModePrompted()
      setOpen(false)
      onDone?.(false)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="simple-mode-title"
    >
      <div className="w-full max-w-md rounded-xl bg-surface dark:bg-surface-dark shadow-xl border border-border dark:border-border-dark p-6">
        <h2 id="simple-mode-title" className="text-xl font-semibold ek-headline mb-2">
          Simple mode?
        </h2>
        <p className="text-base text-text-secondary dark:text-text-dark-secondary mb-4">
          Make FarmSense easier to read and use.
        </p>
        <ul className="space-y-3 mb-6 text-base">
          <li className="flex gap-3 items-start">
            <Type className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <span>Bigger text so it is easier to see</span>
          </li>
          <li className="flex gap-3 items-start">
            <Eye className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <span>Only the most important information on each page</span>
          </li>
        </ul>
        <p className="text-sm text-text-muted mb-4" data-detail>
          You can change this later in Settings.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => finish(true)}
            className="w-full min-h-[52px] rounded-md bg-primary text-white font-semibold text-base disabled:opacity-60"
          >
            Turn on Simple mode
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => finish(false)}
            className="w-full min-h-[52px] rounded-md bg-surface-alt dark:bg-surface-dark-alt text-text-primary dark:text-text-dark-primary font-medium text-base disabled:opacity-60"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
