'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyPin, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'

/** Pokusy o PIN v paměti instance. Na velikost tohohle týmu to stačí. */
const attempts = new Map<string, { count: number; blockedUntil: number }>()
const MAX_ATTEMPTS = 5
const BLOCK_MS = 15 * 60 * 1000

export type LoginState = { error?: string }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const record = attempts.get('global') ?? { count: 0, blockedUntil: 0 }
  if (Date.now() < record.blockedUntil) {
    return { error: 'Moc pokusů. Zkus to za 15 minut.' }
  }

  const pin = String(formData.get('pin') ?? '')
  if (!verifyPin(pin)) {
    record.count += 1
    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = Date.now() + BLOCK_MS
      record.count = 0
    }
    attempts.set('global', record)
    return { error: 'Špatný PIN.' }
  }

  attempts.delete('global')
  const store = await cookies()
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  redirect('/admin')
}

export async function logoutAction(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect('/')
}
