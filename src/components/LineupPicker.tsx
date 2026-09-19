'use client'

import { useId, useState, useTransition } from 'react'
import { saveAppearances } from '@/actions/matches'
import { PlayerSearch, playerMatchesQuery } from '@/components/PlayerSearch'

type Player = { id: number; name: string }

/**
 * Výběr sestavy zápasu — stejný vzor přepínání jako `AttendanceGrid`, ale
 * bez konceptu hostů: jen množina ID hráčů, kteří nastoupili. Vlastní
 * komponenta schválně, ať se `AttendanceGrid` neohýbá k druhému účelu.
 *
 * Výběr žije v množině `selected`, hledání je jen filtr zobrazení — hráč
 * odfiltrovaný z výhledu zůstává v sestavě a dál se počítá.
 */
export function LineupPicker({
  matchId, players, initial, tone = 'quiet',
}: {
  matchId: number
  players: Player[]
  initial: number[]
  tone?: 'primary' | 'quiet'
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initial))
  const [query, setQuery] = useState('')
  const searchId = useId()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(playerId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
    setSaved(false)
  }

  function save() {
    const payload = [...selected]
    startTransition(async () => {
      try {
        await saveAppearances(matchId, payload)
        setSaved(true)
        setError(null)
      } catch {
        setError('Uložení se nepovedlo. Zkus to znovu.')
      }
    })
  }

  const visible = players.filter((p) => playerMatchesQuery(p.name, query))

  return (
    <div className="flex flex-col gap-6">
      {players.length > 0 && (
        <PlayerSearch id={searchId} value={query} onChange={setQuery} />
      )}

      <ul>
        {players.length === 0 && (
          <p className="py-3 text-meta text-chalk-dim">
            Zatím žádní aktivní hráči. Přidej je v sekci Hráči.
          </p>
        )}
        {players.length > 0 && visible.length === 0 && (
          <p className="py-3 text-meta text-chalk-dim">
            Nikdo se jménem „{query}“. Zkus kratší kus jména.
          </p>
        )}
        {visible.map((player) => {
          const present = selected.has(player.id)
          return (
            <li key={player.id} className="row">
              <button
                type="button"
                onClick={() => toggle(player.id)}
                aria-pressed={present}
                className="flex min-h-11 w-full items-center gap-3 text-left"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border text-xs leading-none ${
                    present ? 'border-chalk bg-chalk text-ink' : 'border-chalk-dim text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span className={`text-body ${present ? 'text-chalk' : 'text-chalk-dim'}`}>
                  {player.name}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-4 border-t border-rule pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-meta text-chalk-dim">Nastoupilo</div>
          <div key={selected.size} className="tick display text-title tabular-nums text-chalk">
            {selected.size}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {error && <span className="text-meta text-danger">{error}</span>}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className={`${tone === 'primary' ? 'btn-primary' : 'btn-quiet'} w-full sm:w-auto`}
          >
            {pending ? 'Ukládám…' : saved ? 'Uloženo' : 'Uložit sestavu'}
          </button>
        </div>
      </div>
    </div>
  )
}
