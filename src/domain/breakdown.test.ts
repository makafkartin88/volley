import { describe, it, expect } from 'vitest'
import { breakdownForPlayer, type ExpenseBreakdownInput, type TrainingBreakdownInput } from './breakdown'

function held(id: number, date: string, priceCzk: number, playerIds: number[]): TrainingBreakdownInput {
  return {
    id, date, priceCzk, status: 'held',
    attendance: playerIds.map((playerId) => ({ playerId, guests: 0 })),
  }
}

function expense(id: number, note: string, amountCzk: number, playerIds: number[]): ExpenseBreakdownInput {
  return { id, note, amountCzk, playerIds }
}

describe('breakdownForPlayer', () => {
  it('vrátí jednu položku za trénink, kde hráč byl', () => {
    const result = breakdownForPlayer(
      [held(1, '2026-09-06', 1200, [10, 20, 30])],
      [],
      10,
    )
    expect(result.trainings).toEqual([{ trainingId: 1, date: '2026-09-06', amountCzk: 400 }])
    expect(result.expenses).toEqual([])
  })

  it('vynechá trénink, kde hráč nebyl', () => {
    const result = breakdownForPlayer(
      [held(1, '2026-09-06', 1200, [20, 30])],
      [],
      10,
    )
    expect(result.trainings).toEqual([])
  })

  it('vynechá zrušený trénink', () => {
    const result = breakdownForPlayer(
      [{ id: 1, date: '2026-09-06', priceCzk: 1200, status: 'cancelled', attendance: [{ playerId: 10, guests: 0 }] }],
      [],
      10,
    )
    expect(result.trainings).toEqual([])
  })

  it('zahrne hostovaný podíl do částky tréninku', () => {
    const result = breakdownForPlayer(
      [{
        id: 1, date: '2026-09-06', priceCzk: 1200, status: 'held',
        attendance: [{ playerId: 10, guests: 1 }, { playerId: 20, guests: 0 }, { playerId: 30, guests: 0 }],
      }],
      [],
      10,
    )
    // 4 hlavy, 300 na hlavu, hráč 10 platí za sebe i hosta = 600
    expect(result.trainings).toEqual([{ trainingId: 1, date: '2026-09-06', amountCzk: 600 }])
  })

  it('řadí tréninky podle data', () => {
    const result = breakdownForPlayer(
      [
        held(2, '2026-09-13', 1000, [10, 20]),
        held(1, '2026-09-06', 1000, [10, 20]),
      ],
      [],
      10,
    )
    expect(result.trainings.map((t) => t.date)).toEqual(['2026-09-06', '2026-09-13'])
  })

  it('vrátí položku za výdaj, kde hráč byl mezi účastníky', () => {
    const result = breakdownForPlayer(
      [],
      [expense(1, 'Ples', 1000, [10, 20, 30, 40, 50])],
      10,
    )
    expect(result.expenses).toEqual([{ expenseId: 1, note: 'Ples', amountCzk: 200 }])
  })

  it('vynechá výdaj, kde hráč mezi účastníky není', () => {
    const result = breakdownForPlayer([], [expense(1, 'Ples', 1000, [20, 30])], 10)
    expect(result.expenses).toEqual([])
  })

  it('zaokrouhluje každou položku nahoru zvlášť, i když by se součet s celkovou částkou lišil o korunu', () => {
    // 1000/3 = 333.33 -> položka 334 Kč, i když by se ve výsledném součtu
    // za celé období použilo jiné zaokrouhlení.
    const result = breakdownForPlayer([held(1, '2026-09-06', 1000, [10, 20, 30])], [], 10)
    expect(result.trainings[0].amountCzk).toBe(334)
  })

  it('kombinuje tréninky i výdaje pro stejného hráče', () => {
    const result = breakdownForPlayer(
      [held(1, '2026-09-06', 1200, [10, 20, 30])],
      [expense(1, 'Ples', 300, [10, 20, 30])],
      10,
    )
    expect(result.trainings).toEqual([{ trainingId: 1, date: '2026-09-06', amountCzk: 400 }])
    expect(result.expenses).toEqual([{ expenseId: 1, note: 'Ples', amountCzk: 100 }])
  })

  it('u hráče bez jediné položky vrátí obě pole prázdná', () => {
    const result = breakdownForPlayer([held(1, '2026-09-06', 1200, [20, 30])], [], 10)
    expect(result).toEqual({ trainings: [], expenses: [] })
  })
})
