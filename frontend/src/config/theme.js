export const theme = {
  fonts: {
    sans: "'Inter', system-ui, sans-serif",
    display: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },

  colors: {
    primary: '#16A34A',
    primaryLight: '#4ADE80',
    primaryDark: '#15803D',
    accent: '#CA8A04',
    accentLight: '#FDE047',

    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',

    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceAlt: '#F4F4F5',
    border: 'rgba(0,0,0,0.08)',
    textPrimary: '#18181B',
    textSecondary: '#52525B',
    textMuted: '#A1A1AA',

    dark: {
      background: '#09090B',
      surface: '#18181B',
      surfaceAlt: '#27272A',
      border: 'rgba(255,255,255,0.09)',
      textPrimary: '#FAFAFA',
      textSecondary: '#A1A1AA',
      textMuted: '#71717A',
    },
  },

  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    full: '9999px',
  },

  shadows: {
    card: '0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
    cardHover: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
    dock: '0 8px 32px rgba(0,0,0,0.12)',
  },

  spacing: {
    pagePadding: '20px',
    sectionGap: '24px',
    cardPadding: '16px',
  },

  animation: {
    fast: '150ms cubic-bezier(0.22, 1, 0.36, 1)',
    normal: '250ms cubic-bezier(0.22, 1, 0.36, 1)',
    slow: '400ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
}
