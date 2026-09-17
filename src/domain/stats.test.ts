import { describe, it, expect } from 'vitest'
import { teamWinRate, playerWinRate, type MatchInput } from './stats'

const matches: MatchInput[] = [
  { id: 1, result: 'win', playerIds: [10, 20] },
  { id: 2, result: 'loss', playerIds: [10, 30] },
  { id: 3, result: 'win', playerIds: [20, 30] },
  { id: 4, result: 'win', playerIds: [10, 20, 30] },
]

describe('teamWinRate', () => {
  it('spočítá poměr výher ze všech zápasů', () => {
    expect(teamWinRate(matches)).toEqual({ wins: 3, losses: 1, played: 4, rate: 0.75 })
  })

  it('bez zápasů vrátí rate null', () => {
    expect(teamWinRate([])).toEqual({ wins: 0, losses: 0, played: 0, rate: null })
  })
})

describe('playerWinRate', () => {
  it('počítá jen zápasy, kde hráč nastoupil', () => {
    // hráč 10: zápasy 1 (W), 2 (L), 4 (W)
    expect(playerWinRate(matches, 10)).toEqual({ wins: 2, losses: 1, played: 3, rate: 2 / 3 })
  })

  it('hráč se stoprocentní úspěšností', () => {
    // hráč 20: zápasy 1, 3, 4 — všechny výhry
    expect(playerWinRate(matches, 20)).toEqual({ wins: 3, losses: 0, played: 3, rate: 1 })
  })

  it('hráč bez odehraného zápasu má rate null', () => {
    expect(playerWinRate(matches, 99)).toEqual({ wins: 0, losses: 0, played: 0, rate: null })
  })
})
