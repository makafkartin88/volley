import { PageHeader } from '@/components/PageHeader'
import { PlayerListFilter, type PlayerListRow } from '@/components/PlayerListFilter'
import { getAllPlayers, getTrainingsWithAttendance } from '@/db/queries'
import { attendanceRanking, attendanceStat, heldTrainings } from '@/lib/attendance'

export const dynamic = 'force-dynamic'

/**
 * Soupiska podle docházky, s vyhledáváním nad ní — stejné jako v mřížce
 * docházky a sestavě zápasu, ať appka jedná napříč obrazovkami stejně.
 * Žádná růžová: tahle obrazovka nic nechce, jen ukazuje, kdo jak chodí.
 */
export default async function HraciPage() {
  const [trainings, players] = await Promise.all([
    getTrainingsWithAttendance(),
    getAllPlayers(),
  ])

  const held = heldTrainings(trainings)
  const active = players.filter((player) => player.archivedAt === null)
  const archived = players.filter((player) => player.archivedAt !== null)
  const ranked = attendanceRanking(held, active)
  // Kdo ještě neměl žádný trénink k dispozici, vypadne z pořadí — patří na konec.
  const withoutTrainings = active.filter(
    (player) => !ranked.some((row) => row.player.id === player.id),
  )

  const activeRows: PlayerListRow[] = [
    ...ranked.map(({ player, stat }) => ({
      id: player.id,
      name: player.name,
      percent: Math.round((stat.rate as number) * 100),
      detail: `${stat.attended} z ${stat.available}`,
    })),
    ...withoutTrainings.map((player) => ({
      id: player.id,
      name: player.name,
      percent: null,
      detail: 'Zatím bez tréninku',
    })),
  ]

  const archivedRows: PlayerListRow[] = archived.map((player) => {
    const stat = attendanceStat(held, player)
    return {
      id: player.id,
      name: player.name,
      percent: stat.rate === null ? null : Math.round(stat.rate * 100),
      detail: stat.rate === null ? 'Bez tréninků' : `${stat.attended} z ${stat.available}`,
      dim: true,
    }
  })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Hráči"
        subtitle={`${active.length} aktivních. Procento je docházka na konané tréninky.`}
      />

      {active.length === 0 ? (
        <p className="measure py-4 text-chalk-dim">
          Soupiska je prázdná. Hráče přidá organizátor v administraci.
        </p>
      ) : (
        <PlayerListFilter rows={activeRows} />
      )}

      {archived.length > 0 && (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-meta text-chalk-dim">
            Archivovaní hráči ({archived.length})
          </summary>
          <div className="mt-2">
            <PlayerListFilter rows={archivedRows} />
          </div>
        </details>
      )}
    </div>
  )
}
