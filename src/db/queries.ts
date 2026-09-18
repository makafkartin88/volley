import { isNull } from 'drizzle-orm'
import { db } from '@/db'
import { players } from '@/db/schema'

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
