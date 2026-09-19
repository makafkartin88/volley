import Link from 'next/link'
import { StatCard } from '@/components/StatCard'
import {
  getLatestClosedSettlement, getMatchesWithAppearances, getTrainingsWithAttendance,
} from '@/db/queries'
import { teamWinRate } from '@/domain/stats'
import { formatCzk, formatDate, formatWinRate, nextSundayIso, todayIso } from '@/lib/format'

// „Nejbližší trénink“ a „dnešek“ pro filtr budoucích tréninků se počítají
// z aktuálního času, ne z času buildu.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const [trainings, matches, closedSettlement] = await Promise.all([
    getTrainingsWithAttendance(),
    getMatchesWithAppearances(),
    getLatestClosedSettlement(),
  ])

  const today = todayIso()
  const upcoming = trainings
    .filter((t) => t.status === 'held' && t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  const lastHeld = trainings.filter((t) => t.status === 'held').slice(0, 5)
  const record = teamWinRate(matches)

  const unpaidCount = closedSettlement
    ? closedSettlement.items.filter((item) => !item.paid).length
    : 0

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-object bg-ink-raised px-5 py-6">
        <p className="text-meta text-chalk-dim">Příští trénink</p>
        <p className="display mt-2 text-hero leading-none text-chalk">
          {formatDate(upcoming ? upcoming.date : nextSundayIso())}
        </p>
        <p className="mt-3 text-meta text-chalk-dim">
          {upcoming
            ? `${upcoming.heads} ${upcoming.heads === 1 ? 'přihlášená hlava' : 'přihlášených hlav'}.`
            : 'Zatím nezaložený.'}
        </p>
      </section>

      {closedSettlement && unpaidCount > 0 && (
        <Link href="/platby" className="row">
          <span className="text-body text-chalk">Nezaplaceno</span>
          <span className="text-body text-pink">
            {unpaidCount} z {closedSettlement.items.length}
          </span>
        </Link>
      )}

      <section>
        <h2 className="display border-b border-rule pb-3 text-title">Poslední tréninky</h2>
        {lastHeld.length === 0 ? (
          <p className="measure py-4 text-chalk-dim">Zatím žádný trénink.</p>
        ) : (
          <div className="flex flex-col">
            {lastHeld.map((training) => (
              <div key={training.id} className="row">
                <span className="text-body text-chalk">{formatDate(training.date)}</span>
                <span className="text-meta text-chalk-dim">
                  {training.heads} hlav
                  {training.heads > 0
                    ? ` · ${formatCzk(Math.round(training.priceCzk / training.heads))} / hlava`
                    : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <StatCard
        label="Týmová úspěšnost"
        value={formatWinRate(record.rate)}
        hint={record.played > 0 ? `${record.wins}–${record.losses} · ${record.played} zápasů` : undefined}
      />
    </div>
  )
}
