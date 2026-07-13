import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Spinner } from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'
import { useSyncProfile } from '../hooks/useSyncProfile'
import { homePathForUser, isAdminUser } from '../lib/roles'

const Landing = lazy(() => import('../pages/Landing'))
const Login = lazy(() => import('../pages/Auth/Login'))
const Register = lazy(() => import('../pages/Auth/Register'))
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword'))
const ResetPassword = lazy(() => import('../pages/Auth/ResetPassword'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const SoilInput = lazy(() => import('../pages/SoilInput'))
const Recommendations = lazy(() => import('../pages/Recommendations'))
const Market = lazy(() => import('../pages/Market'))
const Community = lazy(() => import('../pages/Community'))
const Settings = lazy(() => import('../pages/Settings'))
const Help = lazy(() => import('../pages/Help'))
const AdminOverview = lazy(() => import('../pages/Admin/AdminOverview'))
const AdminAnalysis = lazy(() => import('../pages/Admin/AdminAnalysis'))
const AdminFarmers = lazy(() => import('../pages/Admin/AdminFarmers'))
const AdminFarmerDetail = lazy(() => import('../pages/Admin/AdminFarmerDetail'))
const AdminModels = lazy(() => import('../pages/Admin/AdminModels'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner size="lg" />
    </div>
  )
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

/** Farmer app routes — admins are redirected to /admin */
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  useSyncProfile()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isAdminUser(user)) return <Navigate to="/admin" replace />
  return children
}

/** Super-admin routes — farmers redirected to farmer dashboard */
function AdminRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdminUser(user)) return <Navigate to="/dashboard" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
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
        path: '/recommendations',
        element: (
          <LazyPage>
            <ProtectedRoute>
              <Recommendations />
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
