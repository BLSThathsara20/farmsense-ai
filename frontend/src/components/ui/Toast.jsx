import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { cn } from '../../lib/utils'

const config = {
  success: {
    icon: CheckCircle2,
    bar: 'bg-success',
    iconColor: 'text-success',
    border: 'border-success/20',
    bg: 'bg-success/5',
  },
  error: {
    icon: XCircle,
    bar: 'bg-error',
    iconColor: 'text-error',
    border: 'border-error/20',
    bg: 'bg-error/5',
  },
  warning: {
    icon: AlertTriangle,
    bar: 'bg-accent',
    iconColor: 'text-accent',
    border: 'border-accent/30',
    bg: 'bg-accent/5',
  },
  info: {
    icon: Info,
    bar: 'bg-info',
    iconColor: 'text-info',
    border: 'border-info/20',
    bg: 'bg-info/5',
  },
}

function ToastItem({ toast, onDismiss }) {
  const { type, title, message, duration, id } = toast
  const { icon: Icon, bar, iconColor, border, bg } = config[type] || config.info

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.96 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      role="alert"
      aria-live="polite"
      className={cn(
        'relative overflow-hidden w-full max-w-sm pointer-events-auto',
        'rounded-lg border shadow-card-hover backdrop-blur-md',
        'bg-surface/95 dark:bg-surface-dark/95',
        border,
        bg
      )}
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColor)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-text-primary dark:text-text-dark-primary">
            {title}
          </p>
          {message && (
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary mt-0.5 leading-snug">
              {message}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(id)}
          className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-surface-alt dark:hover:bg-surface-dark-alt min-h-[32px] min-w-[32px] flex items-center justify-center"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4 text-text-muted dark:text-text-dark-muted" />
        </button>
      </div>
      {duration > 0 && (
        <motion.div
          className={cn('absolute bottom-0 left-0 h-0.5', bar)}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  )
}

export function Toaster() {
  const toasts = useNotificationStore((s) => s.toasts)
  const removeToast = useNotificationStore((s) => s.removeToast)

  return (
    <div
      aria-label="Notifications"
      className={cn(
        'fixed z-[100] flex flex-col gap-2 pointer-events-none',
        'top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm',
        'md:top-6 md:right-6',
        'pb-[env(safe-area-inset-top)]'
      )}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
