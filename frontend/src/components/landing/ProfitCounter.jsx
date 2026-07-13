import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { useCountUp } from '../../hooks/useCountUp'
import { formatCurrency } from '../../lib/utils'

export function ProfitCounter({ target = 4200 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const value = useCountUp(target, { duration: 1800, enabled: inView })

  return (
    <p
      ref={ref}
      className="font-mono text-xl sm:text-2xl font-medium text-text-primary dark:text-text-dark-primary landing-count-pop"
    >
      {formatCurrency(value)}
    </p>
  )
}

export function ScoreCounter({ target = 92 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const value = useCountUp(target, { duration: 1400, enabled: inView })

  return (
    <span
      ref={ref}
      className="font-mono text-sm font-medium text-primary-dark dark:text-primary-light"
    >
      {value}
    </span>
  )
}
