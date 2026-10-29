const PBKDF2_ITERATIONS = 100_000
const HASH_ALGORITHM = 'SHA-256'
const KEY_LENGTH_BITS = 256

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: HASH_ALGORITHM },
    key,
    KEY_LENGTH_BITS,
  )
  return toHex(new Uint8Array(derived))
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

/** Stored format: pbkdf2:<iterations>:<saltHex>:<hashHex> */
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS)
  return `pbkdf2:${PBKDF2_ITERATIONS}:${toHex(salt)}:${hash}`
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false

  const [, iterationsStr, saltHex, expectedHash] = parts
  const hash = await derive(pin, fromHex(saltHex!), Number(iterationsStr))
  return hash === expectedHash
}
