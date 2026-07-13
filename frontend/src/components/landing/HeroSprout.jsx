/** Animated sprout SVG — grows in like a crop emerging at dawn */
export function HeroSprout({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Soil mound */}
      <ellipse
        cx="40"
        cy="88"
        rx="28"
        ry="8"
        className="landing-sprout-soil"
        fill="currentColor"
      />

      {/* Seed */}
      <ellipse
        cx="40"
        cy="82"
        rx="5"
        ry="3"
        className="landing-sprout-seed"
        fill="currentColor"
      />

      {/* Stem — grows upward */}
      <path
        d="M40 80 Q38 60 40 42 Q42 28 40 18"
        className="landing-sprout-stem"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left leaf */}
      <path
        d="M40 38 Q22 34 18 22 Q28 30 40 36"
        className="landing-sprout-leaf landing-sprout-leaf-left"
        fill="currentColor"
      />

      {/* Right leaf */}
      <path
        d="M40 32 Q58 26 62 14 Q52 24 40 30"
        className="landing-sprout-leaf landing-sprout-leaf-right"
        fill="currentColor"
      />

      {/* Dew sparkle */}
      <circle cx="52" cy="20" r="2" className="landing-sprout-dew" fill="currentColor" />
    </svg>
  )
}

/** Furrow line that draws beneath the accent word */
export function HeroFurrowLine({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M0 8 Q30 2 60 8 T120 6"
        className="landing-furrow-line"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
