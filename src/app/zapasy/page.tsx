import { getAllPlayers, getMatchesWithAppearances } from '@/db/queries'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { playerWinRate, teamWinRate } from '@/domain/stats'
import { formatDate, formatWinRate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function ZapasyPage() {
  const [matches, players] = await Promise.all([
    getMatchesWithAppearances(),
    getAllPlayers(),
  ])
  const nameById = new Map(players.map((p) => [p.id, p.name]))
  const record = teamWinRate(matches)

  const table = players
    .map((player) => ({ player, rate: playerWinRate(matches, player.id) }))
    .filter((row) => row.rate.rate !== null)
    .sort((a, b) => (b.rate.rate as number) - (a.rate.rate as number))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Zápasy" subtitle="Výsledky a úspěšnost týmu i jednotlivců." />

      <StatCard
        label="Týmová úspěšnost"
        value={formatWinRate(record.rate)}
        hint={record.played > 0 ? `${record.wins}–${record.losses} · ${record.played} zápasů` : undefined}
      />

      <section>
        <h2 className="display border-b border-rule pb-3 text-title">Zápasy</h2>
        {matches.length === 0 && (
          <p className="measure py-4 text-chalk-dim">Zatím žádný zápas.</p>
        )}
        {matches.map((match) => {
          const lineup = match.playerIds.map((id) => nameById.get(id) ?? `Hráč #${id}`)
          return (
            <div key={match.id} className="row">
              <span className="flex flex-col">
                <span className="flex items-center gap-2 text-body text-chalk">
                  <span
                    className={
                      match.result === 'win'
                        ? 'flex h-4 w-4 shrink-0 items-center justify-center border border-chalk bg-chalk'
                        : 'flex h-4 w-4 shrink-0 items-center justify-center border border-chalk-dim'
                    }
                    aria-hidden="true"
                  />
                  {match.opponent}
                </span>
                <span className="text-meta text-chalk-dim">
                  {lineup.length > 0 ? lineup.join(', ') : 'Sestava nezaznamenaná'}
                </span>
              </span>
              <span className="text-right text-meta text-chalk-dim">
                {formatDate(match.date)}
                {match.scoreText ? ` · ${match.scoreText}` : ''}
              </span>
            </div>
          )
        })}
      </section>

      <section>
        <h2 className="display border-b border-rule pb-3 text-title">Úspěšnost hráčů</h2>
        {table.length === 0 ? (
          <p className="measure py-4 text-chalk-dim">Zatím nikdo neodehrál zápas.</p>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 border-b border-rule pb-2 text-meta text-chalk-dim">
              <span>Hráč</span>
              <span className="text-right">Odehráno</span>
              <span className="text-right">Výhry</span>
              <span className="text-right">Prohry</span>
              <span className="text-right">Úspěšnost</span>
            </div>
            {table.map(({ player, rate }) => (
              <div
                key={player.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 border-b border-rule py-2 text-body text-chalk"
              >
                <span>{player.name}</span>
                <span className="text-right tabular-nums text-chalk-dim">{rate.played}</span>
                <span className="text-right tabular-nums text-chalk-dim">{rate.wins}</span>
                <span className="text-right tabular-nums text-chalk-dim">{rate.losses}</span>
                <span className="text-right tabular-nums">{formatWinRate(rate.rate)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
