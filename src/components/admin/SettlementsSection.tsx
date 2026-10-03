import {
  closeSettlement, createSettlement, deleteSettlementExpense, reopenSettlement, togglePaid,
} from '@/actions/settlements'
import { ExpenseForm } from '@/components/admin/ExpenseForm'
import { Money } from '@/components/Money'
import { getSettlementDetail, loadSettlementExpenses, loadTrainingBreakdownInputs } from '@/db/queries'
import { calculateSettlement } from '@/domain/settlement'
import { formatDate, todayIso } from '@/lib/format'

export type SettlementRow = {
  id: number
  label: string
  periodStart: string
  periodEnd: string
  closedAt: Date | null
}

const inputClass =
  'mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim'

type Player = { id: number; name: string }

/** Formulář na nové období, předvyplněný měsícem po posledním vyúčtování. */
export function NewSettlementForm({
  defaults,
}: {
  defaults: { label: string; start: string; end: string }
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-rule pb-3">
        <h2 className="display text-title leading-tight">Nové období</h2>
        <p className="mt-1 text-meta text-chalk-dim">
          Každý měsíc se zakládá sám prvního dne. Ručně jen mimořádné období.
        </p>
      </header>
      <form action={createSettlement} className="flex flex-col gap-3">
        <label>
          <span className="text-meta text-chalk-dim">Název období</span>
          <input
            type="text"
            name="label"
            required
            maxLength={60}
            defaultValue={defaults.label}
            className={inputClass}
          />
        </label>
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Od</span>
            <input type="date" name="periodStart" required defaultValue={defaults.start} className={inputClass} />
          </label>
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Do</span>
            <input type="date" name="periodEnd" required defaultValue={defaults.end} className={inputClass} />
          </label>
        </div>
        <button type="submit" className="btn-primary self-start">
          Založit období
        </button>
      </form>
    </div>
  )
}

/** Detail jednoho vyúčtování — živý koncept, nebo uzavřené s platbami. */
export function SettlementDetail({
  settlement,
  nameById,
  activePlayers,
}: {
  settlement: SettlementRow
  nameById: Map<number, string>
  activePlayers: Player[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-rule pb-3">
        <h2 className="display text-title leading-tight">{settlement.label}</h2>
        <p className="mt-1 text-meta text-chalk-dim">
          {formatDate(settlement.periodStart)} – {formatDate(settlement.periodEnd)},{' '}
          {settlement.closedAt ? 'uzavřené' : 'rozpracované, částky se přepočítávají živě'}
        </p>
      </header>
      {settlement.closedAt ? (
        <ClosedView settlementId={settlement.id} nameById={nameById} />
      ) : (
        <DraftView
          settlementId={settlement.id}
          periodStart={settlement.periodStart}
          periodEnd={settlement.periodEnd}
          nameById={nameById}
          activePlayers={activePlayers}
        />
      )}
    </div>
  )
}

/** Seznam už přidaných mimořádných výdajů se jmény účastníků. */
function ExpenseList({
  expenses,
  nameById,
  showDelete,
}: {
  expenses: { id: number; note: string; amountCzk: number; playerIds: number[] }[]
  nameById: Map<number, string>
  showDelete: boolean
}) {
  if (expenses.length === 0) return null

  return (
    <section className="flex flex-col">
      {expenses.map((expense) => (
        <div key={expense.id} className="row items-start">
          <span className="flex flex-col">
            <span className="text-body text-chalk">{expense.note}</span>
            <span className="text-meta text-chalk-dim">
              {expense.playerIds
                .map((playerId) => nameById.get(playerId) ?? `Hráč #${playerId}`)
                .join(', ')}
            </span>
          </span>
          <span className="flex items-center gap-3">
            <Money value={expense.amountCzk} />
            {showDelete && (
              <form action={deleteSettlementExpense}>
                <input type="hidden" name="id" value={expense.id} />
                <button
                  type="submit"
                  className="flex min-h-11 items-center justify-center border border-chalk-dim px-2 text-meta text-chalk-dim"
                >
                  Smazat
                </button>
              </form>
            )}
          </span>
        </div>
      ))}
    </section>
  )
}

/** Živý přepočet konceptu — částky se zmrazí až uzavřením. */
async function DraftView({
  settlementId,
  periodStart,
  periodEnd,
  nameById,
  activePlayers,
}: {
  settlementId: number
  periodStart: string
  periodEnd: string
  nameById: Map<number, string>
  activePlayers: Player[]
}) {
  const [inputs, expenses] = await Promise.all([
    loadTrainingBreakdownInputs(periodStart, periodEnd),
    loadSettlementExpenses(settlementId),
  ])
  const result = calculateSettlement(inputs, expenses)

  // Budoucí trénink bez docházky není chyba — jen ještě nebyl.
  const today = todayIso()
  const skipped = inputs.filter((t) => result.skippedTrainingIds.includes(t.id))
  const missing = skipped.filter((t) => t.date < today).length
  const upcoming = skipped.length - missing

  return (
    <div className="flex flex-col gap-6">
      {missing > 0 && (
        <div className="border border-chalk-dim px-3 py-2 text-meta text-chalk-dim">
          {missing === 1
            ? 'Jeden trénink proběhl, ale nemá zadanou docházku — nezapočítal se do vyúčtování.'
            : missing < 5
              ? `${missing} tréninky proběhly, ale nemají zadanou docházku — nezapočítaly se do vyúčtování.`
              : `${missing} tréninků proběhlo bez zadané docházky — nezapočítaly se do vyúčtování.`}
        </div>
      )}
      {upcoming > 0 && (
        <p className="text-meta text-chalk-dim">
          {upcoming === 1
            ? 'V období je ještě jeden nadcházející trénink.'
            : upcoming < 5
              ? `V období jsou ještě ${upcoming} nadcházející tréninky.`
              : `V období je ještě ${upcoming} nadcházejících tréninků.`}
        </p>
      )}
      {result.skippedExpenseIds.length > 0 && (
        <div className="border border-chalk-dim px-3 py-2 text-meta text-chalk-dim">
          {result.skippedExpenseIds.length === 1
            ? 'Jeden mimořádný výdaj nemá účastníky — nezapočítal se do vyúčtování.'
            : `${result.skippedExpenseIds.length} mimořádné výdaje nemají účastníky — nezapočítaly se do vyúčtování.`}
        </div>
      )}

      <section className="flex flex-col">
        {result.debts.length === 0 && (
          <p className="measure py-4 text-chalk-dim">
            V tomhle období není co vyúčtovat — žádný trénink s docházkou ani výdaj.
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

      <div className="flex flex-col gap-3">
        <h3 className="text-meta text-chalk-dim">Mimořádné výdaje</h3>
        <ExpenseList expenses={expenses} nameById={nameById} showDelete />
        <ExpenseForm settlementId={settlementId} players={activePlayers} />
      </div>

      <section className="flex flex-col">
        <div className="row">
          <span className="text-meta text-chalk-dim">Součet cen hal</span>
          <Money value={result.totalPriceCzk} />
        </div>
        <div className="row">
          <span className="text-meta text-chalk-dim">Součet mimořádných výdajů</span>
          <Money value={result.totalExpensesCzk} />
        </div>
        <div className="row">
          <span className="text-meta text-chalk-dim">Součet naúčtovaného</span>
          <Money value={result.totalChargedCzk} />
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
  const [detail, expenses] = await Promise.all([
    getSettlementDetail(settlementId),
    loadSettlementExpenses(settlementId),
  ])
  const items = detail?.items ?? []
  const paidCount = items.filter((item) => item.paid).length

  return (
    <div className="flex flex-col gap-6">
      <p className="text-meta tabular-nums text-chalk-dim">
        Zaplaceno {paidCount} z {items.length}
      </p>

      {expenses.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-meta text-chalk-dim">Mimořádné výdaje</h3>
          <ExpenseList expenses={expenses} nameById={nameById} showDelete={false} />
        </div>
      )}

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
