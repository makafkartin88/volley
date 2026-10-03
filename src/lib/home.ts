import type { ChartPoint } from '@/components/AttendanceChart'
import {
  attendanceRanking, heldTrainings, pastTrainings, perHead,
  type PlayerRow, type TrainingRow,
} from '@/lib/attendance'
import { teamWinRate, type MatchInput } from '@/domain/stats'

type SettlementItem = { playerId: number; amountCzk: number; paid: boolean }
type MatchRow = MatchInput & { date: string; opponent: string; scoreText: string | null }

export type HomeData = {
  today: string
  upcoming: { date: string; priceCzk: number; heads: number; perHead: number | null } | null
  /** Kolik nás bylo na posledním proběhlém tréninku s docházkou. */
  lastHeads: number | null
  chartPoints: ChartPoint[]
  loyal: { id: number; name: string; percent: number; attended: number; available: number }[]
  debts: {
    label: string
    paid: number
    total: number
    unpaid: { playerId: number; name: string; amountCzk: number }[]
  } | null
  season: {
    wins: number
    losses: number
    rate: number | null
    last: { opponent: string; scoreText: string | null; result: 'win' | 'loss'; date: string } | null
  } | null
}

/** Všechno, co přehled ukazuje, spočítané z řádků databáze. Bez I/O. */
export function buildHomeData({
  trainings, players, closedSettlement, matches, today,
}: {
  trainings: TrainingRow[]
  players: PlayerRow[]
  closedSettlement: { settlement: { label: string }; items: SettlementItem[] } | null
  matches: MatchRow[]
  today: string
}): HomeData {
  const upcomingRow = trainings
    .filter((t) => t.status === 'held' && t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  const history = pastTrainings(trainings, today)
  const held = heldTrainings(trainings, today)
  const lastWithPeople = [...held].reverse().find((t) => t.heads > 0)

  // Do žebříčku jen aktivní hráči, jména pro dluhy i archivovaných.
  const active = players.filter((p) => p.archivedAt === null)
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  const record = teamWinRate(matches)
  const lastMatch = [...matches].sort((a, b) => b.date.localeCompare(a.date))[0]

  return {
    today,
    upcoming: upcomingRow
      ? {
          date: upcomingRow.date,
          priceCzk: upcomingRow.priceCzk,
          heads: upcomingRow.heads,
          perHead: perHead(upcomingRow),
        }
      : null,
    lastHeads: lastWithPeople?.heads ?? null,
    chartPoints: history.map((t) => (
      t.status === 'cancelled'
        ? { date: t.date, heads: null, perHead: null }
        : { date: t.date, heads: t.heads, perHead: perHead(t) }
    )),
    loyal: attendanceRanking(held, active).slice(0, 5).map(({ player, stat }) => ({
      id: player.id,
      name: player.name,
      percent: Math.round((stat.rate as number) * 100),
      attended: stat.attended,
      available: stat.available,
    })),
    debts: closedSettlement
      ? {
          label: closedSettlement.settlement.label,
          paid: closedSettlement.items.filter((i) => i.paid).length,
          total: closedSettlement.items.length,
          unpaid: closedSettlement.items
            .filter((i) => !i.paid)
            .map((i) => ({
              playerId: i.playerId,
              name: nameById.get(i.playerId) ?? `Hráč #${i.playerId}`,
              amountCzk: i.amountCzk,
            }))
            .sort((a, b) => b.amountCzk - a.amountCzk),
        }
      : null,
    season: matches.length > 0
      ? {
          wins: record.wins,
          losses: record.losses,
          rate: record.rate,
          last: lastMatch
            ? {
                opponent: lastMatch.opponent,
                scoreText: lastMatch.scoreText,
                result: lastMatch.result,
                date: lastMatch.date,
              }
            : null,
        }
      : null,
  }
}
