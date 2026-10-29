import { useEffect, useState } from 'react'
import { getMyMembership } from '../features/auth/merchantApi'
import { getOrCreateDevice, type DeviceInfo } from './device'

/** Resolves the current user's merchant and this tablet's device record.
 * Shared by every POS screen that needs them (PIN login, open orders, the
 * cart builder) so the lookup logic lives in one place. */
export function useMerchantDevice(): {
  merchantId: string | null
  device: DeviceInfo | null
  error: string | null
} {
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [device, setDevice] = useState<DeviceInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMyMembership()
      .then((membership) => setMerchantId(membership?.merchantId ?? null))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to look up your account'),
      )
  }, [])

  useEffect(() => {
    if (!merchantId) return
    getOrCreateDevice(merchantId)
      .then(setDevice)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to set up device'),
      )
  }, [merchantId])

  return { merchantId, device, error }
}
