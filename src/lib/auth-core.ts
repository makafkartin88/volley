/**
 * Bezstavová část autentizace, bez importu `next/headers`.
 * Bezpečné pro import z middleware (edge runtime).
 */

export const SESSION_COOKIE = 'volley_admin'
const SESSION_DAYS = 90
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60

function secret(): string {
  const value = process.env.AUTH_SECRET
  if (!value) throw new Error('Chybí proměnná AUTH_SECRET')
  return value
}

export async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function verifyPin(pin: string): boolean {
  const expected = process.env.ADMIN_PIN
  if (!expected) throw new Error('Chybí proměnná ADMIN_PIN')
  // Porovnání konstantní délky, aby nešlo PIN uhodnout po znacích.
  if (pin.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < pin.length; i++) diff |= pin.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  return `${expiresAt}.${await sign(String(expiresAt))}`
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const [expiresAt, signature] = token.split('.')
  if (!expiresAt || !signature) return false
  if (Number(expiresAt) < Date.now()) return false
  return (await sign(expiresAt)) === signature
}
