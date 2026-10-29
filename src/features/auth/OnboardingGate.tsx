import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './authContext'
import { getMyMembership, type Membership } from './merchantApi'
import { OnboardingWizard } from './OnboardingWizard'

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [membership, setMembership] = useState<Membership | null | undefined>(undefined)
  const [membershipError, setMembershipError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!session) {
      navigate('/login')
      return
    }
    getMyMembership()
      .then((result) => {
        setMembership(result)
        setMembershipError(null)
      })
      .catch((err: unknown) =>
        setMembershipError(err instanceof Error ? err.message : 'Failed to load your account'),
      )
  }, [authLoading, session, navigate])

  if (membershipError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <p className="text-slate-700">{membershipError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded bg-slate-800 px-4 py-2 text-white"
        >
          Retry
        </button>
      </div>
    )
  }

  if (authLoading || membership === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    )
  }

  if (membership) {
    return <>{children}</>
  }

  return (
    <OnboardingWizard
      onComplete={async () => {
        setMembership(await getMyMembership())
      }}
    />
  )
}
