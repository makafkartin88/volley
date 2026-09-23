import { setAvlLeagueId, confirmAvlSuggestion, dismissAvlSuggestion } from '@/actions/avl'
import { formatDate } from '@/lib/format'

type Suggestion = {
  id: number
  date: string
  opponent: string
  result: 'win' | 'loss'
  scoreText: string
}

const inputClass =
  'mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim'

/** Stejný vzor jako v `AvlImport`/`MatchesSection` — plná značka pro výhru, obrysová pro prohru. */
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

export function AvlWeeklyCheck({
  leagueId,
  suggestions,
}: {
  leagueId: string | null
  suggestions: Suggestion[]
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-rule pt-6">
      <h2 className="text-meta text-chalk-dim">Týdenní kontrola avlka.cz</h2>

      <form action={setAvlLeagueId} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="sm:w-48">
          <span className="text-meta text-chalk-dim">ID aktuální ligy</span>
          <input
            type="text"
            name="leagueId"
            inputMode="numeric"
            defaultValue={leagueId ?? ''}
            placeholder="452"
            className={inputClass}
          />
        </label>
        <button type="submit" className="btn-quiet">
          Uložit
        </button>
        <span className="text-meta text-chalk-dim">
          {leagueId ? `Nastaveno: ${leagueId}` : 'Nenastaveno'}
        </span>
      </form>

      <div>
        {suggestions.length === 0 ? (
          <p className="measure text-meta text-chalk-dim">Žádné čekající návrhy z AVL.</p>
        ) : (
          <ul className="flex flex-col">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className="row flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex items-center gap-2 text-body text-chalk">
                  <ResultMark result={suggestion.result} />
                  {suggestion.opponent}
                  <span className="text-meta text-chalk-dim">
                    {formatDate(suggestion.date)}, {suggestion.scoreText}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <form action={confirmAvlSuggestion}>
                    <input type="hidden" name="id" value={suggestion.id} />
                    <button type="submit" className="btn-quiet">
                      Přidat
                    </button>
                  </form>
                  <form action={dismissAvlSuggestion}>
                    <input type="hidden" name="id" value={suggestion.id} />
                    <button type="submit" className="btn-quiet">
                      Zamítnout
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
