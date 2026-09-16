export type AttendanceEntry = { playerId: number; guests: number }

export type TrainingInput = {
  id: number
  priceCzk: number
  status: 'held' | 'cancelled'
  attendance: AttendanceEntry[]
}

export type PlayerDebt = { playerId: number; amountCzk: number }

export type SettlementResult = {
  debts: PlayerDebt[]
  totalPriceCzk: number
  totalChargedCzk: number
  differenceCzk: number
  skippedTrainingIds: number[]
}

/**
 * Rozpočítá cenu hal mezi přítomné hráče.
 *
 * Podíly se drží jako přesná desetinná čísla a zaokrouhlují se až na součtu
 * za celé období — zaokrouhlování po jednotlivých trénincích by při osmi
 * trénincích uteklo o jednotky korun.
 */
export function calculateSettlement(trainings: TrainingInput[]): SettlementResult {
  const exactShares = new Map<number, number>()
  const skippedTrainingIds: number[] = []
  let totalPriceCzk = 0

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

  const debts: PlayerDebt[] = [...exactShares.entries()]
    .map(([playerId, exact]) => ({ playerId, amountCzk: Math.round(exact) }))
    .sort((a, b) => a.playerId - b.playerId)

  const totalChargedCzk = debts.reduce((sum, debt) => sum + debt.amountCzk, 0)

  return {
    debts,
    totalPriceCzk,
    totalChargedCzk,
    differenceCzk: totalChargedCzk - totalPriceCzk,
    skippedTrainingIds,
  }
}
