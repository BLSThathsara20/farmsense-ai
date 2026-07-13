import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/utils'
import { spring } from '../../lib/motion'

export function ThemeToggle({ className }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.94 }}
      transition={spring.snappy}
      className={cn(
        'relative flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg',
        'border border-border dark:border-border-dark bg-surface/60 dark:bg-surface-dark/60',
        'hover:bg-surface-alt dark:hover:bg-surface-dark-alt transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ opacity: 0, rotate: -40, scale: 0.85 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 40, scale: 0.85 }}
          transition={spring.snappy}
        >
          {isDark ? (
            <Moon className="h-4 w-4 text-text-dark-secondary" />
          ) : (
            <Sun className="h-4 w-4 text-text-secondary" />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}
