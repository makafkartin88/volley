'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from '@/actions/auth'

const initialState: LoginState = {}

export default function PrihlaseniPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <main>
      <h1>Přihlášení organizátora</h1>
      <form action={formAction}>
        <label htmlFor="pin">PIN</label>
        <input
          id="pin"
          name="pin"
          type="text"
          inputMode="numeric"
          autoFocus
          autoComplete="off"
          required
        />
        <button type="submit" disabled={pending}>
          Přihlásit
        </button>
      </form>
      {state.error && <p style={{ color: 'var(--danger, #dc2626)' }}>{state.error}</p>}
    </main>
  )
}
