import Link from 'next/link'
import { createTraining, setTrainingStatus } from '@/actions/trainings'
import { getHeadCounts, getTrainings } from '@/db/queries'
import { PageHeader } from '@/components/PageHeader'
import { formatDate, nextSundayIso } from '@/lib/format'

// Předvyplněné datum se počítá z aktuálního času, ne z času buildu.
export const dynamic = 'force-dynamic'

const statusLabel: Record<'held' | 'cancelled', string> = {
  held: 'Proběhl',
  cancelled: 'Zrušen',
}

export default async function TreninkyPage() {
  const [trainings, headCounts] = await Promise.all([getTrainings(), getHeadCounts()])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Tréninky" subtitle="Založ trénink a naklikej docházku." />

      <form action={createTraining} className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Datum</span>
            <input
              type="date"
              name="date"
              required
              defaultValue={nextSundayIso()}
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk"
            />
          </label>
          <label className="sm:w-40">
            <span className="text-meta text-chalk-dim">Cena za halu</span>
            <input
              type="number"
              name="priceCzk"
              required
              min={1}
              max={100000}
              defaultValue={1350}
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk"
            />
          </label>
        </div>
        <button type="submit" className="btn-primary self-start">
          Založit trénink
        </button>
      </form>

      <section className="flex flex-col">
        {trainings.length === 0 && (
          <p className="measure py-4 text-chalk-dim">Zatím žádný trénink. Založ první.</p>
        )}
        {trainings.map((training) => (
          <div key={training.id} className="row">
            <Link href={`/admin/treninky/${training.id}`} className="flex flex-col">
              <span className="text-body text-chalk">{formatDate(training.date)}</span>
              <span className="text-meta text-chalk-dim">
                {statusLabel[training.status]} · {headCounts.get(training.id) ?? 0} hlav
              </span>
            </Link>
            <form action={setTrainingStatus}>
              <input type="hidden" name="id" value={training.id} />
              <input
                type="hidden"
                name="status"
                value={training.status === 'held' ? 'cancelled' : 'held'}
              />
              <button type="submit" className="btn-quiet">
                {training.status === 'held' ? 'Zrušit' : 'Obnovit'}
              </button>
            </form>
          </div>
        ))}
      </section>
    </div>
  )
}
