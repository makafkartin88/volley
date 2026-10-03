'use server'

import { and, eq, gte, isNotNull, lte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { trainings, attendance, settlements } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

const priceSchema = z.coerce.number().int().positive().max(100000)

function revalidateTrainings() {
  revalidatePath('/admin')
  revalidatePath('/treninky')
  revalidatePath('/')
}

/** Vrací ID tréninku — když na to datum už existuje, ten stávající. */
export async function createTraining(formData: FormData): Promise<number> {
  await requireAdmin()
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(formData.get('date'))
  const priceCzk = priceSchema.parse(formData.get('priceCzk') || 1350)
  const [created] = await db.insert(trainings).values({ date, priceCzk })
    .onConflictDoNothing().returning({ id: trainings.id })
  revalidateTrainings()
  if (created) return created.id
  const [existing] = await db.select({ id: trainings.id }).from(trainings)
    .where(eq(trainings.date, date))
  return existing.id
}

export async function updateTrainingPrice(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  const priceCzk = priceSchema.parse(formData.get('priceCzk'))
  const [training] = await db.select().from(trainings).where(eq(trainings.id, id))
  if (!training) throw new Error('Trénink neexistuje.')
  // Uzavřené vyúčtování má částky zmrazené — změna ceny by se v nich neprojevila.
  const [locked] = await db.select({ id: settlements.id }).from(settlements).where(and(
    isNotNull(settlements.closedAt),
    lte(settlements.periodStart, training.date),
    gte(settlements.periodEnd, training.date),
  ))
  if (locked) throw new Error('Trénink patří do uzavřeného vyúčtování.')
  await db.update(trainings).set({ priceCzk }).where(eq(trainings.id, id))
  revalidateTrainings()
}

export async function setTrainingStatus(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  const status = z.enum(['held', 'cancelled']).parse(formData.get('status'))
  await db.update(trainings).set({ status }).where(eq(trainings.id, id))
  revalidateTrainings()
}

const entriesSchema = z.array(z.object({
  playerId: z.number().int().positive(),
  guests: z.number().int().min(0).max(10),
}))

/** Přepíše docházku tréninku na přesně předaný seznam. */
export async function saveAttendance(trainingId: number, entries: unknown) {
  await requireAdmin()
  const id = z.number().int().positive().parse(trainingId)
  const parsed = entriesSchema.parse(entries)

  await db.delete(attendance).where(eq(attendance.trainingId, id))
  if (parsed.length > 0) {
    await db.insert(attendance).values(
      parsed.map((e) => ({ trainingId: id, playerId: e.playerId, guests: e.guests }))
    )
  }
  revalidateTrainings()
}
