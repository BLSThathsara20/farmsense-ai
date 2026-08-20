import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Spinner } from '../components/ui/Modal'
import { ServiceErrorState } from '../components/shared/ServiceErrorState'
import { Navbar } from '../components/layout/Navbar'
import { useAuthStore } from '../store/authStore'
import { useSyncProfile } from '../hooks/useSyncProfile'
import { homePathForUser, isAdminUser } from '../lib/roles'

function AuthBootLoader() {
  return (
    <div className="w-full flex-1 flex items-center justify-center min-h-[50vh] self-stretch">
      <Spinner size="lg" />
    </div>
  )
}

function SessionOutagePage({ error }) {
  const setSessionError = useAuthStore((s) => s.setSessionError)
  return (
    <div className="min-h-dvh bg-bg dark:bg-bg-dark">
      <Navbar />
      <div className="flex items-center justify-center px-5 py-12">
        <ServiceErrorState
          error={error}
          onRecovered={() => {
            setSessionError(null)
            useAuthStore.setState({ sessionStatus: 'idle' })
            window.location.assign('/login')
          }}
          onRetry={() => {
            setSessionError(null)
            useAuthStore.setState({ sessionStatus: 'idle' })
            window.location.assign('/login')
          }}
          onBack={() => {
            setSessionError(null)
            window.location.assign('/login')
          }}
          backLabel="Go to sign in"
        />
      </div>
    </div>
  )
}

/** Wait for localStorage hydrate + /auth/me (or clear stale session). */
function useVerifiedSession() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const sessionStatus = useAuthStore((s) => s.sessionStatus)
  const sessionError = useAuthStore((s) => s.sessionError)
  const user = useAuthStore((s) => s.user)
  const ready = hasHydrated && sessionStatus !== 'idle' && sessionStatus !== 'checking'
  return {
    ready,
    hasHydrated,
    sessionStatus,
    sessionError,
    isAuthenticated: sessionStatus === 'authenticated',
    user,
  }
}

const Landing = lazy(() => import('../pages/Landing'))
const Login = lazy(() => import('../pages/Auth/Login'))
const Register = lazy(() => import('../pages/Auth/Register'))
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword'))
const ResetPassword = lazy(() => import('../pages/Auth/ResetPassword'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const SoilInput = lazy(() => import('../pages/SoilInput'))
const PlansList = lazy(() => import('../pages/PlansList'))
const Recommendations = lazy(() => import('../pages/Recommendations'))
const RecommendationsRedirect = lazy(() =>
  import('../pages/Recommendations').then((m) => ({ default: m.RecommendationsRedirect }))
)
const Market = lazy(() => import('../pages/Market'))
const Community = lazy(() => import('../pages/Community'))
const Settings = lazy(() => import('../pages/Settings'))
const Help = lazy(() => import('../pages/Help'))
const Privacy = lazy(() => import('../pages/Privacy'))
const AdminOverview = lazy(() => import('../pages/Admin/AdminOverview'))
const AdminAnalysis = lazy(() => import('../pages/Admin/AdminAnalysis'))
const AdminFarmers = lazy(() => import('../pages/Admin/AdminFarmers'))
const AdminFarmerDetail = lazy(() => import('../pages/Admin/AdminFarmerDetail'))
const AdminModels = lazy(() => import('../pages/Admin/AdminModels'))

function PageLoader() {
  return (
    <div className="w-full flex-1 flex items-center justify-center min-h-[50vh] self-stretch">
      <Spinner size="lg" />
    </div>
  )
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

/** Farmer app routes — admins are redirected to /admin */
function ProtectedRoute({ children }) {
  const { ready, isAuthenticated, user, sessionError } = useVerifiedSession()
  useSyncProfile()
  if (sessionError && !isAuthenticated) {
    return <SessionOutagePage error={sessionError} />
  }
  if (!ready) return <AuthBootLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isAdminUser(user)) return <Navigate to="/admin" replace />
  return children
}

/** Super-admin routes — farmers redirected to farmer dashboard */
function AdminRoute({ children }) {
  const { ready, isAuthenticated, user, sessionError } = useVerifiedSession()
  if (sessionError && !isAuthenticated) {
    return <SessionOutagePage error={sessionError} />
  }
  if (!ready) return <AuthBootLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdminUser(user)) return <Navigate to="/dashboard" replace />
  return children
}

/**
 * Login / register: never wait on the API — only localStorage hydrate.
 * Outage details are shown inside Login via sessionError.
 */
function PublicOnlyRoute({ children }) {
  const { hasHydrated, isAuthenticated, user } = useVerifiedSession()

  if (!hasHydrated) return <AuthBootLoader />
  if (isAuthenticated) return <Navigate to={homePathForUser(user)} replace />
  return children
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: '/',
        element: (
          <LazyPage>
            <Landing />
          </LazyPage>
        ),
      },
      {
        path: '/login',
        element: (
          <LazyPage>
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          </LazyPage>
        ),
      },
      {
        path: '/register',
        element: (
          <LazyPage>
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          </LazyPage>
        ),
      },
      {
        path: '/forgot-password',
        element: (
          <LazyPage>
            <PublicOnlyRoute>
              <ForgotPassword />
            </PublicOnlyRoute>
          </LazyPage>
        ),
      },
      {
        path: '/reset-password',
        element: (
          <LazyPage>
            <ResetPassword />
          </LazyPage>
        ),
      },
      {
        path: '/privacy',
        element: (
          <LazyPage>
            <Privacy />
          </LazyPage>
        ),
      },
      {
        path: '/dashboard',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: '/plans',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <PlansList />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: '/plan',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <SoilInput />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: '/plans/:planId',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <Recommendations />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: '/recommendations',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <RecommendationsRedirect />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: '/market',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <Market />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: '/community',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <Community />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: '/help',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <Help />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: '/settings',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: '/admin',
        element: (
          <LazyPage>
            <AdminRoute>
              <AdminOverview />
            </AdminRoute>
          </LazyPage>
        ),
      },
      {
        path: '/admin/analysis',
        element: (
          <LazyPage>
            <AdminRoute>
              <AdminAnalysis />
            </AdminRoute>
          </LazyPage>
        ),
      },
      {
        path: '/admin/farmers',
        element: (
          <LazyPage>
            <AdminRoute>
              <AdminFarmers />
            </AdminRoute>
          </LazyPage>
        ),
      },
      {
        path: '/admin/farmers/:farmerId',
        element: (
          <LazyPage>
            <AdminRoute>
              <AdminFarmerDetail />
            </AdminRoute>
          </LazyPage>
        ),
      },
      {
        path: '/admin/models',
        element: (
          <LazyPage>
            <AdminRoute>
              <AdminModels />
            </AdminRoute>
          </LazyPage>
        ),
      },
    ],
  },
])
