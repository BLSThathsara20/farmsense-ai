import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Leaf, Droplets, Sprout, Sparkles } from 'lucide-react'
import { getNutrientLabel, getPhColor } from '../ui/Slider'
import { LazyBackground } from './LazyBackground'
import { cn } from '../../lib/utils'
import { spring } from '../../lib/motion'

const loadPlanAsideBg = () => import('../../assets/backgrounds/plan-aside.webp')

const PANEL = {
  1: {
    kicker: 'Your land',
    headline: 'Where you farm',
    body: 'Map pin + farm size.',
  },
  2: {
    kicker: 'Soil food',
    headline: 'N · P · K',
    body: 'Low, Average, or High.',
  },
  3: {
    kicker: 'Soil feel',
    headline: 'pH & texture',
    body: 'What your soil feels like.',
  },
  4: {
    kicker: 'Crops',
    headline: 'Favourites',
    body: 'Optional — pick any you like.',
  },
  5: {
    kicker: 'Almost there',
    headline: 'Ready',
    body: 'Check, then build your plan.',
  },
}

function NutrientBars({ soilData }) {
  const rows = [
    { key: 'nitrogen', label: 'N · Leaves', color: 'bg-primary-light' },
    { key: 'phosphorus', label: 'P · Roots', color: 'bg-accent-light' },
    { key: 'potassium', label: 'K · Strength', color: 'bg-white/80' },
  ]
  return (
    <div className="space-y-4 mt-8">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/70">{row.label}</span>
            <span className="ek-mono-data text-white">{getNutrientLabel(soilData[row.key])}</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', row.color)}
              initial={false}
              animate={{ width: `${Math.min(100, soilData[row.key])}%` }}
              transition={spring.gentle}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function SoilLayers({ soilData }) {
  const texture = soilData.texture || 'Loamy'
  const layers = {
    Sandy: ['#d4a574', '#c4925a', '#b8844a'],
    Loamy: ['#5c4033', '#6b4f3a', '#8b6914'],
    Clay: ['#4a3728', '#3d2b1f', '#2c1810'],
    Silty: ['#9a7b4f', '#8a6a42', '#7a5a35'],
  }
  const colors = layers[texture] || layers.Loamy
  return (
    <div className="mt-8">
      <div className="rounded-xl overflow-hidden border border-white/20 shadow-card">
        {colors.map((c, i) => (
          <motion.div
            key={`${texture}-${i}`}
            className="h-14 first:h-16"
            style={{ backgroundColor: c }}
            initial={{ scaleY: 0.6, opacity: 0.5 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ ...spring.gentle, delay: i * 0.05 }}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-medium text-white">{texture} soil</p>
        <p className="ek-mono-data text-sm" style={{ color: getPhColor(soilData.ph) }}>
          pH {soilData.ph.toFixed(1)}
        </p>
      </div>
    </div>
  )
}

function CropOrbit({ preferences }) {
  const hasPicks = Boolean(preferences?.length)
  const picks = hasPicks ? preferences.slice(0, 8) : []
  const count = picks.length
  const radius = count <= 4 ? 96 : count <= 6 ? 104 : 112

  return (
    <div className="mt-10 relative h-64 w-full max-w-sm mx-auto flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(82,183,136,0.35), transparent 55%)',
        }}
        aria-hidden
      />
      <motion.div
        className="absolute w-44 h-44 rounded-full border border-white/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-60 h-60 rounded-full border border-white/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 64, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="relative z-20 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-primary text-white shadow-glow"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sprout className="h-7 w-7" />
      </motion.div>

      {!hasPicks && (
        <motion.div
          className="absolute left-1/2 top-[72%] z-10 -translate-x-1/2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ShinyBubble label="Any crop" floatDelay={0} />
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {picks.map((crop, i) => {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius

          return (
            <motion.div
              key={crop}
              className="absolute left-1/2 top-1/2 z-10"
              initial={{ opacity: 0, scale: 0.45, x, y }}
              animate={{ opacity: 1, scale: 1, x, y }}
              exit={{ opacity: 0, scale: 0.45 }}
              transition={{ ...spring.gentle, delay: 0.04 * i }}
              style={{ marginLeft: '-2.25rem', marginTop: '-2.25rem' }}
            >
              <ShinyBubble label={crop} floatDelay={i * 0.12} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function ShinyBubble({ label, floatDelay = 0 }) {
  const short = label.length > 8 ? `${label.slice(0, 7)}…` : label
  return (
    <motion.div
      className={cn(
        'relative flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-full',
        'border border-white/35 text-center px-1.5',
        'shadow-[0_10px_28px_rgba(0,0,0,0.4),inset_0_-10px_18px_rgba(0,40,20,0.18),inset_0_1px_1px_rgba(255,255,255,0.5)]',
        'backdrop-blur-md'
      )}
      style={{
        background: `
          radial-gradient(circle at 30% 24%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 6%, transparent 18%),
          radial-gradient(circle at 72% 78%, rgba(16, 60, 40, 0.22) 0%, transparent 42%),
          radial-gradient(circle at 48% 42%, rgba(255,255,255,0.42) 0%, rgba(180,230,200,0.22) 38%, rgba(255,255,255,0.12) 70%)
        `,
      }}
      animate={{ y: [0, -5, 0] }}
      transition={{
        duration: 2.8 + floatDelay,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: floatDelay,
      }}
      title={label}
    >
      {/* soft crescent catch-light — like a real droplet */}
      <span
        className="pointer-events-none absolute left-[18%] top-[14%] h-[22%] w-[38%] -rotate-[28deg] rounded-[100%] bg-white/70 blur-[1.5px]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute left-[28%] top-[20%] h-[8%] w-[12%] rounded-full bg-white/90 blur-[0.5px]"
        aria-hidden
      />
      <span className="relative z-[1] text-[11px] font-semibold leading-tight text-emerald-950">
        {short}
      </span>
    </motion.div>
  )
}


export function PlanVisualPanel({ step, soilData }) {
  const copy = PANEL[step] || PANEL[1]
  const Icon = step === 1 ? MapPin : step === 2 ? Leaf : step === 3 ? Droplets : step === 4 ? Sprout : Sparkles
  const loader = useCallback(() => loadPlanAsideBg(), [])

  return (
    <LazyBackground
      loader={loader}
      alt=""
      className={cn(
        'hidden lg:block',
        'border-l border-border dark:border-border-dark',
        'bg-[#052e16]',
        'sticky top-0 h-[calc(100dvh-7.5rem)]'
      )}
      contentClassName="h-full"
      imageClassName="object-cover object-center"
      overlayClassName="bg-gradient-to-br from-black/75 via-black/55 to-emerald-950/50"
    >
      <div className="relative z-10 flex flex-col justify-between h-full px-8 xl:px-10 py-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/35 px-2.5 py-1.5 backdrop-blur-sm">
            <Icon className="h-3.5 w-3.5 text-primary-light" />
            <span className="ek-label !normal-case tracking-ek !text-white/70">{copy.kicker}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring.gentle}
              className="mt-6"
            >
              <h2 className="ek-headline text-3xl xl:text-4xl text-white max-w-[16ch] drop-shadow-sm">
                {copy.headline}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/75 max-w-sm">{copy.body}</p>

              {step === 1 && (
                <div className="mt-10 rounded-xl border border-white/15 bg-black/40 p-5 backdrop-blur-md">
                  <p className="ek-label mb-2 !text-white/55">Pinned farm</p>
                  <p className="text-lg font-semibold tracking-ek leading-snug text-white">
                    {soilData.region || 'Set your location →'}
                  </p>
                  <p className="mt-3 ek-mono-data text-primary-light text-sm">{soilData.area} acres</p>
                </div>
              )}

              {step === 2 && <NutrientBars soilData={soilData} />}
              {step === 3 && <SoilLayers soilData={soilData} />}
              {step === 4 && <CropOrbit preferences={soilData.preferences} />}

              {step === 5 && (
                <div className="mt-10 space-y-3">
                  {[
                    soilData.region || 'Location',
                    `${getNutrientLabel(soilData.nitrogen)} N · ${getNutrientLabel(soilData.phosphorus)} P · ${getNutrientLabel(soilData.potassium)} K`,
                    soilData.texture
                      ? `${soilData.texture} · pH ${soilData.ph.toFixed(1)}`
                      : `pH ${soilData.ph.toFixed(1)}`,
                  ].map((line) => (
                    <div
                      key={line}
                      className="rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-[11px] text-white/50 leading-relaxed max-w-xs mt-10">
          Built for real farms — plain language, big taps, and advice you can act on in the field.
        </p>
      </div>
    </LazyBackground>
  )
}
