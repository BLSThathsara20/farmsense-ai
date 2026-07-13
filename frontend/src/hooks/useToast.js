import { useCallback } from 'react'
import { useNotificationStore } from '../store/notificationStore'

export function useToast() {
  const addToast = useNotificationStore((s) => s.addToast)
  const dismiss = useNotificationStore((s) => s.removeToast)

  const success = useCallback(
    (title, message, duration) => addToast({ type: 'success', title, message, duration }),
    [addToast]
  )
  const error = useCallback(
    (title, message, duration) => addToast({ type: 'error', title, message, duration }),
    [addToast]
  )
  const warning = useCallback(
    (title, message, duration) => addToast({ type: 'warning', title, message, duration }),
    [addToast]
  )
  const info = useCallback(
    (title, message, duration) => addToast({ type: 'info', title, message, duration }),
    [addToast]
  )

  return { success, error, warning, info, dismiss }
}
