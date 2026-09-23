import { eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { matches, avlSuggestions } from '@/db/schema'
import { getAvlLeagueId } from '@/db/queries'
import { OUR_TEAM_NAME } from '@/domain/avl'
import { parseAvlTournamentList, parseAvlTournamentMatches } from '@/domain/avl-tournament'

/**
 * Týdenní kontrola avlka.cz (spouští ji Vercel Cron, viz `vercel.json`).
 * Jen doplňuje `avl_suggestions` k ručnímu schválení — nikdy sama nezakládá
 * skutečný zápas. Autentizace je server-to-server přes `CRON_SECRET`
 * hlavičku, ne cookie session — `requireAdmin()` sem nepatří.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const leagueId = await getAvlLeagueId()
  if (!leagueId) {
    console.log('[avl-check] Žádná liga nastavená, přeskakuji.')
    return Response.json({ checked: 0, newSuggestions: 0 })
  }

  let leagueHtml: string
  try {
    const response = await fetch(
      `https://www.avlka.cz/init/action/asynTransfer/drawLeague/?league=${leagueId}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!response.ok) {
      console.error(`[avl-check] Stránka ligy odpověděla chybou ${response.status}.`)
      return Response.json({ checked: 0, newSuggestions: 0 })
    }
    leagueHtml = await response.text()
  } catch (err) {
    console.error('[avl-check] Nepodařilo se načíst stránku ligy.', err)
    return Response.json({ checked: 0, newSuggestions: 0 })
  }

  const tournaments = parseAvlTournamentList(leagueHtml)

  let checked = 0
  let newSuggestions = 0

  for (const tournament of tournaments) {
    let tournamentHtml: string
    try {
      const response = await fetch(
        `https://www.avlka.cz/init/pages/tournament/${tournament.tournamentId}/`,
        { signal: AbortSignal.timeout(10_000) },
      )
      if (!response.ok) {
        console.error(
          `[avl-check] Turnaj ${tournament.tournamentId} odpověděl chybou ${response.status}.`,
        )
        continue
      }
      tournamentHtml = await response.text()
    } catch (err) {
      console.error(`[avl-check] Nepodařilo se načíst turnaj ${tournament.tournamentId}.`, err)
      continue
    }

    checked += 1
    const foundMatches = parseAvlTournamentMatches(tournamentHtml, OUR_TEAM_NAME)

    for (const match of foundMatches) {
      const [existing] = await db.select().from(matches).where(
        and(eq(matches.date, tournament.date), eq(matches.opponent, match.opponent)),
      )
      if (existing) continue

      const inserted = await db
        .insert(avlSuggestions)
        .values({
          date: tournament.date,
          opponent: match.opponent,
          result: match.result,
          scoreText: match.scoreText,
        })
        .onConflictDoNothing()
        .returning({ id: avlSuggestions.id })

      if (inserted.length > 0) {
        newSuggestions += 1
      }
    }
  }

  console.log(`[avl-check] Zkontrolováno ${checked} turnajů, ${newSuggestions} nových návrhů.`)
  return Response.json({ checked, newSuggestions })
}
