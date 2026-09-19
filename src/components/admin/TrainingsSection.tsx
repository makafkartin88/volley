import { createTraining } from '@/actions/trainings'
import { AdminSection } from '@/components/admin/AdminSection'
import { TrainingStatusToggle, trainingStatusLabel } from '@/components/admin/TrainingStatus'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { formatCzk, formatDate, nextSundayIso } from '@/lib/format'

type Player = { id: number; name: string }

export type TrainingRow = {
  id: number
  date: string
  priceCzk: number
  status: 'held' | 'cancelled'
  attendance: { playerId: number; guests: number }[]
  heads: number
}

const inputClass =
  'mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk'

/** Formulář na nový trénink. Sdílí ho sekce i prázdný stav horního bloku. */
export function CreateTrainingForm({ tone = 'quiet' }: { tone?: 'primary' | 'quiet' }) {
  return (
    <form action={createTraining} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="text-meta text-chalk-dim">Datum</span>
          <input
            type="date"
            name="date"
            required
            defaultValue={nextSundayIso()}
            className={inputClass}
          />
        </label>
        <label className="sm:w-40">
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
      <button type="submit" className={`${tone === 'primary' ? 'btn-primary' : 'btn-quiet'} self-start`}>
        Založit trénink
      </button>
    </form>
  )
}

export function TrainingsSection({
  trainings,
  players,
}: {
  trainings: TrainingRow[]
  players: Player[]
}) {
  return (
    <AdminSection title="Tréninky" count={String(trainings.length)}>
      <CreateTrainingForm />

      <section className="flex flex-col">
        {trainings.length === 0 && (
          <p className="measure py-4 text-chalk-dim">Zatím žádný trénink. Založ první.</p>
        )}
        {trainings.map((training) => (
          <details key={training.id} className="border-b border-rule">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3">
              <span className="flex flex-col">
                <span className="text-body text-chalk">{formatDate(training.date)}</span>
                <span className="text-meta text-chalk-dim">
                  {trainingStatusLabel[training.status]}, {training.heads} hlav,{' '}
                  {formatCzk(training.priceCzk)} za halu
                </span>
              </span>
              <span className="text-meta text-chalk-dim">Docházka</span>
            </summary>
            <div className="flex flex-col gap-4 pt-2 pb-4">
              <AttendanceGrid
                trainingId={training.id}
                priceCzk={training.priceCzk}
                players={players}
                initial={training.attendance}
                tone="quiet"
              />
              <TrainingStatusToggle id={training.id} status={training.status} />
            </div>
          </details>
        ))}
      </section>
    </AdminSection>
  )
}
