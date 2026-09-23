'use client'

import { useId, useState, useTransition, type FormEvent } from 'react'
import { createSettlementExpense } from '@/actions/settlements'
import { PlayerSearch, playerMatchesQuery } from '@/components/PlayerSearch'

type Player = { id: number; name: string }

const inputClass =
  'mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim'

/**
 * Přidání mimořádného výdaje (ples, pronájem apod.) do rozpracovaného
 * vyúčtování — rozdělí se rovným dílem mezi vybrané hráče. Účastníci se
 * vybírají stejným vzorem jako `LineupPicker`: množina ID přes `PlayerSearch`,
 * jen bez vazby na konkrétní zápas.
 *
 * Odesílá se ručně přes `FormData`, ne přímo přes `<form action>` — díky
 * tomu jde po úspěchu vyčistit i vlastní React stav (vybraní hráči, hledání)
 * a chybu z `requireAdmin()`/validace ukázat u formuláře, ne nechat spadnout
 * do výchozí chybové stránky.
 */
export function ExpenseForm({
  settlementId,
  players,
}: {
  settlementId: number
  players: Player[]
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const searchId = useId()

  function toggle(playerId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData()
    formData.set('settlementId', String(settlementId))
    formData.set('note', note)
    formData.set('amountCzk', amount)
    for (const playerId of selected) formData.append('playerIds', String(playerId))

    startTransition(async () => {
      try {
        await createSettlementExpense(formData)
        setNote('')
        setAmount('')
        setSelected(new Set())
        setQuery('')
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Uložení se nepovedlo. Zkus to znovu.')
      }
    })
  }

  const visible = players.filter((p) => playerMatchesQuery(p.name, query))

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 border border-chalk-dim p-4">
      <label>
        <span className="text-meta text-chalk-dim">Poznámka</span>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          required
          maxLength={120}
          placeholder="Např. Ples"
          className={inputClass}
        />
      </label>
      <label>
        <span className="text-meta text-chalk-dim">Částka (Kč)</span>
        <input
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
          min={1}
          max={1000000}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-meta text-chalk-dim">Účastníci ({selected.size})</span>
        {players.length > 0 && <PlayerSearch id={searchId} value={query} onChange={setQuery} />}
        <ul>
          {players.length === 0 && (
            <p className="py-3 text-meta text-chalk-dim">Zatím žádní aktivní hráči.</p>
          )}
          {players.length > 0 && visible.length === 0 && (
            <p className="py-3 text-meta text-chalk-dim">
              Nikdo se jménem „{query}“. Zkus kratší kus jména.
            </p>
          )}
          {visible.map((player) => {
            const checked = selected.has(player.id)
            return (
              <li key={player.id} className="row">
                <button
                  type="button"
                  onClick={() => toggle(player.id)}
                  aria-pressed={checked}
                  className="flex min-h-11 w-full items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border text-xs leading-none ${
                      checked ? 'border-chalk bg-chalk text-ink' : 'border-chalk-dim text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className={`text-body ${checked ? 'text-chalk' : 'text-chalk-dim'}`}>
                    {player.name}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {error && <p className="text-meta text-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending || selected.size === 0 || note.trim() === '' || amount === ''}
        className="btn-quiet self-start"
      >
        {pending ? 'Přidávám…' : 'Přidat výdaj'}
      </button>
    </form>
  )
}
