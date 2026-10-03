import { getAllPlayers, getTrainingsWithAttendance } from '@/db/queries'
import { PageHeader } from '@/components/PageHeader'
import { formatCzk, formatDate, plural, todayIso } from '@/lib/format'

export const dynamic = 'force-dynamic'

/** Text pro řádek bez docházky: zrušený, ještě nebyl, nebo opravdu nikdo nepřišel. */
function whoLabel(cancelled: boolean, upcoming: boolean): string {
  if (cancelled) return '—'
  return upcoming ? 'Nadcházející' : 'Nikdo nedorazil'
}

export default async function TreninkyPage() {
  const [trainings, players] = await Promise.all([
    getTrainingsWithAttendance(),
    getAllPlayers(),
  ])
  const nameById = new Map(players.map((p) => [p.id, p.name]))
  const today = todayIso()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Tréninky" subtitle="Historie docházky a ceny za halu." />

      <section className="flex flex-col">
        {trainings.length === 0 && (
          <p className="measure py-4 text-chalk-dim">Zatím žádný trénink.</p>
        )}
        {trainings.map((training) => {
          const cancelled = training.status === 'cancelled'
          const names = training.attendance.map((a) => {
            const name = nameById.get(a.playerId) ?? `Hráč #${a.playerId}`
            return a.guests > 0 ? `${name} +${a.guests}` : name
          })
          const upcoming = training.date >= today
          const whoText = names.length > 0 ? names.join(', ') : whoLabel(cancelled, upcoming)

          return (
            <div key={training.id} className="row">
              <span className="flex flex-col">
                <span className="flex items-center gap-2">
                  <span className={`text-body ${cancelled ? 'text-chalk-dim' : 'text-chalk'}`}>
                    {formatDate(training.date)}
                  </span>
                  {cancelled && (
                    <span className="border border-danger px-1.5 py-0.5 text-meta text-danger">
                      Zrušeno
                    </span>
                  )}
                </span>
                <span className="text-meta text-chalk-dim">{whoText}</span>
              </span>
              <span className="text-right text-meta text-chalk-dim">
                {upcoming && training.heads === 0
                  ? formatCzk(training.priceCzk)
                  : `${training.heads} ${plural(training.heads, 'hráč', 'hráči', 'hráčů')}`}
                {!cancelled && training.heads > 0 && (
                  <>
                    <br />
                    {formatCzk(Math.ceil(training.priceCzk / training.heads))} / hlava
                  </>
                )}
              </span>
            </div>
          )
        })}
      </section>
    </div>
  )
}
