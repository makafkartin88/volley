'use server'

import { requireAdmin } from '@/lib/auth'
import { parseAvlCrosstable, type AvlMatchRow } from '@/domain/avl'
import { z } from 'zod'

const OUR_TEAM_NAME = 'Smečaři bez hranic'

export type AvlFetchResult =
  | { status: 'ok'; matches: AvlMatchRow[] }
  | { status: 'not_found' } // stránka se načetla, ale tým v týhle lize nemá zápasy
  | { status: 'error'; message: string } // síťová chyba, špatný stavový kód apod.

export async function fetchAvlMatches(leagueId: string): Promise<AvlFetchResult> {
  await requireAdmin()
  const id = z.string().regex(/^\d+$/, 'ID ligy musí být číslo').parse(leagueId)

  let response: Response
  try {
    response = await fetch(
      `https://www.avlka.cz/init/action/asynTransfer/drawLeague/?league=${id}`,
      { signal: AbortSignal.timeout(10_000) },
    )
  } catch {
    return { status: 'error', message: 'Nepodařilo se spojit s avlka.cz. Zkus to znovu.' }
  }

  if (!response.ok) {
    return { status: 'error', message: `avlka.cz odpověděl chybou (${response.status}).` }
  }

  const html = await response.text()
  const matches = parseAvlCrosstable(html, OUR_TEAM_NAME)
  if (matches === null) {
    return { status: 'not_found' }
  }
  return { status: 'ok', matches }
}
