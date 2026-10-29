import { lazy, Suspense, useState } from 'react'
import { Navigate, BrowserRouter, Route, Routes } from 'react-router-dom'
import { SyncStatusIndicator } from '../components/SyncStatusIndicator'
import { AuthProvider } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { OnboardingGate } from '../features/auth/OnboardingGate'
import { SignUpPage } from '../features/auth/SignUpPage'
import { PinLogin } from '../features/staff/PinLogin'
import type { Staff } from '../lib/types'
import { PosHome } from './pos/PosHome'

// Owner/back-office pages are never opened from the cashier tablet's POS flow,
// so they're code-split out of the POS entry chunk and fetched on demand.
const StaffPage = lazy(() => import('../features/staff/StaffPage').then((m) => ({ default: m.StaffPage })))
const MenuPage = lazy(() => import('../features/menu/MenuPage').then((m) => ({ default: m.MenuPage })))
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const DashboardPage = lazy(() =>
  import('../features/reports/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)

function BackofficeFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-slate-600">Loading…</p>
    </div>
  )
}

function PosEntry() {
  const [loggedInStaff, setLoggedInStaff] = useState<Staff | null>(null)

  if (!loggedInStaff) {
    return <PinLogin onLoggedIn={setLoggedInStaff} />
  }

  return <PosHome staff={loggedInStaff} />
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/onboarding"
            element={
              <OnboardingGate>
                <Navigate to="/pos" replace />
              </OnboardingGate>
            }
          />
          <Route
            path="/pos"
            element={
              <OnboardingGate>
                <PosEntry />
              </OnboardingGate>
            }
          />
          <Route
            path="/backoffice/staff"
            element={
              <OnboardingGate>
                <Suspense fallback={<BackofficeFallback />}>
                  <StaffPage />
                </Suspense>
              </OnboardingGate>
            }
          />
          <Route
            path="/backoffice/menu"
            element={
              <OnboardingGate>
                <Suspense fallback={<BackofficeFallback />}>
                  <MenuPage />
                </Suspense>
              </OnboardingGate>
            }
          />
          <Route
            path="/backoffice/settings"
            element={
              <OnboardingGate>
                <Suspense fallback={<BackofficeFallback />}>
                  <SettingsPage />
                </Suspense>
              </OnboardingGate>
            }
          />
          <Route
            path="/backoffice/dashboard"
            element={
              <OnboardingGate>
                <Suspense fallback={<BackofficeFallback />}>
                  <DashboardPage />
                </Suspense>
              </OnboardingGate>
            }
          />
        </Routes>
        <SyncStatusIndicator />
      </AuthProvider>
    </BrowserRouter>
  )
}
