import { Badge } from '../ui/Badge'

const levelConfig = {
  low: { variant: 'success', label: 'Low risk' },
  medium: { variant: 'warning', label: 'Medium risk' },
  high: { variant: 'danger', label: 'High risk' },
}

export function RiskBadge({ level = 'low', risk }) {
  const config = levelConfig[level] || levelConfig.low

  return (
    <Badge variant={config.variant} size="sm">
      {risk !== undefined ? `${Math.round(risk * 100)}% · ${config.label}` : config.label}
    </Badge>
  )
}
