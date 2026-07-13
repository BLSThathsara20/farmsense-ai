import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sun } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Navbar } from '../components/layout/Navbar'
import { AnimatedHeadline } from '../components/landing/AnimatedHeadline'
import { TestimonialCarousel } from '../components/landing/TestimonialCarousel'
import { ProfitCounter, ScoreCounter } from '../components/landing/ProfitCounter'

const weekPlan = [
  { week: 'Now', action: 'Check your soil', detail: 'N, P, K and pH — takes 2 minutes' },
  { week: 'Week 3–4', action: 'Sow tomato', detail: 'Best match for your land right now' },
  { week: 'Week 8–10', action: 'Sell', detail: 'Price window opening — don\'t miss it' },
]

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function Landing() {
  const storyRef = useRef(null)

  const scrollToStory = () => {
    storyRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-page min-h-dvh bg-bg dark:bg-bg-dark overflow-x-hidden ek-page-grain">
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-bg-blob landing-bg-blob-1" />
        <div className="landing-bg-blob landing-bg-blob-2" />
        <div className="landing-bg-grain" />
      </div>

      <Navbar minimal />

      <section className="relative px-5 pt-6 pb-8 max-w-lg mx-auto lg:max-w-5xl lg:px-10">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
            <p className="landing-eyebrow mb-4">
              <Sun className="h-3.5 w-3.5 inline -mt-0.5 mr-1.5 text-accent" aria-hidden="true" />
              Crop planning for real farms
            </p>

            <AnimatedHeadline />

            <p className="text-base sm:text-lg text-text-secondary dark:text-text-dark-secondary leading-relaxed max-w-md mb-6 mt-5">
              One answer to the three questions that keep you up at night:{' '}
              <strong className="font-medium text-text-primary dark:text-text-dark-primary">
                what crop, when to sow, when to sell.
              </strong>
            </p>

            {/* Single hero CTA — mobile + desktop, no sticky duplicate */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-2">
              <Link to="/register" className="flex-1 sm:flex-none">
                <Button size="lg" className="w-full sm:w-auto landing-cta-primary">
                  Get my crop plan
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <button
                onClick={scrollToStory}
                className="text-sm text-text-secondary dark:text-text-dark-secondary hover:text-primary transition-colors min-h-[48px] sm:px-2"
              >
                How it works ↓
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.45, delay: 0.35 }}
            className="relative mt-6 lg:mt-0"
          >
            <div className="landing-plan-card">
              <div className="landing-plan-notch" aria-hidden="true" />

              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-primary/70 dark:text-primary-light/70 mb-1">
                    Your plan · Kandy
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl text-primary-dark dark:text-primary-light leading-none">
                    Tomato
                  </h2>
                </div>
                <div className="landing-score-ring" aria-label="92 percent suitability">
                  <ScoreCounter target={92} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="landing-stat-block">
                  <p className="text-[10px] uppercase tracking-wide text-text-muted dark:text-text-dark-muted mb-0.5">
                    You could make
                  </p>
                  <ProfitCounter target={4200} />
                </div>
                <div className="landing-stat-block landing-stat-block-accent">
                  <p className="text-[10px] uppercase tracking-wide text-accent/80 mb-0.5">
                    Best time to sell
                  </p>
                  <p className="font-mono text-xl sm:text-2xl font-medium text-accent">
                    Wk 8–10
                  </p>
                </div>
              </div>

              <div className="landing-plan-reason">
                <p className="text-sm text-text-secondary dark:text-text-dark-secondary leading-snug">
                  <span className="text-primary font-medium">Why tomato?</span>{' '}
                  Your soil pH and nutrients fit. Prices rising. Low oversupply in your district.
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-text-muted dark:text-text-dark-muted mt-3 font-mono">
              ↑ Real output from a 2-acre farm like yours
            </p>
          </motion.div>
        </div>
      </section>

      <section ref={storyRef} id="how-it-works" className="relative px-5 py-14 lg:py-20">
        <div className="max-w-lg mx-auto lg:max-w-3xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <h2 className="font-display text-2xl sm:text-3xl text-text-primary dark:text-text-dark-primary mb-2">
              Your week, mapped out
            </h2>
            <p className="text-text-secondary dark:text-text-dark-secondary">
              No spreadsheets. No guesswork. Just the next right move.
            </p>
          </motion.div>

          <div className="landing-timeline">
            {weekPlan.map(({ week, action, detail }, i) => (
              <motion.div
                key={week}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="landing-timeline-item"
              >
                <div className="landing-timeline-marker">
                  <span className="font-mono text-xs font-medium text-primary">{week}</span>
                </div>
                <div className="landing-timeline-content">
                  <h3 className="font-display text-lg text-text-primary dark:text-text-dark-primary">
                    {action}
                  </h3>
                  <p className="text-sm text-text-secondary dark:text-text-dark-secondary mt-0.5">
                    {detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 border-y border-border/60 dark:border-border-dark/60 bg-surface/50 dark:bg-surface-dark/30 backdrop-blur-sm">
        <div className="max-w-lg mx-auto lg:max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-widest text-text-muted dark:text-text-dark-muted mb-6">
            From farmers like you
          </p>
          <TestimonialCarousel />
        </div>
      </section>

      {/* Closing — soft nudge, no duplicate big button */}
      <section className="px-5 py-16 lg:py-20">
        <div className="max-w-lg mx-auto text-center lg:max-w-xl">
          <h2 className="font-display text-2xl sm:text-3xl text-text-primary dark:text-text-dark-primary mb-3">
            Ready before sunrise tomorrow?
          </h2>
          <p className="text-text-secondary dark:text-text-dark-secondary mb-6">
            Free to start. Works on any phone. Your data stays yours.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 text-primary font-semibold text-lg hover:gap-3 transition-all min-h-[48px]"
          >
            Start your crop plan
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-6 text-sm text-text-muted dark:text-text-dark-muted">
            Already farming with us?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <footer className="px-5 py-8 border-t border-border dark:border-border-dark">
        <div className="max-w-lg mx-auto lg:max-w-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="font-display text-primary font-semibold text-lg">FarmSense</span>
          <p className="text-sm text-text-muted dark:text-text-dark-muted">
            Built for farmers who work the land — not analysts who watch dashboards.
          </p>
        </div>
      </footer>
    </div>
  )
}
