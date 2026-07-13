import { Badge } from '../ui/Badge'
import { Cloud, CloudRain, Sun } from 'lucide-react'

const weatherConfig = {
  sunny: { icon: Sun, label: 'Sunny', variant: 'accent' },
  cloudy: { icon: Cloud, label: 'Cloudy', variant: 'neutral' },
  rainy: { icon: CloudRain, label: 'Rainy', variant: 'info' },
}

export function WeatherBadge({ condition = 'sunny', temp }) {
  const config = weatherConfig[condition] || weatherConfig.sunny
  const Icon = config.icon

  return (
    <Badge variant={config.variant} size="md" className="gap-1.5">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {temp ? `${temp}°C · ${config.label}` : config.label}
    </Badge>
  )
}
