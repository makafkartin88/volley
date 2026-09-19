import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import {
  getMatchesWithAppearances, getPlayerById, getSettlementsWithItems, getTrainingsWithAttendance,
} from '@/db/queries'
import { attendanceStat, heldTrainings } from '@/lib/attendance'
import { playerWinRate } from '@/domain/stats'
import { formatDate, formatWinRate, plural } from '@/lib/format'

export const dynamic = 'force-dynamic'

/**
 * Jeden hráč. Hlavní číslo obrazovky je docházka; historie pod ním ukazuje
 * i tréninky, na kterých nebyl — vzorec („chodí, jen ne v srpnu“) je vidět
 * jen tehdy, když jsou v seznamu i chybějící neděle.
 *
 * Růžová je jen na nezaplacené částce, jako všude jinde v aplikaci.
 */
export default async function HracDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idParam } = await params
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const [player, trainings, settlements, matches] = await Promise.all([
    getPlayerById(id),
    getTrainingsWithAttendance(),
    getSettlementsWithItems(),
    getMatchesWithAppearances(),
  ])
  if (!player) notFound()

  const held = heldTrainings(trainings)
  const stat = attendanceStat(held, player)
  const history = [...held].reverse()
  const record = playerWinRate(matches, player.id)

  const payments = settlements.flatMap(({ settlement, items }) => {
    const item = items.find((i) => i.playerId === player.id)
    return item ? [{ settlement, item }] : []
  })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={player.name}
        subtitle={player.contact ?? undefined}
        action={
          player.archivedAt ? (
            <span className="text-meta text-chalk-dim">Archivovaný</span>
          ) : undefined
        }
      />

      <section>
        <p className="text-meta text-chalk-dim">Docházka</p>
        <p className="display mt-1 text-hero leading-none text-chalk">
          {stat.rate === null ? '—' : `${Math.round(stat.rate * 100)} %`}
        </p>
        <p className="mt-2 text-meta text-chalk-dim">
          {stat.available === 0
            ? 'Zatím nebyl vypsaný žádný trénink.'
            : `${stat.attended} z ${stat.available} ${stat.available === 1 ? 'tréninku' : 'tréninků'}.`}
        </p>
      </section>

      <section>
        <h2 className="display border-b border-rule pb-3 text-title">Historie</h2>
        {history.length === 0 ? (
          <p className="measure py-4 text-chalk-dim">Zatím žádný konaný trénink.</p>
        ) : (
          <ul>
            {history.map((training) => {
              const entry = training.attendance.find((a) => a.playerId === player.id)
              const came = entry !== undefined
              return (
                <li key={training.id} className="row">
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                        came ? 'border-chalk bg-chalk' : 'border-chalk-dim'
                      }`}
                    />
                    <span className={`text-body ${came ? 'text-chalk' : 'text-chalk-dim opacity-70'}`}>
                      {formatDate(training.date)}
                    </span>
                  </span>
                  <span className={`text-meta ${came ? 'text-chalk-dim' : 'text-chalk-dim opacity-70'}`}>
                    {came
                      ? (entry.guests > 0 ? `Byl, +${entry.guests} host${guestSuffix(entry.guests)}` : 'Byl')
                      : 'Nebyl'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="display border-b border-rule pb-3 text-title">Platby</h2>
        {payments.length === 0 ? (
          <p className="measure py-4 text-chalk-dim">
            Žádné vyúčtování, ve kterém by figuroval.
          </p>
        ) : (
          <ul>
            {payments.map(({ settlement, item }) => (
              <li key={settlement.id} className="row">
                <span className="flex flex-col">
                  <span className="text-body text-chalk">{settlement.label}</span>
                  <span className="text-meta text-chalk-dim">
                    {item.paid ? 'Zaplaceno' : settlement.closedAt ? 'Nezaplaceno' : 'Koncept'}
                  </span>
                </span>
                <Money value={item.amountCzk} tone={item.paid ? 'settled' : 'owed'} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {record.rate !== null && (
        <section>
          <h2 className="display border-b border-rule pb-3 text-title">Zápasy</h2>
          <div className="row">
            <span className="text-body text-chalk">
              {record.played} {plural(record.played, 'zápas', 'zápasy', 'zápasů')}
            </span>
            <span className="text-body tabular-nums text-chalk">
              {formatWinRate(record.rate)}
            </span>
          </div>
          <p className="mt-2 text-meta text-chalk-dim">
            {record.wins} {plural(record.wins, 'výhra', 'výhry', 'výher')},{' '}
            {record.losses} {plural(record.losses, 'prohra', 'prohry', 'proher')}.
          </p>
        </section>
      )}

      <Link href="/hraci" className="btn-quiet w-full sm:w-auto">
        Zpět na soupisku
      </Link>
    </div>
  )
}

/** „+1 host“, „+2 hosté“, „+5 hostů“. */
function guestSuffix(guests: number): string {
  if (guests === 1) return ''
  if (guests < 5) return 'é'
  return 'ů'
}
