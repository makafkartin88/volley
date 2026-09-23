import type { ExpenseInput, TrainingInput } from './settlement'

/** `TrainingInput` navíc s datem — pro rozpis potřebuje datum, `calculateSettlement` ne. */
export type TrainingBreakdownInput = TrainingInput & { date: string }

/** `ExpenseInput` navíc s poznámkou — pro rozpis potřebuje popisek, `calculateSettlement` ne. */
export type ExpenseBreakdownInput = ExpenseInput & { note: string }

export type TrainingBreakdownRow = { trainingId: number; date: string; amountCzk: number }
export type ExpenseBreakdownRow = { expenseId: number; note: string; amountCzk: number }

export type PlayerBreakdown = {
  trainings: TrainingBreakdownRow[]
  expenses: ExpenseBreakdownRow[]
}

/**
 * Rozpis, za co konkrétní hráč v období platí — tréninky zvlášť a
 * mimořádné výdaje zvlášť, každá položka zaokrouhlená nahoru stejně
 * jako `calculateSettlement`.
 *
 * Součet položek nemusí padnout přesně na částku z `calculateSettlement`
 * o korunu či dvě — tam se zaokrouhluje jednou za celý součet, tady se
 * zaokrouhluje každá položka zvlášť, aby dávala smysl sama o sobě
 * v rozpisu. Rozpis je pro přehled, ne pro předpis částky k platbě.
 */
export function breakdownForPlayer(
  trainings: TrainingBreakdownInput[],
  expenses: ExpenseBreakdownInput[],
  playerId: number,
): PlayerBreakdown {
  const trainingRows: TrainingBreakdownRow[] = []

  for (const training of trainings) {
    if (training.status !== 'held') continue
    const entry = training.attendance.find((a) => a.playerId === playerId)
    if (!entry) continue

    const heads = training.attendance.reduce((sum, e) => sum + 1 + e.guests, 0)
    if (heads === 0) continue

    const perHead = training.priceCzk / heads
    const share = perHead * (1 + entry.guests)
    trainingRows.push({ trainingId: training.id, date: training.date, amountCzk: Math.ceil(share) })
  }

  const expenseRows: ExpenseBreakdownRow[] = []

  for (const expense of expenses) {
    if (expense.playerIds.length === 0) continue
    if (!expense.playerIds.includes(playerId)) continue

    const perHead = expense.amountCzk / expense.playerIds.length
    expenseRows.push({ expenseId: expense.id, note: expense.note, amountCzk: Math.ceil(perHead) })
  }

  return {
    trainings: trainingRows.sort((a, b) => a.date.localeCompare(b.date)),
    expenses: expenseRows,
  }
}
