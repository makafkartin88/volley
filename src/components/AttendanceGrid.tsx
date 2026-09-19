'use client'

import { useState, useTransition } from 'react'
import { saveAttendance } from '@/actions/trainings'
import { formatCzk } from '@/lib/format'

type Player = { id: number; name: string }
type Entry = { playerId: number; guests: number }

/**
 * Mřížka docházky — nejpoužívanější obrazovka celé aplikace, odklikaná
 * jednou rukou v hale. Řádek hráče je celý dotykový cíl (přepíná přítomnost),
 * stepper hostů se objeví jen u přítomných, ať seznam nepřeplácá.
 *
 * Jediný růžový prvek na obrazovce je tlačítko Uložit docházku — přepínač
 * přítomnosti i stepper hostů zůstávají v --chalk/--chalk-dim.
 */
export function AttendanceGrid({
  trainingId, priceCzk, players, initial,
}: {
  trainingId: number
  priceCzk: number
  players: Player[]
  initial: Entry[]
}) {
  const [entries, setEntries] = useState<Map<number, number>>(
    () => new Map(initial.map((e) => [e.playerId, e.guests]))
  )
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(playerId: number) {
    setEntries((prev) => {
      const next = new Map(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.set(playerId, 0)
      return next
    })
    setSaved(false)
  }

  function setGuests(playerId: number, guests: number) {
    setEntries((prev) => new Map(prev).set(playerId, Math.max(0, guests)))
    setSaved(false)
  }

  function save() {
    const payload = [...entries.entries()].map(([playerId, guests]) => ({ playerId, guests }))
    startTransition(async () => {
      try {
        await saveAttendance(trainingId, payload)
        setSaved(true)
        setError(null)
      } catch {
        setError('Uložení se nepovedlo. Zkus to znovu.')
      }
    })
  }

  const heads = [...entries.values()].reduce((sum, g) => sum + 1 + g, 0)
  const perHead = heads > 0 ? Math.round(priceCzk / heads) : null

  return (
    <div className="flex flex-col gap-6">
      <ul>
        {players.length === 0 && (
          <p className="py-3 text-meta text-chalk-dim">
            Zatím žádní aktivní hráči. Přidej je v sekci Hráči.
          </p>
        )}
        {players.map((player) => {
          const present = entries.has(player.id)
          const guests = entries.get(player.id) ?? 0
          return (
            <li key={player.id} className="row">
              <div className="flex w-full items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggle(player.id)}
                  aria-pressed={present}
                  className="flex min-h-11 flex-1 items-center gap-3 text-left"
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

                {present && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGuests(player.id, guests - 1)}
                      disabled={guests === 0}
                      aria-label={`Ubrat hosta hráči ${player.name}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center border border-chalk-dim text-chalk disabled:text-chalk-dim disabled:opacity-50"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-meta tabular-nums text-chalk-dim">
                      +{guests}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuests(player.id, guests + 1)}
                      aria-label={`Přidat hosta hráči ${player.name}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center border border-chalk-dim text-chalk"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex items-end justify-between gap-4 border-t border-rule pt-3">
        <div className="flex gap-6">
          <div>
            <div className="text-meta text-chalk-dim">Celkem hlav</div>
            <div key={heads} className="tick display text-title tabular-nums text-chalk">
              {heads}
            </div>
          </div>
          <div>
            <div className="text-meta text-chalk-dim">Na hlavu</div>
            <div key={perHead ?? 'none'} className="tick display text-title tabular-nums text-chalk">
              {perHead === null ? '—' : formatCzk(perHead)}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {error && <span className="text-meta text-danger">{error}</span>}
          <button type="button" onClick={save} disabled={pending} className="btn-primary">
            {pending ? 'Ukládám…' : saved ? 'Uloženo' : 'Uložit docházku'}
          </button>
        </div>
      </div>
    </div>
  )
}
