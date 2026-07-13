import { Button } from '../ui/Button'

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && (
        <div className="mb-4 p-4 rounded-full bg-surface-alt dark:bg-surface-dark-alt">
          <Icon className="h-10 w-10 text-primary" aria-hidden="true" />
        </div>
      )}
      <h3 className="font-display text-xl text-text-primary dark:text-text-dark-primary mb-2">
        {title}
      </h3>
      <p className="text-text-secondary dark:text-text-dark-secondary max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="mb-4 text-4xl" aria-hidden="true">
        🌱
      </div>
      <h3 className="font-display text-xl text-text-primary dark:text-text-dark-primary mb-2">
        Something went wrong
      </h3>
      <p className="text-text-secondary dark:text-text-dark-secondary max-w-sm mb-6">
        {message || "We couldn't load your data right now. Please try again."}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          Try again
        </Button>
      )}
    </div>
  )
}
