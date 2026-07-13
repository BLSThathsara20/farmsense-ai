export function SuitabilityBar({ score, label = 'Suitability' }) {
  const color =
    score >= 80 ? 'bg-success' : score >= 60 ? 'bg-primary' : score >= 40 ? 'bg-accent' : 'bg-warning'

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        {label ? (
          <span className="text-sm text-text-secondary dark:text-text-dark-secondary">{label}</span>
        ) : (
          <span />
        )}
        <span className="font-mono text-sm font-medium text-text-primary dark:text-text-dark-primary">
          {score}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-surface-alt dark:bg-surface-dark-alt overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label || 'Score'}: ${score}%`}
        />
      </div>
    </div>
  )
}
