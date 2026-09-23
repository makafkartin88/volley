import {
  closeSettlement, createSettlement, reopenSettlement, togglePaid,
} from '@/actions/settlements'
import { Money } from '@/components/Money'
import { getSettlementDetail, loadTrainingInputs } from '@/db/queries'
import { calculateSettlement } from '@/domain/settlement'
import { formatDate } from '@/lib/format'

export type SettlementRow = {
  id: number
  label: string
  periodStart: string
  periodEnd: string
  closedAt: Date | null
}

const inputClass =
  'mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim'

/** „1 rozpracované“, „2 rozpracovaná“, „5 rozpracovaných“. Pro podtitulek stránky. */
export function openLabel(n: number): string {
  if (n === 1) return '1 rozpracované'
  if (n < 5) return `${n} rozpracovaná`
  return `${n} rozpracovaných`
}

export function SettlementsSection({
  settlements,
  nameById,
}: {
  settlements: SettlementRow[]
  nameById: Map<number, string>
}) {
  return (
    <div className="flex flex-col gap-6">
      <form action={createSettlement} className="flex flex-col gap-3">
        <label>
          <span className="text-meta text-chalk-dim">Název období</span>
          <input
            type="text"
            name="label"
            required
            maxLength={60}
            placeholder="Např. Září 2026"
            className={inputClass}
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Od</span>
            <input type="date" name="periodStart" required className={inputClass} />
          </label>
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Do</span>
            <input type="date" name="periodEnd" required className={inputClass} />
          </label>
        </div>
        <button type="submit" className="btn-quiet self-start">
          Založit období
        </button>
      </form>

      <section className="flex flex-col">
        {settlements.length === 0 && (
          <p className="measure py-4 text-chalk-dim">Zatím žádné období. Založ první.</p>
        )}
        {settlements.map((settlement) => (
          <details key={settlement.id} className="border-b border-rule">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3">
              <span className="flex flex-col">
                <span className="text-body text-chalk">{settlement.label}</span>
                <span className="text-meta text-chalk-dim">
                  {formatDate(settlement.periodStart)} – {formatDate(settlement.periodEnd)}
                </span>
              </span>
              <span className="text-meta text-chalk-dim">
                {settlement.closedAt ? 'Uzavřeno' : 'Koncept'}
              </span>
            </summary>
            <div className="pt-2 pb-4">
              {settlement.closedAt ? (
                <ClosedView settlementId={settlement.id} nameById={nameById} />
              ) : (
                <DraftView
                  settlementId={settlement.id}
                  periodStart={settlement.periodStart}
                  periodEnd={settlement.periodEnd}
                  nameById={nameById}
                />
              )}
            </div>
          </details>
        ))}
      </section>
    </div>
  )
}

/** Živý přepočet konceptu — částky se zmrazí až uzavřením. */
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
        <button type="submit" className="btn-quiet" disabled={result.debts.length === 0}>
          Uzavřít období
        </button>
      </form>
    </div>
  )
}

/** Uzavřené období: zmrazené částky a odškrtávání plateb. */
async function ClosedView({
  settlementId,
  nameById,
}: {
  settlementId: number
  nameById: Map<number, string>
}) {
  const detail = await getSettlementDetail(settlementId)
  const items = detail?.items ?? []
  const paidCount = items.filter((item) => item.paid).length

  return (
    <div className="flex flex-col gap-6">
      <p className="text-meta tabular-nums text-chalk-dim">
        Zaplaceno {paidCount} z {items.length}
      </p>

      <section className="flex flex-col">
        {items.length === 0 && (
          <p className="measure py-4 text-chalk-dim">
            Vyúčtování bylo uzavřeno bez žádných položek.
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="row">
            <span className={`text-body ${item.paid ? 'text-chalk-dim line-through' : 'text-chalk'}`}>
              {nameById.get(item.playerId) ?? `Hráč #${item.playerId}`}
              {!item.paid && item.playerConfirmedAt && (
                <span className="ml-2 text-meta text-chalk-dim">
                  Odesláno {formatDate(item.playerConfirmedAt)}
                </span>
              )}
            </span>
            <span className="flex items-center gap-3">
              <Money value={item.amountCzk} tone={item.paid ? 'settled' : 'owed'} />
              <form action={togglePaid}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="settlementId" value={settlementId} />
                <input type="hidden" name="paid" value={item.paid ? 'false' : 'true'} />
                <button
                  type="submit"
                  className="flex min-h-11 min-w-11 items-center justify-center border border-chalk-dim px-2 text-meta text-chalk-dim"
                  aria-pressed={item.paid}
                >
                  {item.paid ? '✓ Zaplaceno' : 'Označit zaplaceno'}
                </button>
              </form>
            </span>
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
          Zrušení uzavření smaže i odškrtnuté platby — po opětovném uzavření se vyúčtování
          spočítá znovu od nuly.
        </p>
      </div>
    </div>
  )
}
