import { cn } from '../../lib/utils'

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  showLabels = true,
  formatValue,
  className,
  id,
}) {
  const sliderId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const displayValue = formatValue ? formatValue(value) : value
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex items-center justify-between mb-3">
          <label
            htmlFor={sliderId}
            className="text-sm font-medium text-text-primary dark:text-text-dark-primary"
          >
            {label}
          </label>
          <span className="font-mono text-sm font-medium text-primary">{displayValue}</span>
        </div>
      )}
      <div className="relative">
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-primary/30 pointer-events-none"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          id={sliderId}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 w-full"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>
      {showLabels && (
        <div className="flex justify-between mt-2 text-xs text-text-muted dark:text-text-dark-muted">
          <span>{formatValue ? formatValue(min) : min}</span>
          <span>{formatValue ? formatValue(max) : max}</span>
        </div>
      )}
    </div>
  )
}

export function getNutrientLabel(value) {
  if (value <= 33) return 'Low'
  if (value <= 66) return 'Average'
  return 'High'
}

export function getPhColor(ph) {
  if (ph < 5.5) return '#C1121F'
  if (ph < 6.0) return '#E76F51'
  if (ph <= 7.0) return '#40916C'
  if (ph <= 7.5) return '#52B788'
  return '#4895EF'
}
