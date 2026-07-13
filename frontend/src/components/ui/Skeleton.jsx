import { cn } from '../../lib/utils'

const variants = {
  text: 'h-4 rounded-sm',
  card: 'h-32 rounded-lg',
  circle: 'h-12 w-12 rounded-full',
  rectangle: 'h-20 rounded-md',
  stat: 'h-16 rounded-lg',
}

export function Skeleton({ variant = 'text', className, width }) {
  return (
    <div
      className={cn('skeleton-shimmer', variants[variant], className)}
      style={width ? { width } : undefined}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg p-[18px] bg-surface dark:bg-surface-dark shadow-card space-y-3">
      <Skeleton variant="text" className="w-1/3" />
      <Skeleton variant="text" className="w-2/3 h-6" />
      <Skeleton variant="rectangle" />
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <Skeleton variant="text" className="w-1/2 h-8" />
      <Skeleton variant="card" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton variant="stat" />
        <Skeleton variant="stat" />
        <Skeleton variant="stat" />
      </div>
      <Skeleton variant="card" className="h-24" />
    </div>
  )
}
