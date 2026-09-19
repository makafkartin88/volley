import Link from 'next/link'
import { AttendanceChart, type ChartPoint } from '@/components/AttendanceChart'
import { Money } from '@/components/Money'
import {
  getAllPlayers, getLatestClosedSettlement, getTrainingsWithAttendance,
} from '@/db/queries'
import {
  attendanceRanking, heldTrainings, pastTrainings, perHead,
} from '@/lib/attendance'
import { formatCzk, formatDate, plural, todayIso } from '@/lib/format'

// „Nejbližší trénink“ i hranice mezi historií a budoucností se počítají
// z aktuálního času, ne z času buildu.
export const dynamic = 'force-dynamic'

/**
 * Rozcestník celé aplikace — jediná adresa, kterou stačí poslat do skupiny.
 *
 * Růžová je na téhle obrazovce vyhrazená jedné věci: nezaplaceným částkám
 * v posledním vyúčtování. To je jediné místo, které po člověku něco chce.
 * Hero i graf zůstávají v --chalk; růžový bod v grafu je jen dotyk.
 */
export default async function Home() {
  const [trainings, players, closedSettlement] = await Promise.all([
    getTrainingsWithAttendance(),
    getAllPlayers(),
    getLatestClosedSettlement(),
  ])
  // Do žebříčku jdou jen aktivní hráči, jména do vyúčtování musí být všechna
  // — dluh může zůstat i po archivaci.
  const active = players.filter((player) => player.archivedAt === null)

  const today = todayIso()
  const upcoming = trainings
    .filter((t) => t.status === 'held' && t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  const history = pastTrainings(trainings, today)
  const chartPoints: ChartPoint[] = history.map((training) => (
    training.status === 'cancelled'
      ? { date: training.date, heads: null, perHead: null }
      : { date: training.date, heads: training.heads, perHead: perHead(training) }
  ))

  const held = heldTrainings(trainings, today)
  const loyal = attendanceRanking(held, active).slice(0, 5)

  const upcomingPerHead = upcoming ? perHead(upcoming) : null

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-object bg-ink-raised px-5 py-6">
        <p className="text-meta text-chalk-dim">Příští trénink</p>
        {upcoming ? (
          <>
            <p className="display mt-2 text-hero leading-none text-chalk">
              {formatDate(upcoming.date)}
            </p>
            <dl className="mt-4 flex gap-8">
              <div>
                <dt className="text-meta text-chalk-dim">Přihlášeno</dt>
                <dd className="display text-title tabular-nums text-chalk">
                  {upcoming.heads} {plural(upcoming.heads, 'hráč', 'hráči', 'hráčů')}
                </dd>
              </div>
              <div>
                <dt className="text-meta text-chalk-dim">Na hlavu</dt>
                <dd className="display text-title tabular-nums text-chalk">
                  {upcomingPerHead === null ? '—' : formatCzk(upcomingPerHead)}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <p className="display mt-2 text-title leading-tight text-chalk">
              Zatím žádný termín
            </p>
            <p className="measure mt-2 text-meta text-chalk-dim">
              Další neděli založí organizátor v administraci a objeví se tady.
            </p>
          </>
        )}
      </section>

      <section>
        <h2 className="display border-b border-rule pb-3 text-title">Kolik nás chodí</h2>
        <div className="pt-4">
          <AttendanceChart points={chartPoints} />
        </div>
      </section>

      <section>
        <h2 className="display border-b border-rule pb-3 text-title">Nejvěrnější</h2>
        {loyal.length === 0 ? (
          <p className="measure py-4 text-chalk-dim">
            Po prvním zapsaném tréninku bude jasné, kdo chodí nejspolehlivěji.
          </p>
        ) : (
          <ul>
            {loyal.map(({ player, stat }) => {
              const percent = Math.round((stat.rate as number) * 100)
              return (
                <li key={player.id}>
                  <Link
                    href={`/hraci/${player.id}`}
                    className="block border-b border-rule py-3"
                  >
                    <span className="flex items-baseline justify-between gap-4">
                      <span className="text-body text-chalk">{player.name}</span>
                      <span className="text-body tabular-nums text-chalk">{percent} %</span>
                    </span>
                    <span aria-hidden="true" className="mt-2 block h-1 bg-rule">
                      <span className="block h-full bg-chalk" style={{ width: `${percent}%` }} />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <LastSettlement settlement={closedSettlement} players={players} />
    </div>
  )
}

function LastSettlement({
  settlement,
  players,
}: {
  settlement: Awaited<ReturnType<typeof getLatestClosedSettlement>>
  players: { id: number; name: string }[]
}) {
  if (!settlement) {
    return (
      <section>
        <h2 className="display border-b border-rule pb-3 text-title">Poslední vyúčtování</h2>
        <p className="measure py-4 text-chalk-dim">
          Žádné uzavřené vyúčtování. Až organizátor období uzavře, uvidíš tu, kdo kolik dluží.
        </p>
      </section>
    )
  }

  const { settlement: header, items } = settlement
  const nameById = new Map(players.map((p) => [p.id, p.name]))
  const paid = items.filter((item) => item.paid)
  const unpaid = items.filter((item) => !item.paid)

  return (
    <section>
      <h2 className="display border-b border-rule pb-3 text-title">Poslední vyúčtování</h2>
      <p className="mt-3 text-meta text-chalk-dim">
        {header.label}, zaplaceno {paid.length} z {items.length}.
      </p>

      <div className="mt-3 flex flex-col">
        {unpaid.length === 0 ? (
          <p className="measure py-4 text-chalk-dim">Zaplatili všichni, nic neběží.</p>
        ) : (
          unpaid.map((item) => (
            <Link key={item.id} href={`/platby/${item.playerId}`} className="row">
              <span className="text-body text-chalk">
                {nameById.get(item.playerId) ?? `Hráč #${item.playerId}`}
              </span>
              <Money value={item.amountCzk} tone="owed" />
            </Link>
          ))
        )}
      </div>

      <Link href="/platby" className="btn-quiet mt-4 w-full sm:w-auto">
        Otevřít platby
      </Link>
    </section>
  )
}
