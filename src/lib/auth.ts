import { cookies } from 'next/headers'
import { SESSION_COOKIE, isValidSessionToken } from '@/lib/auth-core'

export {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sign,
  verifyPin,
  createSessionToken,
  isValidSessionToken,
} from '@/lib/auth-core'

export async function isAdmin(): Promise<boolean> {
  const store = await cookies()
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value)
}

/** Volej na prvním řádku každé Server Action, která zapisuje. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error('Tahle akce je jen pro organizátora.')
  }
}
