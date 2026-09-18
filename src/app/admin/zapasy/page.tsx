import Link from 'next/link'
import { createMatch, deleteMatch } from '@/actions/matches'
import { getMatchesWithAppearances } from '@/db/queries'
import { PageHeader } from '@/components/PageHeader'
import { teamWinRate } from '@/domain/stats'
import { formatDate, formatWinRate } from '@/lib/format'

// Předvyplněné datum se počítá z aktuálního času, ne z času buildu.
export const dynamic = 'force-dynamic'

export default async function ZapasyPage() {
  const matches = await getMatchesWithAppearances()
  const record = teamWinRate(matches)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Zápasy"
        subtitle={
          record.played === 0
            ? 'Založ zápas a naklikej sestavu.'
            : `${record.wins}–${record.losses} · ${formatWinRate(record.rate)} úspěšnost`
        }
      />

      <form action={createMatch} className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="sm:w-40">
            <span className="text-meta text-chalk-dim">Datum</span>
            <input
              type="date"
              name="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk"
            />
          </label>
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Soupeř</span>
            <input
              type="text"
              name="opponent"
              required
              maxLength={80}
              placeholder="Např. TJ Sokol Vršovice"
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim"
            />
          </label>
          <label className="sm:w-32">
            <span className="text-meta text-chalk-dim">Skóre</span>
            <input
              type="text"
              name="scoreText"
              maxLength={20}
              placeholder="3:1"
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim"
            />
          </label>
        </div>

        <fieldset className="flex gap-3">
          <legend className="mb-1 text-meta text-chalk-dim">Výsledek</legend>
          <label className="flex min-h-11 flex-1 items-center justify-center gap-2 border border-chalk-dim text-body text-chalk has-checked:border-chalk">
            <input type="radio" name="result" value="win" defaultChecked className="sr-only" />
            <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-chalk bg-chalk" aria-hidden="true" />
            Výhra
          </label>
          <label className="flex min-h-11 flex-1 items-center justify-center gap-2 border border-chalk-dim text-body text-chalk has-checked:border-chalk">
            <input type="radio" name="result" value="loss" className="sr-only" />
            <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-chalk-dim" aria-hidden="true" />
            Prohra
          </label>
        </fieldset>

        <button type="submit" className="btn-primary self-start">
          Založit zápas
        </button>
      </form>

      <section className="flex flex-col">
        {matches.length === 0 && (
          <p className="measure py-4 text-chalk-dim">Zatím žádný zápas. Založ první.</p>
        )}
        {matches.map((match) => (
          <div key={match.id} className="row">
            <Link href={`/admin/zapasy/${match.id}`} className="flex flex-col">
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
                {formatDate(match.date)}
                {match.scoreText ? ` · ${match.scoreText}` : ''} · {match.playerIds.length} v sestavě
              </span>
            </Link>
            <form action={deleteMatch}>
              <input type="hidden" name="id" value={match.id} />
              <button type="submit" className="btn-quiet">
                Smazat
              </button>
            </form>
          </div>
        ))}
      </section>
    </div>
  )
}
