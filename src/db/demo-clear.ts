import { eq, inArray } from 'drizzle-orm'
import { db } from './index'
import { matches, settlements, trainings } from './schema'
import { DEMO_NOTE, DEMO_SETTLEMENT_LABELS } from './demo-data'

/**
 * Smaže jen to, co založil `npm run db:demo`. Docházka, sestavy a položky
 * vyúčtování odejdou s nimi díky ON DELETE CASCADE ve schématu.
 */
async function main() {
  const demoTrainings = await db.delete(trainings)
    .where(eq(trainings.note, DEMO_NOTE))
    .returning({ date: trainings.date })

  const demoMatches = await db.delete(matches)
    .where(eq(matches.note, DEMO_NOTE))
    .returning({ date: matches.date })

  const demoSettlements = await db.delete(settlements)
    .where(inArray(settlements.label, DEMO_SETTLEMENT_LABELS))
    .returning({ label: settlements.label })

  console.log(`Smazáno ${demoTrainings.length} tréninků (i s docházkou).`)
  console.log(`Smazáno ${demoMatches.length} zápasů (i se sestavami).`)
  console.log(`Smazáno ${demoSettlements.length} vyúčtování (i s platbami).`)

  if (demoTrainings.length + demoMatches.length + demoSettlements.length === 0) {
    console.log('Žádná ukázková data v databázi nebyla.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
