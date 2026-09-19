import 'dotenv/config'
import { db } from './index'
import { players } from './schema'

/**
 * Kádr podle WhatsApp skupiny (stav k 14. 9. 2026).
 * Není to soupiska — kdo nechodí na tréninky, archivuje se v sekci Hráči.
 */
const ROSTER = [
  'Anetka Bouberlová',
  'Daniel Petrtýl',
  'Eda Mlej',
  'Filip Kožený',
  'Jakub Kuchar',
  'Jan Hrabák',
  'Johana Kolářová',
  'Klára Kalinová',
  'Kohi',
  'Lenka',
  'Lucie Boušová',
  'Matej Kolak',
  'Naty Houzvickova',
  'Nicole Přibylová',
  'Nynča',
  'Petr Šindílek',
  'Šárka Beková',
  'Tomáš Blodek',
  'Tomáš Loužecký',
  'Václav Pesl',
  'Viola',
  'Vojtěch Šašek',
  'ORGANIZÁTOR — přejmenuj mě',
]

async function seed() {
  const existing = await db.select({ name: players.name }).from(players)
  const known = new Set(existing.map((p) => p.name))
  const missing = ROSTER.filter((name) => !known.has(name))

  if (missing.length === 0) {
    console.log('Všichni hráči už v databázi jsou, nepřidávám nic.')
    return
  }

  await db.insert(players).values(missing.map((name) => ({ name })))
  console.log(`Přidáno ${missing.length} hráčů:`)
  for (const name of missing) console.log(`  ${name}`)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
