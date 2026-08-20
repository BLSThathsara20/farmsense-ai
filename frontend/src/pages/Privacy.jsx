import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'
import { Card } from '../components/ui/Card'
import { openConsentPreferences } from '../lib/consent'

export default function Privacy() {
  return (
    <div className="min-h-dvh bg-bg dark:bg-bg-dark ek-page-grain">
      <Navbar />
      <main className="max-w-2xl mx-auto px-5 py-8 pb-28">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="ek-headline text-2xl">Privacy notice</h1>
        </div>
        <p className="text-sm text-text-muted dark:text-text-dark-muted mb-6">
          UK GDPR · PECR · FarmSense AI student project
        </p>

        <Card variant="bordered" className="mb-4 space-y-3">
          <h2 className="text-sm font-semibold">Who we are</h2>
          <p className="text-sm text-text-secondary dark:text-text-dark-secondary leading-relaxed">
            FarmSense AI is a Northumbria University undergraduate Computing project
            (LD6053). It is a decision-support tool for UK smallholders — not a commercial
            data company. This notice explains what we store and why, in plain English.
          </p>
        </Card>

        <Card variant="bordered" className="mb-4 space-y-3">
          <h2 className="text-sm font-semibold">What we collect</h2>
          <ul className="text-sm text-text-secondary dark:text-text-dark-secondary leading-relaxed list-disc pl-5 space-y-1.5">
            <li>Account: name, email, hashed password</li>
            <li>Farm: district / location you choose, farm size</li>
            <li>Plans: soil readings (N, P, K, pH) and crop recommendations</li>
            <li>Community: anonymised district crop counts only — not your name</li>
          </ul>
        </Card>

        <Card variant="bordered" className="mb-4 space-y-3">
          <h2 className="text-sm font-semibold">Cookies and device storage</h2>
          <p className="text-sm text-text-secondary dark:text-text-dark-secondary leading-relaxed">
            We use essential storage to keep you signed in and to run the app (UK PECR:
            strictly necessary). Optional storage remembers display settings such as theme
            and simple mode. We do not use advertising cookies or sell your data.
          </p>
          <button
            type="button"
            onClick={openConsentPreferences}
            className="text-sm text-primary font-medium hover:underline"
          >
            Change cookie choices
          </button>
        </Card>

        <Card variant="bordered" className="mb-4 space-y-3">
          <h2 className="text-sm font-semibold">Location and live UK data</h2>
          <p className="text-sm text-text-secondary dark:text-text-dark-secondary leading-relaxed">
            Location is only used when you search a place, enter a postcode, or allow GPS
            in your browser. Weather and price layers use open sources such as Open-Meteo
            and GOV.UK / Defra indices. Your browser may also ask permission for GPS —
            that is separate from this cookie banner.
          </p>
        </Card>

        <Card variant="bordered" className="mb-4 space-y-3">
          <h2 className="text-sm font-semibold">Your rights (UK GDPR)</h2>
          <p className="text-sm text-text-secondary dark:text-text-dark-secondary leading-relaxed">
            You can ask to see, correct, or delete your account data. Sign out from
            Settings. For this student project, contact the project owner through your
            university supervisor channel, or use the in-app Help page if you are signed in.
          </p>
        </Card>

        <p className="text-xs text-text-muted dark:text-text-dark-muted leading-relaxed">
          Last updated August 2026. This is a student prototype notice, not legal advice.
          A live public service would add a full controller address and retention policy.
        </p>
      </main>
    </div>
  )
}
