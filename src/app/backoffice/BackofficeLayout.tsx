import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/backoffice/dashboard', label: 'Dashboard' },
  { to: '/backoffice/menu', label: 'Menu' },
  { to: '/backoffice/staff', label: 'Staff' },
  { to: '/backoffice/settings', label: 'Settings' },
]

export function BackofficeLayout({
  title,
  maxWidthClassName = 'max-w-2xl',
  children,
}: {
  title: string
  maxWidthClassName?: string
  children: ReactNode
}) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 py-2">
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-h-11 items-center rounded px-3 py-2 text-sm font-medium ${
                  location.pathname === item.to
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            to="/pos"
            className="flex min-h-11 items-center rounded px-3 py-2 text-sm font-medium text-slate-600 underline"
          >
            Back to POS
          </Link>
        </div>
      </header>

      <main className="px-4 py-8">
        <div className={`mx-auto space-y-6 ${maxWidthClassName}`}>
          <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  )
}
