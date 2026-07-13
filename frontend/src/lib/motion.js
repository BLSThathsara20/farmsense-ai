/** Spring presets inspired by polished product UI (snappy, intentional motion). */
export const spring = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  gentle: { type: 'spring', stiffness: 260, damping: 28 },
  bouncy: { type: 'spring', stiffness: 320, damping: 22 },
}

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: spring.gentle,
}

export const stagger = (delay = 0.04) => ({
  animate: { transition: { staggerChildren: delay } },
})

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: spring.snappy,
}
