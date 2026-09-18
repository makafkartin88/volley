import {
  and, desc, eq, gte, isNull, lte,
} from 'drizzle-orm'
import { db } from '@/db'
import {
  players, trainings, attendance, matches, matchAppearances, settlements, settlementItems,
} from '@/db/schema'
import type { TrainingInput } from '@/domain/settlement'

/**
 * Řadíme v JS, ne v SQL. Postgres by podle své collation mohl poslat Šárku
 * až za Z; `localeCompare` s 'cs' dá správné české pořadí bez ohledu na to,
 * jak je databáze nastavená. Hráčů jsou desítky, cena je nulová.
 */
function byCzechName<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'cs'))
}

export async function getActivePlayers() {
  return byCzechName(await db.select().from(players).where(isNull(players.archivedAt)))
}

export async function getAllPlayers() {
  return byCzechName(await db.select().from(players))
}

export async function getTrainings() {
  return db.select().from(trainings).orderBy(desc(trainings.date))
}

export async function getTrainingWithAttendance(id: number) {
  const [training] = await db.select().from(trainings).where(eq(trainings.id, id))
  if (!training) return null
  const rows = await db.select().from(attendance).where(eq(attendance.trainingId, id))
  return { training, attendance: rows }
}

/**
 * Zápasy s ID hráčů, kteří nastoupili. Dva dotazy místo joinu jsou tu
 * záměr: zápasů jsou desítky, ne tisíce, a tenhle tvar jde rovnou předat
 * `teamWinRate`/`playerWinRate` z `@/domain/stats`.
 */
export async function getMatchesWithAppearances() {
  const rows = await db.select().from(matches).orderBy(desc(matches.date))
  const appearances = await db.select().from(matchAppearances)
  return rows.map((match) => ({
    ...match,
    playerIds: appearances.filter((a) => a.matchId === match.id).map((a) => a.playerId),
  }))
}

export async function getMatchWithAppearances(id: number) {
  const [match] = await db.select().from(matches).where(eq(matches.id, id))
  if (!match) return null
  const rows = await db.select().from(matchAppearances).where(eq(matchAppearances.matchId, id))
  return { match, playerIds: rows.map((r) => r.playerId) }
}

/**
 * Počet hlav (hráč + jeho hosté) na trénink, pro seznam v `/admin/treninky`.
 * Tréninků i řádků docházky jsou desítky — sčítáme v JS místo GROUP BY.
 */
export async function getHeadCounts(): Promise<Map<number, number>> {
  const rows = await db.select({
    trainingId: attendance.trainingId,
    guests: attendance.guests,
  }).from(attendance)

  const counts = new Map<number, number>()
  for (const row of rows) {
    counts.set(row.trainingId, (counts.get(row.trainingId) ?? 0) + 1 + row.guests)
  }
  return counts
}

/**
 * Tréninky v období ve tvaru, který čeká `calculateSettlement` z domény.
 * Docházku načítáme celou a filtrujeme v JS ze stejného důvodu jako
 * `getHeadCounts` — objemy jsou malé a ušetří se druhý dotaz s IN().
 */
export async function loadTrainingInputs(
  periodStart: string,
  periodEnd: string,
): Promise<TrainingInput[]> {
  const rows = await db.select().from(trainings)
    .where(and(gte(trainings.date, periodStart), lte(trainings.date, periodEnd)))
  const all = await db.select().from(attendance)
  return rows.map((training) => ({
    id: training.id,
    priceCzk: training.priceCzk,
    status: training.status,
    attendance: all
      .filter((a) => a.trainingId === training.id)
      .map((a) => ({ playerId: a.playerId, guests: a.guests })),
  }))
}

export async function getSettlements() {
  return db.select().from(settlements).orderBy(desc(settlements.periodEnd))
}

export async function getSettlementDetail(id: number) {
  const [settlement] = await db.select().from(settlements).where(eq(settlements.id, id))
  if (!settlement) return null
  const items = await db.select().from(settlementItems)
    .where(eq(settlementItems.settlementId, id))
  return { settlement, items }
}
