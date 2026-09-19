'use server'

import { and, eq, gte, lte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { settlements, settlementItems } from '@/db/schema'
import { loadTrainingInputs } from '@/db/queries'
import { calculateSettlement } from '@/domain/settlement'
import { requireAdmin } from '@/lib/auth'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export async function createSettlement(formData: FormData) {
  await requireAdmin()
  const label = z.string().trim().min(1, 'Doplň název období').max(60)
    .parse(formData.get('label'))
  const periodStart = isoDate.parse(formData.get('periodStart'))
  const periodEnd = isoDate.parse(formData.get('periodEnd'))
  if (periodEnd < periodStart) {
    throw new Error('Konec období nemůže být před začátkem.')
  }

  // Překrývající se období by dvakrát vyúčtovalo stejné tréninky se dvěma
  // reálnými QR kódy — standardní kontrola překryvu intervalů.
  const [overlapping] = await db.select().from(settlements)
    .where(and(lte(settlements.periodStart, periodEnd), gte(settlements.periodEnd, periodStart)))
  if (overlapping) {
    throw new Error(`Období se překrývá s existujícím vyúčtováním "${overlapping.label}".`)
  }

  await db.insert(settlements).values({ label, periodStart, periodEnd })
  revalidatePath('/admin/vyuctovani')
}

/**
 * Zmrazí spočítané částky do settlement_items.
 *
 * Všechna finanční logika žije v `calculateSettlement` (Task 4, otestováno) —
 * tahle akce jen načte vstupy a přepíše `result.debts` beze změny do DB.
 * Žádná aritmetika s částkami tu záměrně není.
 */
export async function closeSettlement(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))

  const [settlement] = await db.select().from(settlements).where(eq(settlements.id, id))
  if (!settlement) throw new Error('Vyúčtování neexistuje.')
  if (settlement.closedAt) throw new Error('Tohle období je už uzavřené.')

  const inputs = await loadTrainingInputs(settlement.periodStart, settlement.periodEnd)
  const result = calculateSettlement(inputs)

  // Neon HTTP driver nepodporuje vícepříkazové transakce (`neon-http`
  // session vždy vyhodí "No transactions support"), takže insert a update
  // nejde spojit do jedné transakce. Místo toho je insert bezpečný pro
  // opakování: `onConflictDoNothing` na (settlementId, playerId) zaručí, že
  // když update selže a akce se zopakuje, druhý insert nespadne na unique
  // constraintu a uzavření pak projde.
  if (result.debts.length > 0) {
    await db.insert(settlementItems).values(
      result.debts.map((debt) => ({
        settlementId: id, playerId: debt.playerId, amountCzk: debt.amountCzk,
      }))
    ).onConflictDoNothing()
  }
  await db.update(settlements).set({ closedAt: new Date() }).where(eq(settlements.id, id))

  revalidatePath('/admin/vyuctovani')
  revalidatePath(`/admin/vyuctovani/${id}`)
  revalidatePath('/platby')
}

/** Zruší uzavření a zahodí zmrazené částky (i příznaky zaplaceno), aby šlo přepočítat. */
export async function reopenSettlement(formData: FormData) {
  await requireAdmin()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  await db.delete(settlementItems).where(eq(settlementItems.settlementId, id))
  await db.update(settlements).set({ closedAt: null }).where(eq(settlements.id, id))
  revalidatePath('/admin/vyuctovani')
  revalidatePath(`/admin/vyuctovani/${id}`)
  revalidatePath('/platby')
}

export async function togglePaid(formData: FormData) {
  await requireAdmin()
  const itemId = z.coerce.number().int().positive().parse(formData.get('itemId'))
  const settlementId = z.coerce.number().int().positive().parse(formData.get('settlementId'))
  const paid = formData.get('paid') === 'true'
  await db.update(settlementItems)
    .set({ paid, paidAt: paid ? new Date() : null })
    .where(and(eq(settlementItems.id, itemId), eq(settlementItems.settlementId, settlementId)))
  revalidatePath('/admin/vyuctovani')
  revalidatePath(`/admin/vyuctovani/${settlementId}`)
  revalidatePath('/platby')
}
