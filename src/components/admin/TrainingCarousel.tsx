'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createTraining, updateTrainingPrice } from '@/actions/trainings'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { TrainingStatusToggle } from '@/components/admin/TrainingStatus'
import { formatCzk, plural, weekdayOf } from '@/lib/format'

type Player = { id: number; name: string; archived: boolean }

export type CarouselTraining = {
  id: number
  date: string
  priceCzk: number
  status: 'held' | 'cancelled'
  attendance: { playerId: number; guests: number }[]
  heads: number
  /** Název uzavřeného vyúčtování, do kterého trénink patří — cena je pak zamčená. */
  lockedBy: string | null
}

const NEW = 'new' as const
type Selection = number | typeof NEW

const WEEKDAYS_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
const WEEKDAYS = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota']

function dayMonth(iso: string, today: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return y === Number(today.slice(0, 4)) ? `${d}. ${m}.` : `${d}. ${m}. ${y}`
}

function headsLabel(heads: number): string {
  return `${heads} ${plural(heads, 'hráč', 'hráči', 'hráčů')}`
}

function cardStatus(t: CarouselTraining, today: string): { text: string; loud: boolean } {
  if (t.status === 'cancelled') return { text: 'Zrušen', loud: false }
  if (t.heads > 0) return { text: headsLabel(t.heads), loud: false }
  if (t.date === today) return { text: 'Dnes', loud: true }
  if (t.date > today) return { text: 'Nadcházející', loud: false }
  return { text: 'Chybí docházka', loud: true }
}

/**
 * Tréninky jako vodorovný pás karet: vlevo minulost, vpravo budoucnost,
 * na konci karta pro založení dalšího. Výchozí je nejbližší nadcházející
 * trénink (v neděli ten dnešní, od pondělí ten příští). Pod pásem je
 * detail vybraného — budoucí trénink rovnou se zaškrtávačkou docházky,
 * proběhlý jako uzavřený přehled, kdo tam byl.
 */
export function TrainingCarousel({
  trainings, players, today, initialSelected, newDate,
}: {
  trainings: CarouselTraining[]
  players: Player[]
  today: string
  initialSelected: number | null
  newDate: string
}) {
  const [selected, setSelected] = useState<Selection>(initialSelected ?? NEW)
  const order: Selection[] = [...trainings.map((t) => t.id), NEW]
  const index = Math.max(0, order.indexOf(selected))
  const current = trainings.find((t) => t.id === selected) ?? null

  const stripRef = useRef<HTMLDivElement>(null)
  const firstScroll = useRef(true)
  useEffect(() => {
    const strip = stripRef.current
    const card = strip?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!strip || !card) return
    strip.scrollTo({
      left: card.offsetLeft - (strip.clientWidth - card.clientWidth) / 2,
      behavior: firstScroll.current ? 'auto' : 'smooth',
    })
    firstScroll.current = false
  }, [selected])

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="display text-title">Tréninky</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(order[index - 1])}
              disabled={index === 0}
              aria-label="Předchozí trénink"
              className="flex h-11 w-11 items-center justify-center border border-rule text-chalk disabled:text-chalk-dim disabled:opacity-40"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setSelected(order[index + 1])}
              disabled={index === order.length - 1}
              aria-label="Další trénink"
              className="flex h-11 w-11 items-center justify-center border border-rule text-chalk disabled:text-chalk-dim disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={stripRef}
          className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
          {trainings.map((t) => {
            const active = t.id === selected
            const status = cardStatus(t, today)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                aria-current={active}
                className={`flex w-28 shrink-0 snap-center flex-col items-start border px-3 py-2 text-left ${
                  active ? 'border-chalk bg-ink-raised' : 'border-rule'
                }`}
              >
                <span className="text-meta text-chalk-dim">{WEEKDAYS_SHORT[weekdayOf(t.date)]}</span>
                <span className={`display text-body ${t.status === 'cancelled' ? 'text-chalk-dim line-through' : 'text-chalk'}`}>
                  {dayMonth(t.date, today)}
                </span>
                <span className={`text-meta ${status.loud ? 'text-chalk' : 'text-chalk-dim'}`}>
                  {status.text}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setSelected(NEW)}
            aria-current={selected === NEW}
            className={`flex w-28 shrink-0 snap-center flex-col items-start justify-center border border-dashed px-3 py-2 text-left ${
              selected === NEW ? 'border-chalk bg-ink-raised' : 'border-rule'
            }`}
          >
            <span className="display text-title leading-none text-chalk">+</span>
            <span className="text-meta text-chalk-dim">Nový trénink</span>
          </button>
        </div>
      </div>

      {current ? (
        <TrainingDetail key={current.id} training={current} players={players} today={today} />
      ) : (
        <NewTraining defaultDate={newDate} onCreated={setSelected} />
      )}
    </section>
  )
}

function TrainingDetail({
  training, players, today,
}: {
  training: CarouselTraining
  players: Player[]
  today: string
}) {
  const past = training.date < today
  const cancelled = training.status === 'cancelled'
  const [editing, setEditing] = useState(!past || training.heads === 0)

  // Archivovaný hráč, který na tréninku byl, musí v mřížce zůstat — jinak
  // by ho uložení docházky potichu smazalo.
  const attendeeIds = new Set(training.attendance.map((a) => a.playerId))
  const gridPlayers = players.filter((p) => !p.archived || attendeeIds.has(p.id))
  const nameById = new Map(players.map((p) => [p.id, p.name]))
  const perHead = training.heads > 0 ? Math.ceil(training.priceCzk / training.heads) : null

  const [y, m, d] = training.date.split('-').map(Number)
  const subtitle = cancelled
    ? 'Zrušen'
    : past ? 'Proběhl' : training.date === today ? 'Dnes' : 'Nadcházející'

  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-rule pb-3">
        <h2 className="display text-title leading-tight">
          {WEEKDAYS[weekdayOf(training.date)]} {d}. {m}. {y}
        </h2>
        <p className="mt-1 text-meta text-chalk-dim">
          {subtitle}, {formatCzk(training.priceCzk)} za halu
        </p>
      </header>

      {cancelled ? (
        <p className="text-chalk-dim">Trénink se nekonal, do vyúčtování se nepočítá.</p>
      ) : editing ? (
        <AttendanceGrid
          trainingId={training.id}
          priceCzk={training.priceCzk}
          players={gridPlayers}
          initial={training.attendance}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <ul>
            {training.attendance
              .map((a) => ({ ...a, name: nameById.get(a.playerId) ?? `Hráč #${a.playerId}` }))
              .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
              .map((a) => (
                <li key={a.playerId} className="row">
                  <span className="text-body text-chalk">{a.name}</span>
                  {a.guests > 0 && (
                    <span className="text-meta text-chalk-dim">
                      +{a.guests} {plural(a.guests, 'host', 'hosté', 'hostů')}
                    </span>
                  )}
                </li>
              ))}
          </ul>
          <div className="flex items-end justify-between gap-4">
            <div className="flex gap-6">
              <div>
                <div className="text-meta text-chalk-dim">Celkem hráčů</div>
                <div className="display text-title tabular-nums text-chalk">{training.heads}</div>
              </div>
              <div>
                <div className="text-meta text-chalk-dim">Na hlavu</div>
                <div className="display text-title tabular-nums text-chalk">
                  {perHead === null ? '—' : formatCzk(perHead)}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setEditing(true)} className="btn-quiet">
              Upravit docházku
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 border-t border-rule pt-4">
        {training.lockedBy ? (
          <p className="text-meta text-chalk-dim">
            Cenu {formatCzk(training.priceCzk)} už nejde změnit, trénink je v uzavřeném
            vyúčtování „{training.lockedBy}“.
          </p>
        ) : (
          <form
            key={training.priceCzk}
            action={updateTrainingPrice}
            className="flex items-end gap-3"
          >
            <input type="hidden" name="id" value={training.id} />
            <label className="w-40">
              <span className="text-meta text-chalk-dim">Cena za halu</span>
              <input
                type="number"
                name="priceCzk"
                required
                min={1}
                max={100000}
                defaultValue={training.priceCzk}
                className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk"
              />
            </label>
            <button type="submit" className="btn-quiet">Uložit cenu</button>
          </form>
        )}
        <div>
          <TrainingStatusToggle id={training.id} status={training.status} />
        </div>
      </div>
    </div>
  )
}

function NewTraining({
  defaultDate, onCreated,
}: {
  defaultDate: string
  onCreated: (id: number) => void
}) {
  const [pending, startTransition] = useTransition()
  const inputClass =
    'mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk'

  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-rule pb-3">
        <h2 className="display text-title leading-tight">Nový trénink</h2>
        <p className="mt-1 text-meta text-chalk-dim">
          Další neděle se zakládá sama v pondělí ráno. Ručně jen mimořádný termín.
        </p>
      </header>
      <form
        action={(formData) => startTransition(async () => onCreated(await createTraining(formData)))}
        className="flex flex-col gap-3"
      >
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Datum</span>
            <input type="date" name="date" required defaultValue={defaultDate} className={inputClass} />
          </label>
          <label className="w-32">
            <span className="text-meta text-chalk-dim">Cena za halu</span>
            <input
              type="number"
              name="priceCzk"
              required
              min={1}
              max={100000}
              defaultValue={1350}
              className={inputClass}
            />
          </label>
        </div>
        <button type="submit" disabled={pending} className="btn-primary self-start">
          {pending ? 'Zakládám…' : 'Založit trénink'}
        </button>
      </form>
    </div>
  )
}
