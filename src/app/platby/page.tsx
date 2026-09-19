import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { Money } from '@/components/Money'
import { getAllPlayers, getLatestClosedSettlement } from '@/db/queries'

export const dynamic = 'force-dynamic'

export default async function PlatbyPage() {
  const [closedSettlement, players] = await Promise.all([
    getLatestClosedSettlement(),
    getAllPlayers(),
  ])
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  if (!closedSettlement) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Platby" />
        <p className="measure py-4 text-chalk-dim">Zatím není co platit.</p>
      </div>
    )
  }

  const { settlement, items } = closedSettlement
  const paidCount = items.filter((item) => item.paid).length
  // Nezaplacení nahoru — to je ta věc, kterou organizátor potřebuje řešit.
  const sortedItems = [...items].sort((a, b) => Number(a.paid) - Number(b.paid))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Platby"
        subtitle={`${settlement.label} · zaplaceno ${paidCount} z ${items.length}`}
      />

      <section className="flex flex-col">
        {items.length === 0 && (
          <p className="measure py-4 text-chalk-dim">Vyúčtování bylo uzavřeno bez žádných položek.</p>
        )}
        {sortedItems.map((item) => (
          <Link key={item.id} href={`/platby/${item.playerId}`} className="row">
            <span className={`text-body ${item.paid ? 'text-chalk-dim line-through' : 'text-chalk'}`}>
              {nameById.get(item.playerId) ?? `Hráč #${item.playerId}`}
            </span>
            <Money value={item.amountCzk} tone={item.paid ? 'settled' : 'owed'} />
          </Link>
        ))}
      </section>
    </div>
  )
}
