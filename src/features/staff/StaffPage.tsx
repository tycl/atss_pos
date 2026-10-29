import { useEffect, useState, type FormEvent } from 'react'
import { BackofficeLayout } from '../../app/backoffice/BackofficeLayout'
import { getMyMembership } from '../auth/merchantApi'
import { isValidPin } from '../../lib/pin'
import type { Staff, StaffRole } from '../../lib/types'
import { createStaff, listStaff, setStaffActive } from './staffApi'

const ROLE_OPTIONS: StaffRole[] = ['cashier', 'manager', 'owner']

export function StaffPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState<StaffRole>('cashier')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getMyMembership()
      .then((membership) => {
        if (!membership) return
        setMerchantId(membership.merchantId)
        return listStaff(membership.merchantId).then(setStaff)
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load staff'),
      )
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!merchantId) return
    if (!isValidPin(pin)) {
      setError('PIN must be 4 to 6 digits')
      return
    }

    setSubmitting(true)
    try {
      const created = await createStaff(merchantId, name, role, pin)
      setStaff((current) => [...current, created])
      setName('')
      setPin('')
      setRole('cashier')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(member: Staff) {
    setError(null)
    try {
      await setStaffActive(member.id, !member.active)
      setStaff((current) =>
        current.map((item) => (item.id === member.id ? { ...item, active: !item.active } : item)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff')
    }
  }

  return (
    <BackofficeLayout title="Staff" maxWidthClassName="max-w-xl">
      <div className="space-y-8">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded border border-slate-200 bg-white p-4"
        >
          <div>
            <label htmlFor="staffName" className="block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="staffName"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="staffRole" className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="staffRole"
              value={role}
              onChange={(event) => setRole(event.target.value as StaffRole)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="staffPin" className="block text-sm font-medium text-slate-700">
              PIN (4–6 digits)
            </label>
            <input
              id="staffPin"
              inputMode="numeric"
              pattern="\d{4,6}"
              required
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !merchantId}
            className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add staff'}
          </button>
        </form>

        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {staff.map((member) => (
            <li key={member.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-slate-800">{member.name}</p>
                <p className="text-sm text-slate-500">{member.role}</p>
              </div>
              <button
                onClick={() => toggleActive(member)}
                className="text-sm font-medium text-slate-600 underline"
              >
                {member.active ? 'Deactivate' : 'Activate'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </BackofficeLayout>
  )
}
