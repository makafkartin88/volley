import { eq } from 'drizzle-orm'
import { calculateSettlement } from '../domain/settlement'
import { loadTrainingInputs } from './queries'
import { db } from './index'
import {
  attendance, matchAppearances, matches, players, settlementItems, settlements, trainings,
} from './schema'
import {
  DEMO_CANCELLED, DEMO_MATCHES, DEMO_NOTE, DEMO_RATES, DEMO_SETTLEMENT_LABELS,
  DEMO_SUNDAYS, seededUnit,
} from './demo-data'

const PERIODS = [
  { label: DEMO_SETTLEMENT_LABELS[0], start: '2026-06-01', end: '2026-07-31', allPaid: true },
  { label: DEMO_SETTLEMENT_LABELS[1], start: '2026-08-01', end: '2026-09-14', allPaid: false },
]

async function main() {
  const roster = await db.select().from(players)
  if (roster.length === 0) {
    throw new Error('Nejdřív spusť `npm run db:seed` — v databázi nejsou žádní hráči.')
  }

  // ---- tréninky ----
  const createdTrainings: { id: number; date: string }[] = []
  for (const date of DEMO_SUNDAYS) {
    const existing = await db.select().from(trainings).where(eq(trainings.date, date))
    if (existing.length > 0) {
      console.log(`  trénink ${date} už existuje, přeskakuji`)
      continue
    }
    const [row] = await db.insert(trainings).values({
      date,
      status: date === DEMO_CANCELLED ? 'cancelled' : 'held',
      note: DEMO_NOTE,
    }).returning()
    createdTrainings.push({ id: row.id, date })
  }

  // ---- docházka ----
  let attendanceRows = 0
  for (const training of createdTrainings) {
    if (training.date === DEMO_CANCELLED) continue

    const present = roster.filter(
      (p) => seededUnit(`${p.name}|${training.date}`) < (DEMO_RATES[p.name] ?? 0.35)
    )
    if (present.length === 0) continue

    await db.insert(attendance).values(present.map((p) => ({
      trainingId: training.id,
      playerId: p.id,
      // Host se objeví zřídka, ať to v historii není šum.
      guests: seededUnit(`host|${p.name}|${training.date}`) < 0.05 ? 1 : 0,
    })))
    attendanceRows += present.length
  }

  // ---- zápasy ----
  let createdMatches = 0
  for (const m of DEMO_MATCHES) {
    const [row] = await db.insert(matches).values({ ...m, note: DEMO_NOTE }).returning()
    // Na zápas jede šestka až osmička z těch, co nejvíc chodí.
    const lineup = roster
      .filter((p) => seededUnit(`zapas|${p.name}|${m.date}`) < (DEMO_RATES[p.name] ?? 0.35))
      .slice(0, 8)
    if (lineup.length > 0) {
      await db.insert(matchAppearances).values(
        lineup.map((p) => ({ matchId: row.id, playerId: p.id }))
      )
    }
    createdMatches += 1
  }

  // ---- vyúčtování ----
  for (const period of PERIODS) {
    const existing = await db.select().from(settlements).where(eq(settlements.label, period.label))
    if (existing.length > 0) {
      console.log(`  vyúčtování „${period.label}“ už existuje, přeskakuji`)
      continue
    }

    const [settlement] = await db.insert(settlements).values({
      label: period.label,
      periodStart: period.start,
      periodEnd: period.end,
      closedAt: new Date(),
    }).returning()

    // Stejná cesta, jakou používá closeSettlement — žádná vlastní matematika.
    const result = calculateSettlement(await loadTrainingInputs(period.start, period.end))
    if (result.debts.length === 0) continue

    await db.insert(settlementItems).values(result.debts.map((debt) => {
      const paid = period.allPaid
        || seededUnit(`platba|${debt.playerId}|${period.label}`) < 0.7
      return {
        settlementId: settlement.id,
        playerId: debt.playerId,
        amountCzk: debt.amountCzk,
        paid,
        paidAt: paid ? new Date() : null,
      }
    }))

    console.log(
      `  „${period.label}“: ${result.debts.length} hráčů, ` +
      `${result.totalPriceCzk} Kč za haly, rozdíl ${result.differenceCzk} Kč`
    )
  }

  console.log(
    `\nHotovo: ${createdTrainings.length} tréninků, ${attendanceRows} záznamů docházky, ` +
    `${createdMatches} zápasů, ${PERIODS.length} vyúčtování.`
  )
  console.log('Smazat je můžeš příkazem `npm run db:demo:clear`.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
