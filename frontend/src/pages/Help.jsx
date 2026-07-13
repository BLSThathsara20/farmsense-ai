import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle, ArrowLeft, CheckCircle2, UserPlus, Sprout, Settings } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SystemStatusPanel } from '../components/shared/SystemStatusPanel'
import { apiConfig } from '../api'

const steps = [
  {
    icon: UserPlus,
    title: '1. Register & sign in',
    body: 'Create an account with your email, password, and farm location. Your profile is saved in PostgreSQL — sign in again anytime to see the same data.',
  },
  {
    icon: Sprout,
    title: '2. Add soil readings (Plan)',
    body: 'Go to Plan, enter N, P, K, pH, and location. Submit once — the backend runs the Random Forest model and saves your recommendation run.',
  },
  {
    icon: CheckCircle2,
    title: '3. View your crop plan',
    body: 'Dashboard and Recommendations load from the database. Return a week later, sign in, and your saved soil + plans are still there.',
  },
  {
    icon: Settings,
    title: '4. Check Settings',
    body: 'Settings shows your profile, saved data counts (soil readings, recommendation runs), and system health (API, database, ML). Forgot password? Use the link on the sign-in page — we email a reset link via Resend (free).',
  },
]

export default function Help() {
  const [mockMode] = useState(apiConfig.useMock)

  return (
    <PageWrapper>
      <div className="mb-6">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h1 className="ek-headline text-2xl">Help guide</h1>
        </div>
        <p className="text-sm text-text-muted dark:text-text-dark-muted">
          Connect frontend to backend, register, and verify your data is saved.
        </p>
      </div>

      {mockMode && (
        <Card variant="highlight" className="mb-4">
          <p className="text-sm">
            <strong>Mock mode is on.</strong> Set <code className="text-xs bg-surface-alt px-1 rounded">VITE_USE_MOCK_API=false</code> in{' '}
            <code className="text-xs bg-surface-alt px-1 rounded">.env</code> and restart the dev server to use the real API.
          </p>
        </Card>
      )}

      <SystemStatusPanel className="mb-6" />

      <Card variant="bordered" className="mb-6">
        <h2 className="ek-label mb-4">Quick start</h2>
        <ol className="space-y-5">
          {steps.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-surface-alt dark:bg-surface-dark-alt flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-ek mb-1">{title}</h3>
                <p className="text-sm text-text-secondary dark:text-text-dark-secondary leading-relaxed">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card variant="bordered" className="mb-6">
        <h2 className="ek-label mb-3">Is my data saved?</h2>
        <p className="text-sm text-text-secondary dark:text-text-dark-secondary leading-relaxed mb-3">
          Yes. When mock mode is off, registration creates rows in <code className="text-xs">user_account</code> and{' '}
          <code className="text-xs">farm_profile</code>. Each soil submission adds a{' '}
          <code className="text-xs">soil_reading</code> and <code className="text-xs">recommendation_run</code>.
          Sign in days or weeks later — Settings → Saved data shows counts and dates from PostgreSQL.
        </p>
        <p className="text-sm text-text-muted">
          For demos: register → add soil → open Settings to confirm counts increased.
        </p>
      </Card>

      <Card variant="bordered" className="mb-6">
        <h2 className="ek-label mb-3">Run locally</h2>
        <pre className="text-xs bg-surface-alt dark:bg-surface-dark-alt p-4 rounded-lg overflow-x-auto leading-relaxed">
{`# Terminal 1 — database + API
cd farmsense-ai && docker compose up -d

# Terminal 2 — frontend
cd farmsense-ai/frontend && npm run dev

# Open http://localhost:5173`}
        </pre>
      </Card>

      <div className="flex gap-3">
        <Link to="/register" className="flex-1">
          <Button className="w-full">Create account</Button>
        </Link>
        <Link to="/settings" className="flex-1">
          <Button variant="secondary" className="w-full">
            Settings &amp; status
          </Button>
        </Link>
      </div>
    </PageWrapper>
  )
}
