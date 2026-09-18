'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { players } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

const nameSchema = z.string().trim().min(1, 'Jméno nesmí být prázdné').max(60)
const contactSchema = z.string().trim().max(100).optional().or(z.literal(''))

export async function createPlayer(formData: FormData) {
  await requireAdmin()
  const name = nameSchema.parse(formData.get('name'))
  const contact = contactSchema.parse(formData.get('contact') ?? '')
  await db.insert(players).values({ name, contact: contact || null })
  revalidatePath('/admin/hraci')
}

export async function updatePlayer(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  const name = nameSchema.parse(formData.get('name'))
  const contact = contactSchema.parse(formData.get('contact') ?? '')
  await db.update(players).set({ name, contact: contact || null }).where(eq(players.id, id))
  revalidatePath('/admin/hraci')
}

export async function archivePlayer(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  await db.update(players).set({ archivedAt: new Date() }).where(eq(players.id, id))
  revalidatePath('/admin/hraci')
}

export async function restorePlayer(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  await db.update(players).set({ archivedAt: null }).where(eq(players.id, id))
  revalidatePath('/admin/hraci')
}
