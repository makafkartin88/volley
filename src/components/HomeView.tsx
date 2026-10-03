import Link from 'next/link'
import { AttendanceChart } from '@/components/AttendanceChart'
import { Money } from '@/components/Money'
import { formatCzk, plural, todayIso, weekdayOf } from '@/lib/format'
import type { HomeData } from '@/lib/home'

const WEEKDAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota']

function players(count: number): string {
  return `${count} ${plural(count, 'hráč', 'hráči', 'hráčů')}`
}

/** `"2026-10-04"` → `"4. 10."` */
function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${d}. ${m}.`
}

/** „Dnes, neděle“ / „Zítra, neděle“ / „Příští trénink, neděle“. */
function upcomingLabel(date: string, today: string): string {
  const weekday = WEEKDAYS[weekdayOf(date)]
  if (date === today) return `Dnes, ${weekday}`
  const tomorrow = new Date(`${today}T12:00:00`)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date === todayIso(tomorrow)) return `Zítra, ${weekday}`
  return `Příští trénink, ${weekday}`
}

/**
 * Přehled pro hráče, poskládaný podle toho, co člověk po otevření odkazu
 * ze skupiny chce vědět: kdy se hraje, jestli někdo dluží, jak jde sezóna,
 * a teprve pak statistiky docházky. Růžová patří jen nezaplaceným částkám.
 */
export function HomeView({ data }: { data: HomeData }) {
  const { upcoming, debts, season, loyal } = data
  const unpaid = debts?.unpaid ?? []

  return (
    <div className="flex flex-col gap-10">
      <NextTraining data={data} />

      {debts && unpaid.length > 0 && (
        <section>
          <h2 className="display text-title">Nezaplaceno</h2>
          <p className="mt-1 border-b border-rule pb-3 text-meta text-chalk-dim">
            {debts.label}, zaplatilo {debts.paid} z {debts.total}.
          </p>
          <ul>
            {unpaid.map((item) => (
              <li key={item.playerId}>
                <Link href={`/platby/${item.playerId}`} className="row">
                  <span className="text-body text-chalk">{item.name}</span>
                  <Money value={item.amountCzk} tone="owed" />
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/platby" className="btn-quiet mt-4 w-full sm:w-auto">
            Všechny platby
          </Link>
        </section>
      )}

      {season && (
        <Link
          href="/zapasy"
          className="grid grid-cols-[auto_1fr] items-end gap-x-6 border-y border-rule py-4"
        >
          <span>
            <span className="block text-meta text-chalk-dim">Sezóna, výhry : prohry</span>
            <span className="display block text-[clamp(2.25rem,10vw,3rem)] leading-none tabular-nums text-chalk">
              {season.wins}:{season.losses}
            </span>
          </span>
          {season.last && (
            <span className="min-w-0 text-right">
              <span className="block text-meta text-chalk-dim">
                Naposledy, {shortDate(season.last.date)}
              </span>
              <span className="block truncate text-body text-chalk">{season.last.opponent}</span>
              <span className="block text-meta text-chalk-dim">
                {season.last.result === 'win' ? 'Výhra' : 'Prohra'}
                {season.last.scoreText ? ` ${season.last.scoreText}` : ''}
              </span>
            </span>
          )}
        </Link>
      )}

      {loyal.length === 0 ? (
        <section className="border-t border-rule pt-4">
          <h2 className="display text-title">Sezóna začíná</h2>
          <p className="measure mt-2 text-chalk-dim">
            {upcoming
              ? 'Po prvním tréninku tu uvidíš, kolik nás chodí a kdo nevynechá ani jednu neděli.'
              : 'Až proběhne první trénink, uvidíš tu, kolik nás chodí a kdo nevynechá ani jednu neděli.'}
          </p>
        </section>
      ) : (
        <>
          <section>
            <h2 className="display border-b border-rule pb-3 text-title">Kolik nás chodí</h2>
            <div className="pt-4">
              <AttendanceChart points={data.chartPoints} />
            </div>
          </section>

          <section>
            <h2 className="display border-b border-rule pb-3 text-title">Nejvěrnější</h2>
            <ol>
              {loyal.map((player, index) => (
                <li key={player.id}>
                  <Link
                    href={`/hraci/${player.id}`}
                    className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-rule py-3"
                  >
                    <span className="display text-title leading-none tabular-nums text-chalk-dim">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-body text-chalk">{player.name}</span>
                      <span className="block text-meta text-chalk-dim">
                        {player.attended} z {player.available}{' '}
                        {plural(player.available, 'tréninku', 'tréninků', 'tréninků')}
                      </span>
                    </span>
                    <span className="display text-title tabular-nums text-chalk">
                      {player.percent} %
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link href="/hraci" className="btn-quiet mt-4 w-full sm:w-auto">
              Celá soupiska
            </Link>
          </section>
        </>
      )}
    </div>
  )
}

function NextTraining({ data }: { data: HomeData }) {
  const { upcoming, lastHeads, today } = data

  if (!upcoming) {
    return (
      <section className="rounded-object bg-ink-raised px-5 py-6">
        <p className="text-meta text-chalk-dim">Příští trénink</p>
        <p className="display mt-2 text-title leading-tight text-chalk">Zatím žádný termín</p>
        <p className="measure mt-2 text-meta text-chalk-dim">
          Další neděli založí organizátor a objeví se tady.
        </p>
      </section>
    )
  }

  const stats: { label: string; value: string }[] = upcoming.heads > 0
    ? [
        { label: 'Na tréninku', value: players(upcoming.heads) },
        { label: 'Na hlavu', value: upcoming.perHead === null ? '-' : formatCzk(upcoming.perHead) },
      ]
    : [
        { label: 'Hala', value: formatCzk(upcoming.priceCzk) },
        ...(lastHeads !== null ? [{ label: 'Minule nás bylo', value: players(lastHeads) }] : []),
      ]

  return (
    <section className="rounded-object bg-ink-raised px-5 pt-5 pb-4">
      <p className="text-meta text-chalk-dim">{upcomingLabel(upcoming.date, today)}</p>
      <p className="display mt-1 text-hero leading-none text-chalk">{shortDate(upcoming.date)}</p>
      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-rule pt-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-meta text-chalk-dim">{stat.label}</dt>
            <dd className="display text-title tabular-nums text-chalk">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
