import { createMatch, deleteMatch, updateMatch } from '@/actions/matches'
import { AdminSection } from '@/components/admin/AdminSection'
import { LineupPicker } from '@/components/LineupPicker'
import { teamWinRate } from '@/domain/stats'
import { formatDate, formatWinRate } from '@/lib/format'

type Player = { id: number; name: string }

export type MatchRow = {
  id: number
  date: string
  opponent: string
  result: 'win' | 'loss'
  scoreText: string | null
  playerIds: number[]
}

const inputClass =
  'mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim'

const optionClass =
  'flex min-h-11 flex-1 items-center justify-center gap-2 border border-chalk-dim text-body text-chalk has-checked:border-chalk'

/** Výhra je plná značka v --chalk, prohra obrysová v --chalk-dim. Žádná zeleň. */
function ResultMark({ result }: { result: 'win' | 'loss' }) {
  return (
    <span
      className={
        result === 'win'
          ? 'flex h-4 w-4 shrink-0 items-center justify-center border border-chalk bg-chalk'
          : 'flex h-4 w-4 shrink-0 items-center justify-center border border-chalk-dim'
      }
      aria-hidden="true"
    />
  )
}

function ResultChoice({ selected }: { selected?: 'win' | 'loss' }) {
  return (
    <fieldset className="flex gap-3">
      <legend className="mb-1 text-meta text-chalk-dim">Výsledek</legend>
      <label className={optionClass}>
        <input
          type="radio"
          name="result"
          value="win"
          defaultChecked={selected === undefined ? true : selected === 'win'}
          className="sr-only"
        />
        <ResultMark result="win" />
        Výhra
      </label>
      <label className={optionClass}>
        <input
          type="radio"
          name="result"
          value="loss"
          defaultChecked={selected === 'loss'}
          className="sr-only"
        />
        <ResultMark result="loss" />
        Prohra
      </label>
    </fieldset>
  )
}

export function MatchesSection({
  matches,
  players,
  today,
}: {
  matches: MatchRow[]
  players: Player[]
  today: string
}) {
  const record = teamWinRate(matches)

  return (
    <AdminSection title="Zápasy" count={String(matches.length)}>
      <p className="text-meta text-chalk-dim">
        {record.played === 0
          ? 'Založ zápas a naklikej sestavu.'
          : `${record.wins}–${record.losses}, ${formatWinRate(record.rate)} úspěšnost`}
      </p>

      <form action={createMatch} className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="sm:w-40">
            <span className="text-meta text-chalk-dim">Datum</span>
            <input type="date" name="date" required defaultValue={today} className={inputClass} />
          </label>
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Soupeř</span>
            <input
              type="text"
              name="opponent"
              required
              maxLength={80}
              placeholder="Např. TJ Sokol Vršovice"
              className={inputClass}
            />
          </label>
          <label className="sm:w-32">
            <span className="text-meta text-chalk-dim">Skóre</span>
            <input
              type="text"
              name="scoreText"
              maxLength={20}
              placeholder="3:1"
              className={inputClass}
            />
          </label>
        </div>

        <ResultChoice />

        <button type="submit" className="btn-quiet self-start">
          Založit zápas
        </button>
      </form>

      <section className="flex flex-col">
        {matches.length === 0 && (
          <p className="measure py-4 text-chalk-dim">Zatím žádný zápas. Založ první.</p>
        )}
        {matches.map((match) => (
          <details key={match.id} className="border-b border-rule">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3">
              <span className="flex flex-col">
                <span className="flex items-center gap-2 text-body text-chalk">
                  <ResultMark result={match.result} />
                  {match.opponent}
                </span>
                <span className="text-meta text-chalk-dim">
                  {formatDate(match.date)}
                  {match.scoreText ? `, ${match.scoreText}` : ''}, {match.playerIds.length} v sestavě
                </span>
              </span>
              <span className="text-meta text-chalk-dim">Upravit</span>
            </summary>

            <div className="flex flex-col gap-6 pt-2 pb-4">
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
                      className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
                    />
                  </label>
                </div>

                <ResultChoice selected={match.result} />

                <button type="submit" className="btn-quiet self-start">
                  Uložit změny
                </button>
              </form>

              <div className="flex flex-col gap-3">
                <h3 className="text-meta text-chalk-dim">Sestava</h3>
                <LineupPicker matchId={match.id} players={players} initial={match.playerIds} />
              </div>

              <form action={deleteMatch}>
                <input type="hidden" name="id" value={match.id} />
                <button type="submit" className="btn-quiet">
                  Smazat zápas
                </button>
              </form>
            </div>
          </details>
        ))}
      </section>
    </AdminSection>
  )
}
