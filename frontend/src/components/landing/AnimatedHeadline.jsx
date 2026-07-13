import { motion } from 'framer-motion'
import { HeroSprout, HeroFurrowLine } from './HeroSprout'

const line1 = ['See', 'your', 'plan']
const line2 = ['before']
const line3 = ['you', 'plant', 'a', 'single', 'seed.']

const wordVariant = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: 0.15 + i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
}

export function AnimatedHeadline() {
  let wordIndex = 0

  return (
    <div className="landing-headline-wrap">
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="landing-sprout-float"
      >
        <HeroSprout className="landing-sprout-icon text-primary dark:text-primary-light" />
      </motion.div>

      <h1 className="ek-headline text-[2.35rem] leading-[1.08] sm:text-5xl lg:text-[3.25rem] text-text-primary dark:text-text-dark-primary font-semibold">
        <span className="block mb-1">
          {line1.map((word) => {
            const i = wordIndex++
            return (
              <motion.span
                key={word}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={wordVariant}
                className="inline-block mr-[0.28em]"
              >
                {word}
              </motion.span>
            )
          })}
        </span>

        <span className="block mb-1 relative">
          {line2.map((word) => {
            const i = wordIndex++
            return (
              <motion.span
                key={word}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={wordVariant}
                className="landing-headline-accent inline-block relative"
              >
                {word}
                <HeroFurrowLine className="landing-furrow-svg text-primary/50 dark:text-primary-light/40" />
              </motion.span>
            )
          })}
        </span>

        <span className="block">
          {line3.map((word) => {
            const i = wordIndex++
            return (
              <motion.span
                key={`${word}-${i}`}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={wordVariant}
                className="inline-block mr-[0.28em]"
              >
                {word}
              </motion.span>
            )
          })}
        </span>
      </h1>
    </div>
  )
}
