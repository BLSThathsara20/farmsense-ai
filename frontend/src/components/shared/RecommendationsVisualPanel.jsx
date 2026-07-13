import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sprout, Sparkles } from 'lucide-react'
import { LazyBackground } from './LazyBackground'
import { formatCurrency } from '../../lib/utils'
import { cn } from '../../lib/utils'
import { spring } from '../../lib/motion'

const loadRecsAsideBg = () => import('../../assets/backgrounds/recommendations-aside.webp')

/**
 * Full-height visual plane for Recommendations (desktop).
 * The succulent photo is the dominant edge-to-edge surface — not a card.
 */
export function RecommendationsVisualPanel({ crop, confidence, profitEstimate, isFinalized }) {
  const loader = useCallback(() => loadRecsAsideBg(), [])

  return (
    <LazyBackground
      loader={loader}
      alt=""
      className={cn(
        'hidden lg:block w-[min(42%,440px)] shrink-0',
        'border-l border-border dark:border-border-dark',
        'bg-[#052e16]',
        'sticky top-0 h-dvh'
      )}
      contentClassName="h-full"
      imageClassName="object-cover object-[center_35%] scale-[1.02]"
      overlayClassName="bg-gradient-to-t from-black/85 via-black/35 to-black/20"
    >
      <div className="relative z-10 flex flex-col justify-between h-full px-8 xl:px-10 py-10">
        <div className="inline-flex items-center gap-2 self-start rounded-md border border-white/15 bg-black/30 px-2.5 py-1.5 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
          <span className="ek-label !normal-case tracking-ek !text-white/75">
            {isFinalized ? 'Finalized plan' : 'Recommended'}
          </span>
        </div>

        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={crop || 'crop'}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring.gentle}
            >
              <p className="ek-label !text-white/55 mb-2">Focus crop</p>
              <h2 className="font-display text-4xl xl:text-5xl font-semibold text-white tracking-tight leading-[1.05] drop-shadow-sm">
                {crop || 'Your plan'}
              </h2>
              {confidence != null && (
                <p className="mt-4 text-sm text-white/80">
                  <span className="font-mono text-lg text-white">{confidence}%</span>
                  <span className="text-white/55"> confidence</span>
                </p>
              )}
              {profitEstimate != null && (
                <p className="mt-1 text-sm text-emerald-100/90">
                  {formatCurrency(profitEstimate)}
                  <span className="text-white/50"> est. profit</span>
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          <p className="mt-8 text-sm text-white/60 leading-relaxed max-w-[22rem]">
            Grown from your soil, weather outlook, and market signals — pick what fits this season.
          </p>
        </div>
      </div>
    </LazyBackground>
  )
}

/** Compact full-bleed hero for mobile / tablet. */
export function RecommendationsHero({
  crop,
  confidence,
  profitEstimate,
  isFinalized,
  runLabel,
  actions,
}) {
  const loader = useCallback(() => loadRecsAsideBg(), [])

  return (
    <LazyBackground
      loader={loader}
      alt=""
      className="w-full min-h-[220px] sm:min-h-[260px] rounded-none lg:hidden"
      imageClassName="object-cover object-[center_30%]"
      overlayClassName="bg-gradient-to-t from-black/80 via-black/45 to-black/25"
      contentClassName="min-h-[220px] sm:min-h-[260px] flex flex-col justify-between px-5 py-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/30 px-2.5 py-1 backdrop-blur-sm">
          <Sprout className="h-3.5 w-3.5 text-emerald-200" />
          <span className="text-[11px] font-medium text-white/80">
            {isFinalized ? 'Finalized' : 'Your crop plan'}
          </span>
        </div>
        {actions}
      </div>

      <div>
        {runLabel && <p className="text-[11px] text-white/55 mb-1">{runLabel}</p>}
        <h1 className="font-display text-3xl font-semibold text-white tracking-tight drop-shadow-sm">
          {crop || 'Crop plan'}
        </h1>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-white/80">
          {confidence != null && (
            <span>
              <span className="font-mono text-white">{confidence}%</span> match
            </span>
          )}
          {profitEstimate != null && (
            <span className="text-emerald-100/90">{formatCurrency(profitEstimate)} est.</span>
          )}
        </div>
      </div>
    </LazyBackground>
  )
}
