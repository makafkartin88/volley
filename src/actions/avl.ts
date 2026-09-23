'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { avlConfig, avlSuggestions } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { parseAvlCrosstable, OUR_TEAM_NAME, type AvlMatchRow } from '@/domain/avl'
import { createMatch } from '@/actions/matches'
import { z } from 'zod'

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

/** Uloží ID aktuální ligy (týdenní kontrola z `/api/avl-check` ho pak čte). */
export async function setAvlLeagueId(formData: FormData) {
  await requireAdmin()
  const raw = formData.get('leagueId')
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  const leagueId = trimmed === ''
    ? null
    : z.string().regex(/^\d+$/, 'ID ligy musí být číslo').parse(trimmed)

  await db
    .insert(avlConfig)
    .values({ id: 1, leagueId, updatedAt: new Date() })
    .onConflictDoUpdate({ target: avlConfig.id, set: { leagueId, updatedAt: new Date() } })
  revalidatePath('/admin/zapasy')
}

/** Potvrzení návrhu z týdenní kontroly — založí skutečný zápas a návrh smaže. */
export async function confirmAvlSuggestion(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))

  const [suggestion] = await db.select().from(avlSuggestions).where(eq(avlSuggestions.id, id))
  if (!suggestion) return

  const matchFormData = new FormData()
  matchFormData.set('date', suggestion.date)
  matchFormData.set('opponent', suggestion.opponent)
  matchFormData.set('result', suggestion.result)
  matchFormData.set('scoreText', suggestion.scoreText)
  await createMatch(matchFormData)

  await db.delete(avlSuggestions).where(eq(avlSuggestions.id, id))
  revalidatePath('/admin/zapasy')
}

/** Zamítnutí návrhu (např. omyl nebo duplicita) — jen smaže, nic nezakládá. */
export async function dismissAvlSuggestion(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  await db.delete(avlSuggestions).where(eq(avlSuggestions.id, id))
  revalidatePath('/admin/zapasy')
}
