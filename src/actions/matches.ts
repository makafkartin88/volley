'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { matches, matchAppearances } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

const matchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  opponent: z.string().trim().min(1, 'Doplň soupeře').max(80),
  result: z.enum(['win', 'loss']),
  scoreText: z.string().trim().max(20).optional().or(z.literal('')),
})

export async function createMatch(formData: FormData) {
  await requireAdmin()
  const input = matchSchema.parse({
    date: formData.get('date'),
    opponent: formData.get('opponent'),
    result: formData.get('result'),
    scoreText: formData.get('scoreText') ?? '',
  })
  await db.insert(matches).values({ ...input, scoreText: input.scoreText || null })
  revalidatePath('/admin')
  revalidatePath('/zapasy')
}

export async function updateMatch(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  const input = matchSchema.parse({
    date: formData.get('date'),
    opponent: formData.get('opponent'),
    result: formData.get('result'),
    scoreText: formData.get('scoreText') ?? '',
  })
  await db.update(matches).set({ ...input, scoreText: input.scoreText || null })
    .where(eq(matches.id, id))
  revalidatePath('/admin')
  revalidatePath('/zapasy')
}

export async function deleteMatch(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  await db.delete(matches).where(eq(matches.id, id))
  revalidatePath('/admin')
  revalidatePath('/zapasy')
}

const appearancesSchema = z.array(z.number().int().positive())

/** Přepíše sestavu zápasu na přesně předaný seznam hráčů. */
export async function saveAppearances(matchId: number, playerIds: unknown) {
  await requireAdmin()
  const id = z.number().int().positive().parse(matchId)
  const parsed = appearancesSchema.parse(playerIds)

  await db.delete(matchAppearances).where(eq(matchAppearances.matchId, id))
  if (parsed.length > 0) {
    await db.insert(matchAppearances).values(parsed.map((playerId) => ({ matchId: id, playerId })))
  }
  revalidatePath('/admin')
  revalidatePath('/zapasy')
}
