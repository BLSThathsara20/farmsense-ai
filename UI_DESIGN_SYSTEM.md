# FarmSense AI — UI design system

Reference for anyone editing the frontend. Source of truth also lives in:

- `frontend/src/styles/globals.css` (CSS variables)
- `frontend/tailwind.config.js` (Tailwind tokens)
- `frontend/src/config/theme.js` (JS theme object)

---

## Brand & product

| Item | Value |
|------|--------|
| Product name | **FarmSense** / FarmSense AI |
| Tone | Calm, practical, farmer-first — clear numbers, plain language |
| Default theme | System / light / dark (user preference in Settings) |

---

## Colours

### Brand & semantic

| Token | Hex | Tailwind / CSS | Use |
|-------|-----|----------------|-----|
| **Primary** | `#16A34A` | `primary` / `--color-primary` | Main actions, active nav, success-ish accents, brand green |
| **Primary light** | `#4ADE80` | `primary-light` | Dark-mode highlights, soft fills |
| **Primary dark** | `#15803D` | `primary-dark` | Hover / pressed primary |
| **Accent** | `#CA8A04` | `accent` | Forecast lines, secondary emphasis, warnings (warm) |
| **Accent light** | `#FDE047` | `accent-light` | Soft accent backgrounds |
| **Success** | `#16A34A` | `success` | Positive verdicts (“Good time to sell”) |
| **Warning** | `#D97706` | `warning` | Hold / wait states |
| **Error** | `#DC2626` | `error` | Failures, falling trends |
| **Info** | `#2563EB` | `info` | Neutral informational badges |

### Surfaces (light)

| Token | Hex / value | Use |
|-------|-------------|-----|
| **Background** | `#FAFAFA` | Page canvas |
| **Surface** | `#FFFFFF` | Cards, panels |
| **Surface alt** | `#F4F4F5` | Chip tracks, inset rows |
| **Border** | `rgba(0,0,0,0.08)` | Hairlines, card edges |
| **Text primary** | `#18181B` | Headings, body |
| **Text secondary** | `#52525B` | Supporting copy |
| **Text muted** | `#A1A1AA` | Labels, captions |

### Surfaces (dark)

| Token | Hex / value | Use |
|-------|-------------|-----|
| **Background** | `#09090B` | Page canvas |
| **Surface** | `#18181B` | Cards |
| **Surface alt** | `#27272A` | Chips, inset |
| **Border** | `rgba(255,255,255,0.09)` | Edges |
| **Text primary** | `#FAFAFA` | Headings |
| **Text secondary** | `#A1A1AA` | Supporting |
| **Text muted** | `#71717A` | Labels |

### Chart colours

| Series | Colour | Notes |
|--------|--------|--------|
| Past / history | `#2D6A4F` | Solid green line |
| Forecast | `#F4A261` | Dashed orange line |
| Soft band | `#52B788` @ ~12% opacity | Forecast uncertainty (never opaque) |

**Do not** use a full-opacity “lower” area fill in dark mode — it reads as a black block.

---

## Typography

| Role | Family | Tailwind | Weights | Use |
|------|--------|----------|---------|-----|
| **Body / UI** | Inter | `font-sans` | 400, 500, 600, 700 | Almost all UI text |
| **Display / headlines** | Inter (`font-display`) | `font-display` | 600–700 | Page titles, hero lines |
| **Data / numbers** | JetBrains Mono | `font-mono` / `.ek-mono-data` | 400–500 | Prices (£/kg), indices, MAPE, dates in tables |

Loaded in `frontend/index.html` from Google Fonts (Inter + JetBrains Mono).

### Type utilities

| Class | Role |
|-------|------|
| `.ek-headline` | Tight tracking, strong hierarchy |
| `.ek-label` | Uppercase micro-label (0.6875rem, muted) |
| `.ek-mono-data` | Tabular numbers for market / admin stats |

---

## Spacing & radius

| Token | Value | Use |
|-------|-------|-----|
| Page padding | `20px` (`--page-padding`) | Screen edges |
| Section gap | `24px` | Between major blocks |
| Card padding | `16px` | Default card inner |
| Radius sm | `6px` | Small controls |
| Radius md | `10px` | Inputs / buttons |
| Radius lg | `14px` | Cards |
| Radius xl | `20px` | Large panels |
| Chip / pill | `9999px` | Market crop chips |

---

## Shadows & motion

| Token | Value | Use |
|-------|-------|-----|
| Card | `0 1px 2px … + 1px border` | Default cards |
| Card hover | Soft lift + stronger shadow | Interactive cards |
| Glow | Green ring + soft green shadow | Accent primary buttons |
| Ease | `cubic-bezier(0.22, 1, 0.36, 1)` | `.ek-*` transitions, Framer Motion |

Prefer **2–3 intentional motions** per screen (fade/slide), not constant animation.

---

## Components (patterns)

| Pattern | Guidance |
|---------|----------|
| **Cards** | Prefer `Card` variants (`elevated`, `bordered`). Avoid card soup in heroes. |
| **Buttons** | `primary` (dark text-on-light / light-on-dark), `accent` (green CTA), `secondary`, `ghost`, `danger` |
| **Badges** | `success` / `warning` / `danger` / `accent` / `neutral` for sell verdicts & forecast tags |
| **Forms** | Full-width inputs, 44–48px touch targets, clear error text |
| **Nav** | Sidebar (md+) + bottom dock (mobile); admin uses AdminNav |

---

## Farmer-facing data language

Recommendations and Market should speak in **farmer units**, aligned with the four decision themes:

| Theme | Farmer sees | Avoid leading with |
|-------|-------------|--------------------|
| **Soil** | “X% match for this crop (N, P, K, pH…)” | “Random Forest probability” |
| **Weather** | Temp / rain / soil moisture in plain words | Raw model method names only |
| **Price** | **£/kg** and **£/100g** (DEFRA guide) + outlook | Index-only “238.4 idx” as the hero number |
| **Demand** | Local planting interest, search interest | Opaque “L4 score” alone |

Market chart / month list prefer **£/kg** when DEFRA data exists; index remains available as supporting context.

Always clarify: **farm-gate / wholesale guide ≠ supermarket shelf price**.

---

## Breakpoints

| Name | Width |
|------|-------|
| `xs` | 480px |
| `sm` | 640px (Tailwind default) |
| `md` | 768px |
| `lg` | 1024px |

---

## File map

```
frontend/
  index.html                 ← fonts
  tailwind.config.js         ← colour / font tokens
  src/config/theme.js        ← JS mirror of tokens
  src/styles/globals.css     ← CSS variables + .ek-* utilities
  src/components/ui/         ← Button, Card, Badge, Input…
  src/components/charts/     ← PriceChart, SuitabilityBar
```

When adding a new colour or font, update **all three**: `globals.css`, `tailwind.config.js`, and `theme.js`, then this document.
