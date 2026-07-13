import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

const testimonials = [
  {
    id: 1,
    quote:
      'I used to ask three neighbours and still wasn\'t sure. Now I check one screen before breakfast.',
    author: 'Savindu',
    role: 'Smallholder · 2 acres',
    region: 'Central Province, Sri Lanka',
  },
  {
    id: 2,
    quote:
      'The sell window alert saved me. I waited one extra week and got 12% more for my chili.',
    author: 'Maria',
    role: 'Vegetable farmer · 5 acres',
    region: 'Nairobi East, Kenya',
  },
  {
    id: 3,
    quote:
      'My son set it up in minutes. I just follow the plan — sow week, sell week. Simple.',
    author: 'Rajesh',
    role: 'Family farm · 8 acres',
    region: 'Punjab, India',
  },
]

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
}

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [paused, setPaused] = useState(false)

  const go = useCallback(
    (next) => {
      setDirection(next > index ? 1 : -1)
      setIndex((next + testimonials.length) % testimonials.length)
    },
    [index]
  )

  const prev = () => go(index - 1)
  const next = () => go(index + 1)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      setDirection(1)
      setIndex((i) => (i + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [paused])

  const current = testimonials[index]

  return (
    <div
      className="landing-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="landing-carousel-track" aria-live="polite">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.blockquote
            key={current.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="landing-quote m-0"
          >
            <p className="font-display text-xl sm:text-2xl text-text-primary dark:text-text-dark-primary leading-snug mb-5 min-h-[4.5rem] sm:min-h-[5rem]">
              "{current.quote}"
            </p>
            <footer>
              <cite className="not-italic block">
                <span className="font-medium text-text-primary dark:text-text-dark-primary">
                  {current.author}
                </span>
                <span className="text-sm text-text-muted dark:text-text-dark-muted">
                  {' '}
                  · {current.role}
                </span>
              </cite>
              <p className="text-xs text-text-muted dark:text-text-dark-muted mt-1 font-mono">
                {current.region}
              </p>
            </footer>
          </motion.blockquote>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mt-6 gap-4">
        <div className="flex gap-2" role="tablist" aria-label="Testimonials">
          {testimonials.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={i === index}
              aria-label={`Testimonial ${i + 1}`}
              onClick={() => go(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300 min-w-[32px] min-h-[32px] flex items-center justify-center'
              )}
            >
              <span
                className={cn(
                  'block rounded-full transition-all duration-300',
                  i === index
                    ? 'w-6 h-2 bg-primary'
                    : 'w-2 h-2 bg-border dark:bg-border-dark hover:bg-primary/40'
                )}
              />
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            className="landing-carousel-btn"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next testimonial"
            className="landing-carousel-btn"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-5 mt-6 pt-6 border-t border-border/50 dark:border-border-dark/50 text-sm font-mono text-text-secondary dark:text-text-dark-secondary">
        <span>
          <strong className="text-primary">12</strong> countries
        </span>
        <span>
          <strong className="text-primary">2 min</strong> to start
        </span>
      </div>
    </div>
  )
}
