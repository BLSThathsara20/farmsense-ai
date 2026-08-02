import { Users, Shield, Sprout } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { SkeletonDashboard } from '../components/ui/Skeleton'
import { ErrorState, EmptyState } from '../components/shared/EmptyState'
import { SectionHeader } from '../components/shared/SectionHeader'
import { DemoTag } from '../components/shared/DemoTag'
import { RiskBadge } from '../components/shared/RiskBadge'
import { PopularityBar } from '../components/charts/PriceChart'
import { useCommunityData } from '../hooks/useMockData'
import { useAuthStore } from '../store/authStore'
import { apiConfig } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Community() {
  const navigate = useNavigate()
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

  const popularity = districtData?.cropPopularity || []
  const risks = districtData?.oversupplyRisk || []
  const isEmpty = Boolean(districtData?.empty) || popularity.length === 0
  const showDemoTag = Boolean(districtData?.demo) || apiConfig.useMock
  const farmerCount = popularity.reduce((sum, c) => sum + (c.farmers || 0), 0)

  return (
    <PageWrapper>
      <div className="flex items-start justify-between gap-3 mb-1">
        <SectionHeader
          className="mb-0 flex-1"
          title={`In ${districtData?.district || user?.district || 'your district'} this week`}
          subtitle={`Community planting data · ${districtData?.week || '—'}`}
        />
        {showDemoTag && <DemoTag className="mt-1" />}
      </div>

      {showDemoTag && districtData?.message && (
        <p className="text-xs text-warning mb-4" data-detail>
          {districtData.message}
        </p>
      )}

      {isEmpty ? (
        <EmptyState
          icon={Sprout}
          title="No planting data yet"
          description={
            districtData?.message ||
            'Counts appear after farmers in this district finalize crop plans. Or turn on Demo data mode in Settings to preview the screen.'
          }
          actionLabel={user?.demoDataMode ? 'Go to Plans' : 'Open Settings'}
          onAction={() => navigate(user?.demoDataMode ? '/plans' : '/settings')}
        />
      ) : (
        <>
          <Card variant="elevated" className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-medium text-text-primary dark:text-text-dark-primary">
                What farmers are planting
              </h2>
              {showDemoTag && <DemoTag />}
            </div>
            <div className="space-y-4">
              {popularity
                .filter((c) => c.crop !== 'Other')
                .map((item) => (
                  <PopularityBar key={item.crop} crop={item.crop} percentage={item.percentage} />
                ))}
            </div>
          </Card>

          <Card variant="bordered" className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-medium text-text-primary dark:text-text-dark-primary">
                Oversupply risk by crop
              </h2>
              {showDemoTag && <DemoTag />}
            </div>
            <div className="space-y-3">
              {risks.map((item) => (
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
                  {showDemoTag
                    ? 'This block uses sample district numbers while Demo data mode is on and live counts are empty.'
                    : `${user?.name || 'Your'} anonymous planting data helps ${farmerCount} plan${
                        farmerCount === 1 ? '' : 's'
                      } counted in ${districtData.district}. No personal information is shared.`}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </PageWrapper>
  )
}
