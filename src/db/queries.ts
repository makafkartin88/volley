import { desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { players, trainings, attendance } from '@/db/schema'

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
