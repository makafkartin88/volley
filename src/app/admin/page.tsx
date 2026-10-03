import Link from 'next/link'
import { TrainingCarousel, type CarouselTraining } from '@/components/admin/TrainingCarousel'
import {
  getAllPlayers, getLatestClosedSettlement, getSettlements, getTrainingsWithAttendance,
} from '@/db/queries'
import { formatDate, nextSundayIso, plural, todayIso } from '@/lib/format'

// Výchozí trénink i předvyplněné datum se počítají z aktuálního času, ne z času buildu.
export const dynamic = 'force-dynamic'

/** Neděle po zadaném datu (nebo nejbližší neděle, pokud je datum v minulosti). */
function sundayAfter(isoDate: string, today: string): string {
  if (isoDate < today) return nextSundayIso()
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + 7 - date.getDay())
  return todayIso(date)
}

/**
 * Domovská obrazovka administrace. Nahoře pás tréninků s detailem vybraného,
 * pod ním jen to, co vyžaduje pozornost.
 */
export default async function AdminPage({ searchParams }: PageProps<'/admin'>) {
  const [{ t }, trainings, settlements, players, closed] = await Promise.all([
    searchParams,
    getTrainingsWithAttendance(),
    getSettlements(),
    getAllPlayers(),
    getLatestClosedSettlement(),
  ])

  const today = todayIso()
  const closedSettlements = settlements.filter((s) => s.closedAt !== null)
  const byDateAsc: CarouselTraining[] = [...trainings]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((training) => ({
      id: training.id,
      date: training.date,
      priceCzk: training.priceCzk,
      status: training.status,
      attendance: training.attendance.map((a) => ({ playerId: a.playerId, guests: a.guests })),
      heads: training.heads,
      lockedBy: closedSettlements.find(
        (s) => s.periodStart <= training.date && training.date <= s.periodEnd
      )?.label ?? null,
    }))

  const requested = Number(t)
  const upcoming = byDateAsc.find((training) => training.date >= today)
  const initialSelected = byDateAsc.some((training) => training.id === requested)
    ? requested
    : upcoming?.id ?? byDateAsc.at(-1)?.id ?? null

  const last = byDateAsc.at(-1)
  const newDate = last ? sundayAfter(last.date, today) : nextSundayIso()

  const missingAttendance = byDateAsc.filter(
    (training) => training.status === 'held' && training.date < today && training.heads === 0
  )
  const openSettlements = settlements.filter((s) => s.closedAt === null)
  const unpaid = closed ? closed.items.filter((item) => !item.paid).length : 0
  const hasAttention = missingAttendance.length > 0 || openSettlements.length > 0 || unpaid > 0

  return (
    <div className="flex flex-col gap-10">
      <TrainingCarousel
        key={String(t ?? '')}
        trainings={byDateAsc}
        players={players.map((p) => ({ id: p.id, name: p.name, archived: p.archivedAt !== null }))}
        today={today}
        initialSelected={initialSelected}
        newDate={newDate}
      />

      {hasAttention && (
        <section className="flex flex-col gap-3">
          <h2 className="display border-b border-rule pb-3 text-title">Vyžaduje pozornost</h2>
          <div className="flex flex-col">
            {missingAttendance.map((training) => (
              <Link key={training.id} href={`/admin?t=${training.id}`} className="row">
                <span className="text-body text-chalk">
                  Trénink {formatDate(training.date)} nemá zadanou docházku
                </span>
                <span className="text-meta text-chalk-dim">Otevřít</span>
              </Link>
            ))}
            {openSettlements.map((settlement) => (
              <Link key={settlement.id} href="/admin/vyuctovani" className="row">
                <span className="text-body text-chalk">
                  Vyúčtování „{settlement.label}“ je rozpracované
                </span>
                <span className="text-meta text-chalk-dim">Otevřít</span>
              </Link>
            ))}
            {unpaid > 0 && closed && (
              <Link href="/admin/vyuctovani" className="row">
                <span className="text-body text-chalk">
                  {unpaid} {plural(unpaid, 'hráč', 'hráči', 'hráčů')}{' '}
                  {plural(unpaid, 'ještě nezaplatil', 'ještě nezaplatili', 'ještě nezaplatilo')}{' '}
                  za „{closed.settlement.label}“
                </span>
                <span className="text-meta text-chalk-dim">Otevřít</span>
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
