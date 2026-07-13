import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { spring } from '../../lib/motion'

export function PageWrapper({ children, className, noPadding = false }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.gentle}
      className={cn(
        'flex-1 w-full max-w-3xl mx-auto min-w-0 overflow-x-hidden relative z-[1]',
        !noPadding && 'px-5 py-6 pb-28 md:pb-8',
        'lg:max-w-none lg:px-8',
        className
      )}
    >
      {children}
    </motion.main>
  )
}
