export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
      colors: {
        primary: { DEFAULT: '#16A34A', light: '#4ADE80', dark: '#15803D' },
        accent: { DEFAULT: '#CA8A04', light: '#FDE047' },
        surface: { DEFAULT: '#FFFFFF', alt: '#F4F4F5', dark: '#18181B', 'dark-alt': '#27272A' },
        bg: { DEFAULT: '#FAFAFA', dark: '#09090B' },
        border: { DEFAULT: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.09)' },
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
        info: '#2563EB',
        text: {
          primary: '#18181B',
          secondary: '#52525B',
          muted: '#A1A1AA',
          'dark-primary': '#FAFAFA',
          'dark-secondary': '#A1A1AA',
          'dark-muted': '#71717A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        ek: '-0.025em',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '24px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        dock: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        'dock-dark': '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
        glow: '0 0 0 1px rgba(22,163,74,0.2), 0 8px 24px rgba(22,163,74,0.08)',
      },
      transitionTimingFunction: {
        ek: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      animation: {
        'fade-in': 'fade-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
}
