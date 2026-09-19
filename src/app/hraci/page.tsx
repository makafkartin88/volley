import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { getAllPlayers, getTrainingsWithAttendance } from '@/db/queries'
import {
  attendanceRanking, attendanceStat, formatRate, heldTrainings, type PlayerRow,
} from '@/lib/attendance'

export const dynamic = 'force-dynamic'

/**
 * Soupiska podle docházky. Žádná růžová: tahle obrazovka nic nechce,
 * jen ukazuje, kdo jak chodí. Sloupec procent nese i tenkou lištu, aby
 * se pořadí dalo přečíst jedním pohledem, ne čtením čísel řádek po řádku.
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
        <ul>
          {ranked.map(({ player, stat }) => (
            <PlayerRowLink
              key={player.id}
              player={player}
              percent={Math.round((stat.rate as number) * 100)}
              detail={`${stat.attended} z ${stat.available}`}
            />
          ))}
          {withoutTrainings.map((player) => (
            <PlayerRowLink key={player.id} player={player} percent={null} detail="Zatím bez tréninku" />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-meta text-chalk-dim">
            Archivovaní hráči ({archived.length})
          </summary>
          <ul className="mt-2">
            {archived.map((player) => {
              const stat = attendanceStat(held, player)
              return (
                <PlayerRowLink
                  key={player.id}
                  player={player}
                  percent={stat.rate === null ? null : Math.round(stat.rate * 100)}
                  detail={stat.rate === null ? 'Bez tréninků' : `${stat.attended} z ${stat.available}`}
                  dim
                />
              )
            })}
          </ul>
        </details>
      )}
    </div>
  )
}

function PlayerRowLink({
  player,
  percent,
  detail,
  dim = false,
}: {
  player: PlayerRow
  percent: number | null
  detail: string
  dim?: boolean
}) {
  return (
    <li>
      <Link href={`/hraci/${player.id}`} className="block border-b border-rule py-3">
        <span className="flex items-baseline justify-between gap-4">
          <span className={`text-body ${dim ? 'text-chalk-dim' : 'text-chalk'}`}>
            {player.name}
          </span>
          <span className="flex items-baseline gap-3">
            <span className="text-meta text-chalk-dim">{detail}</span>
            <span className={`text-body tabular-nums ${dim ? 'text-chalk-dim' : 'text-chalk'}`}>
              {formatRate(percent === null ? null : percent / 100)}
            </span>
          </span>
        </span>
        {percent !== null && (
          <span aria-hidden="true" className="mt-2 block h-1 bg-rule">
            <span
              className={`block h-full ${dim ? 'bg-chalk-dim' : 'bg-chalk'}`}
              style={{ width: `${percent}%` }}
            />
          </span>
        )}
      </Link>
    </li>
  )
}
