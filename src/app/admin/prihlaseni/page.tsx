'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from '@/actions/auth'
import { PageHeader } from '@/components/PageHeader'

const initialState: LoginState = {}

export default function PrihlaseniPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Přihlášení organizátora" subtitle="Zadej PIN a můžeš zapisovat docházku." />
      <form action={formAction} className="flex flex-col gap-4">
        <label htmlFor="pin" className="text-meta text-chalk-dim">
          PIN
        </label>
        <input
          id="pin"
          name="pin"
          type="text"
          inputMode="numeric"
          autoFocus
          autoComplete="off"
          required
          className="display border-b border-rule bg-transparent py-2 text-title tabular-nums text-chalk"
        />
        <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto sm:self-start">
          Přihlásit
        </button>
      </form>
      {state.error && <p className="text-danger">{state.error}</p>}
    </div>
  )
}
