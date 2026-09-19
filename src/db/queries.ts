import {
  and, desc, eq, gte, isNotNull, isNull, lte,
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

/**
 * Tréninky s docházkou a počtem hlav pro veřejný přehled (`/` a `/treninky`).
 * Stejná dvoudotazová logika jako `getHeadCounts` — objemy jsou malé.
 */
export async function getTrainingsWithAttendance() {
  const rows = await db.select().from(trainings).orderBy(desc(trainings.date))
  const all = await db.select().from(attendance)
  return rows.map((training) => ({
    ...training,
    attendance: all.filter((a) => a.trainingId === training.id),
    heads: all
      .filter((a) => a.trainingId === training.id)
      .reduce((sum, a) => sum + 1 + a.guests, 0),
  }))
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

/** Jeden hráč podle id, nebo `null` když takový není. Pro `/hraci/[id]`. */
export async function getPlayerById(id: number) {
  const [player] = await db.select().from(players).where(eq(players.id, id))
  return player ?? null
}

/**
 * Všechna vyúčtování i s položkami, od nejnovějšího období. Dva dotazy a
 * spojení v JS jako jinde — vyúčtování jsou jednotky, hráčů desítky.
 */
export async function getSettlementsWithItems() {
  const rows = await db.select().from(settlements).orderBy(desc(settlements.periodEnd))
  const items = await db.select().from(settlementItems)
  return rows.map((settlement) => ({
    settlement,
    items: items.filter((item) => item.settlementId === settlement.id),
  }))
}

export async function getSettlementDetail(id: number) {
  const [settlement] = await db.select().from(settlements).where(eq(settlements.id, id))
  if (!settlement) return null
  const items = await db.select().from(settlementItems)
    .where(eq(settlementItems.settlementId, id))
  return { settlement, items }
}

/**
 * Nejnověji uzavřené vyúčtování s položkami, pro kartu „Nezaplaceno“ na `/`.
 * Otevřené (koncept) vyúčtování se pro tuhle kartu nepočítá — dokud není
 * uzavřené, dluhy ještě nejsou finální.
 */
export async function getLatestClosedSettlement() {
  const rows = await db.select().from(settlements)
    .where(isNotNull(settlements.closedAt))
    .orderBy(desc(settlements.closedAt))
    .limit(1)
  const [settlement] = rows
  if (!settlement) return null
  const items = await db.select().from(settlementItems)
    .where(eq(settlementItems.settlementId, settlement.id))
  return { settlement, items }
}
