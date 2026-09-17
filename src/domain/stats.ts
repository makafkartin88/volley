export type MatchInput = {
  id: number
  result: 'win' | 'loss'
  playerIds: number[]
}

export type WinRate = {
  wins: number
  losses: number
  played: number
  /** Podíl výher 0–1, nebo null když se neodehrál žádný zápas. */
  rate: number | null
}

function summarize(results: ('win' | 'loss')[]): WinRate {
  const wins = results.filter((r) => r === 'win').length
  const played = results.length
  return {
    wins,
    losses: played - wins,
    played,
    rate: played === 0 ? null : wins / played,
  }
}

export function teamWinRate(matches: MatchInput[]): WinRate {
  return summarize(matches.map((m) => m.result))
}

export function playerWinRate(matches: MatchInput[], playerId: number): WinRate {
  return summarize(
    matches.filter((m) => m.playerIds.includes(playerId)).map((m) => m.result)
  )
}
