import { getAllPlayers, getMatchesWithAppearances } from '@/db/queries'
import { PageHeader } from '@/components/PageHeader'
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

      <div className="border-t border-rule pt-2">
        <div className="text-meta text-chalk-dim">Týmová úspěšnost</div>
        <div className="display mt-0.5 text-hero leading-none tabular-nums text-chalk">
          {formatWinRate(record.rate)}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-rule pt-3">
          <div>
            <div className="text-meta text-chalk-dim">Výhry</div>
            <div className="display mt-0.5 text-title tabular-nums text-chalk">{record.wins}</div>
          </div>
          <div>
            <div className="text-meta text-chalk-dim">Prohry</div>
            <div className="display mt-0.5 text-title tabular-nums text-chalk">{record.losses}</div>
          </div>
          <div>
            <div className="text-meta text-chalk-dim">Odehráno</div>
            <div className="display mt-0.5 text-title tabular-nums text-chalk">{record.played}</div>
          </div>
        </div>
      </div>

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
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-rule text-meta text-chalk-dim">
                <th scope="col" className="py-2 font-normal">Hráč</th>
                <th scope="col" className="py-2 text-right font-normal">Odehráno</th>
                <th scope="col" className="py-2 text-right font-normal">Výhry</th>
                <th scope="col" className="py-2 text-right font-normal">Prohry</th>
                <th scope="col" className="py-2 text-right font-normal">Úspěšnost</th>
              </tr>
            </thead>
            <tbody>
              {table.map(({ player, rate }) => (
                <tr key={player.id} className="border-b border-rule text-body text-chalk">
                  <td className="py-2">{player.name}</td>
                  <td className="py-2 text-right tabular-nums text-chalk-dim">{rate.played}</td>
                  <td className="py-2 text-right tabular-nums text-chalk-dim">{rate.wins}</td>
                  <td className="py-2 text-right tabular-nums text-chalk-dim">{rate.losses}</td>
                  <td className="py-2 text-right tabular-nums">{formatWinRate(rate.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
