import Link from 'next/link'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { PageHeader } from '@/components/PageHeader'
import { CreateTrainingForm, TrainingsSection } from '@/components/admin/TrainingsSection'
import { TrainingStatusToggle, trainingStatusLabel } from '@/components/admin/TrainingStatus'
import {
  getActivePlayers, getLatestClosedSettlement, getSettlements, getTrainingsWithAttendance,
} from '@/db/queries'
import { formatCzk, formatDate, plural, todayIso } from '@/lib/format'

// Nepokrytý trénink dneška se má hlásit hned po tréninku, ne až zítra,
// a předvyplněné datum se počítá z aktuálního času, ne z času buildu.
export const dynamic = 'force-dynamic'

/**
 * Domovská obrazovka administrace — tréninky. Organizátor ji otevírá na
 * telefonu v hale hned po tréninku, takže nejbližší (nebo nepokrytý)
 * trénink je nahoře i s mřížkou docházky, restů se týká blok pod ním
 * a teprve pak jde celý výpis.
 */
export default async function AdminPage() {
  const [trainings, settlements, activePlayers, closed] = await Promise.all([
    getTrainingsWithAttendance(),
    getSettlements(),
    getActivePlayers(),
    getLatestClosedSettlement(),
  ])

  const today = todayIso()
  const byDateAsc = [...trainings].sort((a, b) => a.date.localeCompare(b.date))

  // 1. proběhlý trénink bez docházky (nejstarší), 2. nejbližší nadcházející.
  const overdue = byDateAsc.find(
    (t) => t.status === 'held' && t.date <= today && t.attendance.length === 0
  )
  const upcoming = byDateAsc.find((t) => t.date >= today)
  const focus = overdue ?? upcoming ?? null

  // Ostatní proběhlé tréninky bez docházky — ten nahoře se neopakuje.
  const missingAttendance = byDateAsc.filter(
    (t) => t.status === 'held' && t.date <= today && t.attendance.length === 0
      && t.id !== focus?.id
  )
  const openSettlements = settlements.filter((s) => s.closedAt === null)
  const unpaid = closed ? closed.items.filter((item) => !item.paid).length : 0

  const hasAttention = missingAttendance.length > 0 || openSettlements.length > 0 || unpaid > 0

  return (
    <div className="flex flex-col gap-10">
      {focus ? (
        <section className="flex flex-col gap-6">
          <PageHeader
            title={formatDate(focus.date)}
            subtitle={
              overdue
                ? `Chybí docházka, ${formatCzk(focus.priceCzk)} za halu`
                : `${trainingStatusLabel[focus.status]}, ${formatCzk(focus.priceCzk)} za halu`
            }
          />
          <AttendanceGrid
            trainingId={focus.id}
            priceCzk={focus.priceCzk}
            players={activePlayers}
            initial={focus.attendance.map((a) => ({ playerId: a.playerId, guests: a.guests }))}
          />
          <TrainingStatusToggle id={focus.id} status={focus.status} />
        </section>
      ) : (
        <section className="flex flex-col gap-6">
          <PageHeader
            title="Žádný trénink"
            subtitle="Založ nejbližší neděli a můžeš rovnou zapisovat docházku."
          />
          <CreateTrainingForm tone="primary" />
        </section>
      )}

      {hasAttention && (
        <section className="flex flex-col gap-3">
          <h2 className="display border-b border-rule pb-3 text-title">Vyžaduje pozornost</h2>
          <div className="flex flex-col">
            {/* Chybějící docházka se neodkazuje — celý výpis tréninků je hned pod tím. */}
            {missingAttendance.map((training) => (
              <p key={training.id} className="row text-body text-chalk">
                Trénink {formatDate(training.date)} nemá zadanou docházku
              </p>
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

      <section className="flex flex-col gap-6">
        <PageHeader
          title="Tréninky"
          subtitle={`${trainings.length} ${plural(trainings.length, 'trénink', 'tréninky', 'tréninků')} celkem.`}
        />
        <TrainingsSection trainings={trainings} players={activePlayers} />
      </section>
    </div>
  )
}
