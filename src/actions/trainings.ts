'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { trainings, attendance } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

export async function createTraining(formData: FormData) {
  await requireAdmin()
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(formData.get('date'))
  const priceCzk = z.coerce.number().int().positive().max(100000)
    .parse(formData.get('priceCzk') || 1350)
  await db.insert(trainings).values({ date, priceCzk })
  revalidatePath('/admin/treninky')
}

export async function setTrainingStatus(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  const status = z.enum(['held', 'cancelled']).parse(formData.get('status'))
  await db.update(trainings).set({ status }).where(eq(trainings.id, id))
  revalidatePath('/admin/treninky')
  revalidatePath(`/admin/treninky/${id}`)
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
  revalidatePath(`/admin/treninky/${id}`)
  revalidatePath('/treninky')
  revalidatePath('/')
}
