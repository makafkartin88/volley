import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db'
import { settlements, trainings } from '@/db/schema'
import { monthRange, nextSundayIso, todayIso, weekdayOf } from '@/lib/format'

/**
 * Denní kontrola (spouští ji Vercel Cron, viz `vercel.json`), která sama
 * zakládá, co by organizátor stejně musel založit ručně:
 *
 * - v pondělí ráno další nedělní trénink (`nextSundayIso`),
 * - prvního v měsíci vyúčtování na celý ten měsíc.
 *
 * Obojí je idempotentní — opakované spuštění stejný den nic nezdvojí.
 * Autentizace je přes `CRON_SECRET` hlavičku, ne cookie session —
 * `requireAdmin()` sem nepatří, běží to bez přihlášeného organizátora.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = todayIso()
  const result = { trainingCreated: false, settlementCreated: false }

  // Pondělí = 1 (0 je neděle).
  if (weekdayOf(today) === 1) {
    const date = nextSundayIso()
    const [existing] = await db.select().from(trainings).where(eq(trainings.date, date))
    if (!existing) {
      await db.insert(trainings).values({ date })
      result.trainingCreated = true
    }
  }

  // První den měsíce.
  if (today.slice(8, 10) === '01') {
    const { start, end, label } = monthRange(today)
    const [overlapping] = await db.select().from(settlements)
      .where(and(lte(settlements.periodStart, end), gte(settlements.periodEnd, start)))
    if (!overlapping) {
      await db.insert(settlements).values({ label, periodStart: start, periodEnd: end })
      result.settlementCreated = true
    }
  }

  console.log(`[auto-create] ${today}:`, result)
  return Response.json(result)
}
