import { AttendanceGrid } from '@/components/AttendanceGrid'
import { PageHeader } from '@/components/PageHeader'
import { MatchesSection } from '@/components/admin/MatchesSection'
import { PlayersSection } from '@/components/admin/PlayersSection'
import { SettlementsSection } from '@/components/admin/SettlementsSection'
import { CreateTrainingForm, TrainingsSection } from '@/components/admin/TrainingsSection'
import { TrainingStatusToggle, trainingStatusLabel } from '@/components/admin/TrainingStatus'
import {
  getActivePlayers, getAllPlayers, getMatchesWithAppearances, getSettlements,
  getTrainingsWithAttendance,
} from '@/db/queries'
import { formatCzk, formatDate } from '@/lib/format'

// Nepokrytý trénink dneška se má hlásit hned po tréninku, ne až zítra,
// a předvyplněné datum se počítá z aktuálního času, ne z času buildu.
export const dynamic = 'force-dynamic'

/**
 * Celá administrace na jedné stránce. Organizátor ji otevírá na telefonu
 * v hale hned po tréninku — to, co potřebuje, je nahoře a už rozbalené,
 * zbytek čeká složený v `<details>`.
 */
export default async function AdminPage() {
  const [trainings, matches, settlements, activePlayers, allPlayers] = await Promise.all([
    getTrainingsWithAttendance(),
    getMatchesWithAppearances(),
    getSettlements(),
    getActivePlayers(),
    getAllPlayers(),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const byDateAsc = [...trainings].sort((a, b) => a.date.localeCompare(b.date))

  // 1. proběhlý trénink bez docházky (nejstarší), 2. nejbližší nadcházející.
  const overdue = byDateAsc.find(
    (t) => t.status === 'held' && t.date <= today && t.attendance.length === 0
  )
  const upcoming = byDateAsc.find((t) => t.date >= today)
  const focus = overdue ?? upcoming ?? null

  const nameById = new Map(allPlayers.map((p) => [p.id, p.name]))

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

      <div className="flex flex-col border-t border-rule">
        <TrainingsSection trainings={trainings} players={activePlayers} />
        <MatchesSection matches={matches} players={activePlayers} today={today} />
        <SettlementsSection settlements={settlements} nameById={nameById} />
        <PlayersSection players={allPlayers} />
      </div>
    </div>
  )
}
