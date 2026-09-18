import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { PaymentQr } from '@/components/PaymentQr'
import { getAllPlayers, getLatestClosedSettlement } from '@/db/queries'
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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={player.name} subtitle={settlement.label} />

      {item.paid ? (
        <p className="measure text-body text-chalk-dim">
          ✓ Zaplaceno{item.paidAt ? ` · ${formatDate(item.paidAt)}` : ''}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="display text-hero leading-none text-pink">{formatCzk(item.amountCzk)}</p>
          <PaymentQr
            amountCzk={item.amountCzk}
            message={`Volejbal ${settlement.label}`}
            variableSymbol={buildVariableSymbol(settlement.periodEnd, playerId)}
          />
        </div>
      )}
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
