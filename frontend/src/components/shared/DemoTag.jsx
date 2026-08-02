import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'

/** Visible label whenever sample / fallback demo content is on screen. */
export function DemoTag({ className }) {
  return (
    <Badge variant="warning" size="sm" className={cn('shrink-0', className)}>
      Demo
    </Badge>
  )
}
