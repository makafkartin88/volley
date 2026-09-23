import { notFound } from 'next/navigation'
import { markPaymentSent, unmarkPaymentSent } from '@/actions/settlements'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { PaymentQr } from '@/components/PaymentQr'
import {
  getAllPlayers, getLatestClosedSettlement, loadSettlementExpenses, loadTrainingBreakdownInputs,
} from '@/db/queries'
import { breakdownForPlayer } from '@/domain/breakdown'
import { formatCzk, formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function PlatbaDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>
}) {
  const { playerId: playerIdParam } = await params
  const playerId = Number(playerIdParam)
  if (!Number.isInteger(playerId) || playerId <= 0) notFound()

  const [closedSettlement, players] = await Promise.all([
    getLatestClosedSettlement(),
    getAllPlayers(),
  ])

  const player = players.find((p) => p.id === playerId)
  if (!player) notFound()

  if (!closedSettlement) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={player.name} />
        <p className="measure py-4 text-chalk-dim">Zatím není co platit.</p>
      </div>
    )
  }

  const { settlement, items } = closedSettlement
  const item = items.find((i) => i.playerId === playerId)

  if (!item) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={player.name} subtitle={settlement.label} />
        <p className="measure py-4 text-chalk-dim">
          V tomhle období nemá {player.name} nic k úhradě.
        </p>
      </div>
    )
  }

  const [trainings, expenses] = await Promise.all([
    loadTrainingBreakdownInputs(settlement.periodStart, settlement.periodEnd),
    loadSettlementExpenses(settlement.id),
  ])
  const breakdown = breakdownForPlayer(trainings, expenses, playerId)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={player.name} subtitle={settlement.label} />

      {item.paid ? (
        <p className="measure text-body text-chalk-dim">
          ✓ Zaplaceno{item.paidAt ? ` · ${formatDate(item.paidAt)}` : ''}
        </p>
      ) : item.playerConfirmedAt ? (
        <div className="flex flex-col gap-4">
          <p className="measure text-body text-chalk-dim">
            Čeká na potvrzení organizátorem · {formatDate(item.playerConfirmedAt)}
          </p>
          <form action={unmarkPaymentSent} className="self-start">
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="playerId" value={playerId} />
            <button type="submit" className="text-meta text-chalk-dim underline">
              Zrušit, ještě jsem neodeslal
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="display text-hero leading-none text-pink">{formatCzk(item.amountCzk)}</p>
          <PaymentQr
            amountCzk={item.amountCzk}
            message={`Volejbal ${settlement.label}`}
            variableSymbol={buildVariableSymbol(settlement.periodEnd, playerId)}
          />
          <form action={markPaymentSent} className="self-start">
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="playerId" value={playerId} />
            <button type="submit" className="btn-quiet">
              Odeslal(a) jsem platbu
            </button>
          </form>
        </div>
      )}

      <details className="border-b border-rule">
        <summary className="flex min-h-11 cursor-pointer list-none items-center py-3 text-body text-chalk">
          Rozbor
        </summary>
        <div className="flex flex-col gap-6 pt-2 pb-4">
          {breakdown.trainings.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-meta text-chalk-dim">Tréninky</h3>
              <section className="flex flex-col">
                {breakdown.trainings.map((row) => (
                  <div key={row.trainingId} className="row">
                    <span className="text-body text-chalk">{formatDate(row.date)}</span>
                    <Money value={row.amountCzk} />
                  </div>
                ))}
              </section>
            </div>
          )}

          {breakdown.expenses.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-meta text-chalk-dim">Další výdaje</h3>
              <section className="flex flex-col">
                {breakdown.expenses.map((row) => (
                  <div key={row.expenseId} className="row">
                    <span className="text-body text-chalk">{row.note}</span>
                    <Money value={row.amountCzk} />
                  </div>
                ))}
              </section>
            </div>
          )}

          <div className="row border-t border-rule">
            <span className="text-meta text-chalk-dim">Celkem</span>
            <Money value={item.amountCzk} />
          </div>
        </div>
      </details>
    </div>
  )
}

/**
 * `periodEnd` ve tvaru YYYYMM + playerId doplněné zleva na dvě místa,
 * např. období končící v 2026-10 a hráč #7 → "20261007". Díky tomu jde
 * platba ručně spárovat s hráčem přímo z výpisu z účtu.
 */
function buildVariableSymbol(periodEnd: string, playerId: number): string {
  const yearMonth = periodEnd.slice(0, 4) + periodEnd.slice(5, 7)
  return yearMonth + String(playerId).padStart(2, '0')
}
