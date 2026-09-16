import { describe, it, expect } from 'vitest'
import { calculateSettlement, type TrainingInput } from './settlement'

/** Zkratka: trénink, kde uvedení hráči byli bez hostů. */
function held(id: number, priceCzk: number, playerIds: number[]): TrainingInput {
  return {
    id, priceCzk, status: 'held',
    attendance: playerIds.map((playerId) => ({ playerId, guests: 0 })),
  }
}

function debtOf(result: ReturnType<typeof calculateSettlement>, playerId: number) {
  return result.debts.find((d) => d.playerId === playerId)?.amountCzk
}

describe('calculateSettlement', () => {
  it('rozdělí cenu rovným dílem mezi přítomné', () => {
    const result = calculateSettlement([held(1, 1200, [10, 20, 30])])
    expect(debtOf(result, 10)).toBe(400)
    expect(debtOf(result, 20)).toBe(400)
    expect(debtOf(result, 30)).toBe(400)
    expect(result.totalPriceCzk).toBe(1200)
    expect(result.totalChargedCzk).toBe(1200)
    expect(result.differenceCzk).toBe(0)
  })

  it('nezapočítá nepřítomného hráče', () => {
    const result = calculateSettlement([held(1, 1000, [10, 20])])
    expect(debtOf(result, 30)).toBeUndefined()
  })

  it('host zvyšuje dělitel, takže ostatním se cena sníží', () => {
    // 4 hlavy: hráč 10 + jeho host, hráč 20, hráč 30 -> 1200/4 = 300
    const result = calculateSettlement([{
      id: 1, priceCzk: 1200, status: 'held',
      attendance: [
        { playerId: 10, guests: 1 },
        { playerId: 20, guests: 0 },
        { playerId: 30, guests: 0 },
      ],
    }])
    expect(debtOf(result, 20)).toBe(300)
    expect(debtOf(result, 30)).toBe(300)
  })

  it('hráč platí za sebe i za své hosty', () => {
    const result = calculateSettlement([{
      id: 1, priceCzk: 1200, status: 'held',
      attendance: [
        { playerId: 10, guests: 2 },  // 3 hlavy
        { playerId: 20, guests: 0 },  // 1 hlava
      ],
    }])
    // 4 hlavy, 300 na hlavu
    expect(debtOf(result, 10)).toBe(900)
    expect(debtOf(result, 20)).toBe(300)
  })

  it('zrušený trénink ignoruje úplně', () => {
    const result = calculateSettlement([
      held(1, 1350, [10, 20]),
      { id: 2, priceCzk: 1350, status: 'cancelled', attendance: [{ playerId: 10, guests: 0 }] },
    ])
    expect(debtOf(result, 10)).toBe(675)
    expect(result.totalPriceCzk).toBe(1350)
  })

  it('proběhlý trénink bez docházky přeskočí a nahlásí ho', () => {
    const result = calculateSettlement([
      held(1, 1000, [10, 20]),
      { id: 2, priceCzk: 1350, status: 'held', attendance: [] },
    ])
    expect(result.skippedTrainingIds).toEqual([2])
    expect(result.totalPriceCzk).toBe(1000)
    expect(debtOf(result, 10)).toBe(500)
  })

  it('hráč přidaný uprostřed období platí jen za tréninky, kde byl', () => {
    const result = calculateSettlement([
      held(1, 1000, [10, 20]),
      held(2, 1000, [10, 20, 30]),
    ])
    expect(debtOf(result, 30)).toBe(333)
    expect(debtOf(result, 10)).toBe(833) // 500 + 333.33 = 833.33 -> 833
  })

  it('zaokrouhluje až na součtu za období, ne po trénincích', () => {
    // 1350/3 = 450 přesně; použij cenu, která se nedělí: 1000/3 = 333.333…
    const result = calculateSettlement([
      held(1, 1000, [10, 20, 30]),
      held(2, 1000, [10, 20, 30]),
      held(3, 1000, [10, 20, 30]),
    ])
    // přesně 1000 na hráče; zaokrouhlení po trénincích by dalo 999
    expect(debtOf(result, 10)).toBe(1000)
    expect(result.differenceCzk).toBe(0)
  })

  it('zaokrouhluje matematicky nahoru při přesné půlce', () => {
    const result = calculateSettlement([held(1, 1350, [10, 20, 30, 40])])
    // 1350/4 = 337.5 -> 338
    expect(debtOf(result, 10)).toBe(338)
    expect(result.totalChargedCzk).toBe(1352)
    expect(result.differenceCzk).toBe(2)
  })

  it('drift nepřekročí 1 Kč na hráče ani po osmi trénincích', () => {
    const trainings = Array.from({ length: 8 }, (_, i) => held(i + 1, 1350, [10, 20, 30]))
    const result = calculateSettlement(trainings)
    expect(Math.abs(result.differenceCzk)).toBeLessThanOrEqual(3)
    for (const debt of result.debts) {
      expect(Math.abs(debt.amountCzk - (1350 * 8) / 3)).toBeLessThanOrEqual(1)
    }
  })

  it('u prázdného období vrátí nulové součty', () => {
    const result = calculateSettlement([])
    expect(result.debts).toEqual([])
    expect(result.totalPriceCzk).toBe(0)
    expect(result.totalChargedCzk).toBe(0)
    expect(result.differenceCzk).toBe(0)
  })

  it('vrací dluhy seřazené podle playerId', () => {
    const result = calculateSettlement([held(1, 900, [30, 10, 20])])
    expect(result.debts.map((d) => d.playerId)).toEqual([10, 20, 30])
  })
})
