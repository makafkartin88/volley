'use client'

import { useState, useTransition } from 'react'
import { saveAppearances } from '@/actions/matches'

type Player = { id: number; name: string }

/**
 * Výběr sestavy zápasu — stejný vzor přepínání jako `AttendanceGrid`, ale
 * bez konceptu hostů: jen množina ID hráčů, kteří nastoupili. Vlastní
 * komponenta schválně, ať se `AttendanceGrid` neohýbá k druhému účelu.
 *
 * Jediný růžový prvek na obrazovce je tlačítko Uložit sestavu.
 */
export function LineupPicker({
  matchId, players, initial,
}: {
  matchId: number
  players: Player[]
  initial: number[]
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initial))
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

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
      await saveAppearances(matchId, payload)
      setSaved(true)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <ul>
        {players.length === 0 && (
          <p className="py-3 text-meta text-chalk-dim">
            Zatím žádní aktivní hráči. Přidej je v sekci Hráči.
          </p>
        )}
        {players.map((player) => {
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

      <div className="flex items-center justify-between gap-4 border-t border-rule pt-3">
        <div>
          <div className="text-meta text-chalk-dim">Nastoupilo</div>
          <div key={selected.size} className="tick display text-title tabular-nums text-chalk">
            {selected.size}
          </div>
        </div>

        <button type="button" onClick={save} disabled={pending} className="btn-primary">
          {pending ? 'Ukládám…' : saved ? 'Uloženo' : 'Uložit sestavu'}
        </button>
      </div>
    </div>
  )
}
