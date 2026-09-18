import { notFound } from 'next/navigation'
import { closeSettlement, reopenSettlement, togglePaid } from '@/actions/settlements'
import { PageHeader } from '@/components/PageHeader'
import { Money } from '@/components/Money'
import { getAllPlayers, getSettlementDetail, loadTrainingInputs } from '@/db/queries'
import { calculateSettlement } from '@/domain/settlement'
import { formatDate } from '@/lib/format'

export default async function VyuctovaniDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const settlementId = Number(id)
  if (!Number.isInteger(settlementId) || settlementId <= 0) notFound()

  const [detail, players] = await Promise.all([
    getSettlementDetail(settlementId),
    getAllPlayers(),
  ])
  if (!detail) notFound()

  const { settlement, items } = detail
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={settlement.label}
        subtitle={`${formatDate(settlement.periodStart)} – ${formatDate(settlement.periodEnd)} · ${
          settlement.closedAt ? 'Uzavřeno' : 'Koncept'
        }`}
      />

      {settlement.closedAt ? (
        <ClosedView settlementId={settlement.id} items={items} nameById={nameById} />
      ) : (
        <DraftView settlementId={settlement.id} periodStart={settlement.periodStart} periodEnd={settlement.periodEnd} nameById={nameById} />
      )}
    </div>
  )
}

async function DraftView({
  settlementId,
  periodStart,
  periodEnd,
  nameById,
}: {
  settlementId: number
  periodStart: string
  periodEnd: string
  nameById: Map<number, string>
}) {
  const inputs = await loadTrainingInputs(periodStart, periodEnd)
  const result = calculateSettlement(inputs)

  return (
    <div className="flex flex-col gap-6">
      {result.skippedTrainingIds.length > 0 && (
        <div className="border border-chalk-dim px-3 py-2 text-meta text-chalk-dim">
          {result.skippedTrainingIds.length === 1
            ? 'Jeden trénink proběhl, ale nemá zadanou docházku — nezapočítal se do vyúčtování.'
            : `${result.skippedTrainingIds.length} tréninky proběhly, ale nemají zadanou docházku — nezapočítaly se do vyúčtování.`}
        </div>
      )}

      <section className="flex flex-col">
        {result.debts.length === 0 && (
          <p className="measure py-4 text-chalk-dim">
            V tomhle období není co vyúčtovat — žádný trénink s docházkou.
          </p>
        )}
        {result.debts.map((debt) => (
          <div key={debt.playerId} className="row">
            <span className="text-body text-chalk">
              {nameById.get(debt.playerId) ?? `Hráč #${debt.playerId}`}
            </span>
            <Money value={debt.amountCzk} />
          </div>
        ))}
      </section>

      <section className="flex flex-col">
        <div className="row">
          <span className="text-meta text-chalk-dim">Součet cen hal</span>
          <Money value={result.totalPriceCzk} />
        </div>
        <div className="row">
          <span className="text-meta text-chalk-dim">Součet naúčtovaného</span>
          <Money value={result.totalChargedCzk} />
        </div>
        <div className="row">
          <span className="text-meta text-chalk-dim">Rozdíl (zaokrouhlení)</span>
          <Money value={result.differenceCzk} />
        </div>
      </section>

      <form action={closeSettlement} className="self-start">
        <input type="hidden" name="id" value={settlementId} />
        <button type="submit" className="btn-primary" disabled={result.debts.length === 0}>
          Uzavřít období
        </button>
      </form>
    </div>
  )
}

function ClosedView({
  settlementId,
  items,
  nameById,
}: {
  settlementId: number
  items: { id: number; playerId: number; amountCzk: number; paid: boolean }[]
  nameById: Map<number, string>
}) {
  const paidCount = items.filter((item) => item.paid).length

  return (
    <div className="flex flex-col gap-6">
      <p className="text-meta text-chalk-dim">
        Zaplaceno {paidCount} z {items.length}
      </p>

      <section className="flex flex-col">
        {items.length === 0 && (
          <p className="measure py-4 text-chalk-dim">Vyúčtování bylo uzavřeno bez žádných položek.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="row">
            <span className={`text-body ${item.paid ? 'text-chalk-dim line-through' : 'text-chalk'}`}>
              {nameById.get(item.playerId) ?? `Hráč #${item.playerId}`}
            </span>
            <div className="flex items-center gap-3">
              <Money value={item.amountCzk} tone={item.paid ? 'settled' : 'owed'} />
              <form action={togglePaid}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="settlementId" value={settlementId} />
                <input type="hidden" name="paid" value={item.paid ? 'false' : 'true'} />
                <button
                  type="submit"
                  className="flex h-8 min-w-8 items-center justify-center border border-chalk-dim px-2 text-meta text-chalk-dim"
                  aria-pressed={item.paid}
                >
                  {item.paid ? '✓ Zaplaceno' : 'Označit zaplaceno'}
                </button>
              </form>
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-2">
        <form action={reopenSettlement} className="self-start">
          <input type="hidden" name="id" value={settlementId} />
          <button type="submit" className="btn-quiet">
            Zrušit uzavření
          </button>
        </form>
        <p className="measure text-meta text-chalk-dim">
          Zrušení uzavření smaže i odškrtnuté platby — po opětovném uzavření se vyúčtování spočítá znovu od nuly.
        </p>
      </div>
    </div>
  )
}
