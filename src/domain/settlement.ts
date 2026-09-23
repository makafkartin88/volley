export type AttendanceEntry = { playerId: number; guests: number }

export type TrainingInput = {
  id: number
  priceCzk: number
  status: 'held' | 'cancelled'
  attendance: AttendanceEntry[]
}

export type PlayerDebt = { playerId: number; amountCzk: number }

/** Mimořádný výdaj (např. ples), rozpočítaný rovným dílem mezi `playerIds`. */
export type ExpenseInput = {
  id: number
  amountCzk: number
  playerIds: number[]
}

export type SettlementResult = {
  debts: PlayerDebt[]
  totalPriceCzk: number
  totalExpensesCzk: number
  totalChargedCzk: number
  differenceCzk: number
  skippedTrainingIds: number[]
  /** Mimořádné výdaje bez jediného účastníka — nedají se rozpočítat, na nic se nepřičetly. */
  skippedExpenseIds: number[]
}

/**
 * Rozpočítá cenu hal a mimořádné výdaje mezi hráče.
 *
 * Obojí sčítá do stejné mapy přesných (nezaokrouhlených) podílů na hráče
 * a zaokrouhluje se až na úplném konci, po součtu za celé období —
 * zaokrouhlování zvlášť pro tréninky a zvlášť pro výdaje by mohlo uteknout
 * o korunu jinam, než kam se zaokrouhlí součet obojího najednou.
 *
 * Vždy nahoru (`Math.ceil`), nikdy na nejbližší celé číslo — na hale se
 * platí přesně tolik, kolik stojí, takže se nikdy nesmí vybrat míň.
 */
export function calculateSettlement(
  trainings: TrainingInput[],
  expenses: ExpenseInput[] = [],
): SettlementResult {
  const exactShares = new Map<number, number>()
  const skippedTrainingIds: number[] = []
  const skippedExpenseIds: number[] = []
  let totalPriceCzk = 0
  let totalExpensesCzk = 0

  for (const training of trainings) {
    if (training.status !== 'held') continue

    const heads = training.attendance.reduce((sum, entry) => sum + 1 + entry.guests, 0)
    if (heads === 0) {
      skippedTrainingIds.push(training.id)
      continue
    }

    totalPriceCzk += training.priceCzk
    const perHead = training.priceCzk / heads

    for (const entry of training.attendance) {
      const share = perHead * (1 + entry.guests)
      exactShares.set(entry.playerId, (exactShares.get(entry.playerId) ?? 0) + share)
    }
  }

  for (const expense of expenses) {
    if (expense.playerIds.length === 0) {
      skippedExpenseIds.push(expense.id)
      continue
    }

    totalExpensesCzk += expense.amountCzk
    const perHead = expense.amountCzk / expense.playerIds.length

    for (const playerId of expense.playerIds) {
      exactShares.set(playerId, (exactShares.get(playerId) ?? 0) + perHead)
    }
  }

  const debts: PlayerDebt[] = [...exactShares.entries()]
    .map(([playerId, exact]) => ({ playerId, amountCzk: Math.ceil(exact) }))
    .sort((a, b) => a.playerId - b.playerId)

  const totalChargedCzk = debts.reduce((sum, debt) => sum + debt.amountCzk, 0)

  return {
    debts,
    totalPriceCzk,
    totalExpensesCzk,
    totalChargedCzk,
    differenceCzk: totalChargedCzk - totalPriceCzk - totalExpensesCzk,
    skippedTrainingIds,
    skippedExpenseIds,
  }
}
