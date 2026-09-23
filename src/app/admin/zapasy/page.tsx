import { PageHeader } from '@/components/PageHeader'
import { AvlImport } from '@/components/admin/AvlImport'
import { AvlWeeklyCheck } from '@/components/admin/AvlSuggestions'
import { MatchesSection } from '@/components/admin/MatchesSection'
import {
  getActivePlayers, getAvlLeagueId, getAvlSuggestions, getMatchesWithAppearances,
} from '@/db/queries'
import { teamWinRate } from '@/domain/stats'
import { formatWinRate, todayIso } from '@/lib/format'

// Předvyplněné datum nového zápasu se počítá z aktuálního času, ne z buildu.
export const dynamic = 'force-dynamic'

export default async function AdminZapasyPage() {
  const [matches, players, leagueId, suggestions] = await Promise.all([
    getMatchesWithAppearances(),
    getActivePlayers(),
    getAvlLeagueId(),
    getAvlSuggestions(),
  ])
  const record = teamWinRate(matches)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Zápasy"
        subtitle={
          record.played === 0
            ? 'Založ zápas a naklikej sestavu.'
            : `${record.wins}–${record.losses}, ${formatWinRate(record.rate)} úspěšnost.`
        }
      />
      <MatchesSection matches={matches} players={players} today={todayIso()} />
      <AvlImport
        existingMatches={matches.map((m) => ({ opponent: m.opponent, scoreText: m.scoreText }))}
      />
      <AvlWeeklyCheck leagueId={leagueId} suggestions={suggestions} />
    </div>
  )
}
