import { Users, Shield } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { SkeletonDashboard } from '../components/ui/Skeleton'
import { ErrorState } from '../components/shared/EmptyState'
import { SectionHeader } from '../components/shared/SectionHeader'
import { RiskBadge } from '../components/shared/RiskBadge'
import { PopularityBar } from '../components/charts/PriceChart'
import { useCommunityData } from '../hooks/useMockData'
import { useAuthStore } from '../store/authStore'

export default function Community() {
  const { loading, error, retry, districtData } = useCommunityData()
  const user = useAuthStore((s) => s.user)

  if (loading) {
    return (
      <PageWrapper>
        <SkeletonDashboard />
      </PageWrapper>
    )
  }

  if (error) {
    return (
      <PageWrapper>
        <ErrorState message={error} onRetry={retry} />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <SectionHeader
        title={`In ${districtData.district} this week`}
        subtitle={`Community planting data · ${districtData.week}`}
      />

      <Card variant="elevated" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-medium text-text-primary dark:text-text-dark-primary">
            What farmers are planting
          </h2>
        </div>
        <div className="space-y-4">
          {districtData.cropPopularity
            .filter((c) => c.crop !== 'Other')
            .map((item) => (
              <PopularityBar key={item.crop} crop={item.crop} percentage={item.percentage} />
            ))}
        </div>
      </Card>

      <Card variant="bordered" className="mb-6">
        <h2 className="font-medium text-text-primary dark:text-text-dark-primary mb-4">
          Oversupply risk by crop
        </h2>
        <div className="space-y-3">
          {districtData.oversupplyRisk.map((item) => (
            <div
              key={item.crop}
              className="flex items-center justify-between py-2 border-b border-border dark:border-border-dark last:border-0"
            >
              <span className="text-sm text-text-primary dark:text-text-dark-primary">
                {item.crop}
              </span>
              <RiskBadge level={item.level} risk={item.risk} />
            </div>
          ))}
        </div>
      </Card>

      <Card variant="highlight" className="bg-primary/5">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-text-primary dark:text-text-dark-primary mb-1">
              Your contribution
            </h3>
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
              {user?.name || 'Your'} anonymous soil and planting data helps{' '}
              {districtData.cropPopularity.reduce((sum, c) => sum + c.farmers, 0)} farmers in{' '}
              {districtData.district} make better decisions. No personal information is ever
              shared.
            </p>
          </div>
        </div>
      </Card>
    </PageWrapper>
  )
}
