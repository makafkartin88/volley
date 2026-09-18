import Link from 'next/link'
import { createSettlement } from '@/actions/settlements'
import { getSettlements } from '@/db/queries'
import { PageHeader } from '@/components/PageHeader'
import { formatDate } from '@/lib/format'

export default async function VyuctovaniPage() {
  const settlementsList = await getSettlements()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Vyúčtování" subtitle="Založ období a uzavři ho po kontrole docházky." />

      <form action={createSettlement} className="flex flex-col gap-3">
        <label>
          <span className="text-meta text-chalk-dim">Název období</span>
          <input
            type="text"
            name="label"
            required
            maxLength={60}
            placeholder="Např. Září 2026"
            className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Od</span>
            <input
              type="date"
              name="periodStart"
              required
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk"
            />
          </label>
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Do</span>
            <input
              type="date"
              name="periodEnd"
              required
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk"
            />
          </label>
        </div>
        <button type="submit" className="btn-primary self-start">
          Založit období
        </button>
      </form>

      <section className="flex flex-col">
        {settlementsList.length === 0 && (
          <p className="measure py-4 text-chalk-dim">Zatím žádné období. Založ první.</p>
        )}
        {settlementsList.map((settlement) => (
          <Link
            key={settlement.id}
            href={`/admin/vyuctovani/${settlement.id}`}
            className="row"
          >
            <span className="flex flex-col">
              <span className="text-body text-chalk">{settlement.label}</span>
              <span className="text-meta text-chalk-dim">
                {formatDate(settlement.periodStart)} – {formatDate(settlement.periodEnd)}
              </span>
            </span>
            <span className="text-meta text-chalk-dim">
              {settlement.closedAt ? 'Uzavřeno' : 'Koncept'}
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
