import { notFound } from 'next/navigation'
import { updateMatch } from '@/actions/matches'
import { LineupPicker } from '@/components/LineupPicker'
import { PageHeader } from '@/components/PageHeader'
import { getActivePlayers, getMatchWithAppearances } from '@/db/queries'
import { formatDate } from '@/lib/format'

export default async function ZapasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const matchId = Number(id)
  if (!Number.isInteger(matchId) || matchId <= 0) notFound()

  const [result, players] = await Promise.all([
    getMatchWithAppearances(matchId),
    getActivePlayers(),
  ])
  if (!result) notFound()

  const { match, playerIds } = result

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={match.opponent}
        subtitle={`${formatDate(match.date)}${match.scoreText ? ` · ${match.scoreText}` : ''}`}
      />

      <form action={updateMatch} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={match.id} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="sm:w-40">
            <span className="text-meta text-chalk-dim">Datum</span>
            <input
              type="date"
              name="date"
              required
              defaultValue={match.date}
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
              defaultValue={match.opponent}
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk"
            />
          </label>
          <label className="sm:w-32">
            <span className="text-meta text-chalk-dim">Skóre</span>
            <input
              type="text"
              name="scoreText"
              maxLength={20}
              defaultValue={match.scoreText ?? ''}
              placeholder="3:1"
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim"
            />
          </label>
        </div>

        <fieldset className="flex gap-3">
          <legend className="mb-1 text-meta text-chalk-dim">Výsledek</legend>
          <label className="flex min-h-11 flex-1 items-center justify-center gap-2 border border-chalk-dim text-body text-chalk has-checked:border-chalk">
            <input
              type="radio"
              name="result"
              value="win"
              defaultChecked={match.result === 'win'}
              className="sr-only"
            />
            <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-chalk bg-chalk" aria-hidden="true" />
            Výhra
          </label>
          <label className="flex min-h-11 flex-1 items-center justify-center gap-2 border border-chalk-dim text-body text-chalk has-checked:border-chalk">
            <input
              type="radio"
              name="result"
              value="loss"
              defaultChecked={match.result === 'loss'}
              className="sr-only"
            />
            <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-chalk-dim" aria-hidden="true" />
            Prohra
          </label>
        </fieldset>

        <button type="submit" className="btn-quiet self-start">
          Uložit změny
        </button>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="text-meta text-chalk-dim">Sestava</h2>
        <LineupPicker matchId={match.id} players={players} initial={playerIds} />
      </div>
    </div>
  )
}
