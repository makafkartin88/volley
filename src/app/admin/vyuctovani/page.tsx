import { SettlementStrip, type StripCard } from '@/components/admin/SettlementStrip'
import { NewSettlementForm, SettlementDetail } from '@/components/admin/SettlementsSection'
import { getActivePlayers, getAllPlayers, getSettlementsWithItems } from '@/db/queries'
import { monthRange, todayIso } from '@/lib/format'

// Koncept se přepočítává živě, takže stránka nesmí zůstat na cache z buildu.
export const dynamic = 'force-dynamic'

const NEW = 'new'

function shortRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    const [, m, d] = iso.split('-').map(Number)
    return `${d}. ${m}.`
  }
  return `${fmt(start)} – ${fmt(end)}`
}

function dayAfter(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + 1)
  return todayIso(date)
}

/**
 * Vyúčtování jako pás karet (vlevo starší, vpravo novější, na konci nové
 * období) a pod ním detail vybraného. Výchozí je rozpracované období, do
 * kterého patří dnešek — to je to, na co organizátor kouká nejčastěji.
 */
export default async function AdminVyuctovaniPage({ searchParams }: PageProps<'/admin/vyuctovani'>) {
  const [{ s }, rows, players, activePlayers] = await Promise.all([
    searchParams,
    getSettlementsWithItems(),
    getAllPlayers(),
    getActivePlayers(),
  ])
  // Jména všech hráčů, i archivovaných — dluh může zůstat i po archivaci.
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  const today = todayIso()
  const asc = [...rows].sort((a, b) => a.settlement.periodStart.localeCompare(b.settlement.periodStart))
  const open = asc.filter((r) => r.settlement.closedAt === null)
  const fallback =
    open.find((r) => r.settlement.periodStart <= today && today <= r.settlement.periodEnd)
    ?? open.at(-1) ?? asc.at(-1)

  const requested = s === NEW ? NEW : asc.find((r) => String(r.settlement.id) === s)?.settlement.id
  const selected: number | typeof NEW = requested ?? fallback?.settlement.id ?? NEW

  const href = (key: number | typeof NEW) => `/admin/vyuctovani?s=${key}`
  const order: (number | typeof NEW)[] = [...asc.map((r) => r.settlement.id), NEW]
  const index = order.indexOf(selected)

  const cards: StripCard[] = [
    ...asc.map(({ settlement, items }) => {
      const paid = items.filter((item) => item.paid).length
      const bottom = settlement.closedAt === null
        ? 'Rozpracované'
        : items.length === 0
          ? 'Bez položek'
          : paid === items.length ? 'Vše zaplaceno' : `Zaplaceno ${paid} z ${items.length}`
      return {
        key: String(settlement.id),
        href: href(settlement.id),
        top: shortRange(settlement.periodStart, settlement.periodEnd),
        main: settlement.label,
        bottom,
        loud: settlement.closedAt !== null && paid < items.length,
        active: settlement.id === selected,
      }
    }),
    {
      key: NEW,
      href: href(NEW),
      top: '+',
      main: 'Nové období',
      bottom: '',
      active: selected === NEW,
      dashed: true,
    },
  ]

  const last = asc.at(-1)
  const nextMonth = monthRange(last ? dayAfter(last.settlement.periodEnd) : today)
  const current = asc.find((r) => r.settlement.id === selected)

  return (
    <div className="flex flex-col gap-6">
      <SettlementStrip
        title="Vyúčtování"
        cards={cards}
        prevHref={index > 0 ? href(order[index - 1]) : null}
        nextHref={index < order.length - 1 ? href(order[index + 1]) : null}
      />
      {current ? (
        <SettlementDetail
          settlement={current.settlement}
          nameById={nameById}
          activePlayers={activePlayers}
        />
      ) : (
        <NewSettlementForm defaults={nextMonth} />
      )}
    </div>
  )
}
