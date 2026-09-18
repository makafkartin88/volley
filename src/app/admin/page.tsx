import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import {
  getHeadCounts, getSettlementDetail, getSettlements, getTrainings,
} from '@/db/queries'
import { formatDate } from '@/lib/format'

const tiles = [
  { href: '/admin/hraci', label: 'Hráči' },
  { href: '/admin/treninky', label: 'Tréninky' },
  { href: '/admin/zapasy', label: 'Zápasy' },
  { href: '/admin/vyuctovani', label: 'Vyúčtování' },
]

// Nepokrytý trénink dneška se má hlásit hned po tréninku, ne až zítra.
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const [trainings, headCounts, settlementsList] = await Promise.all([
    getTrainings(),
    getHeadCounts(),
    getSettlements(),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const missingAttendance = trainings.filter(
    (t) => t.status === 'held' && t.date <= today && (headCounts.get(t.id) ?? 0) === 0
  )

  const openSettlements = settlementsList.filter((s) => !s.closedAt)

  const lastClosed = settlementsList.find((s) => s.closedAt)
  const lastClosedDetail = lastClosed ? await getSettlementDetail(lastClosed.id) : null
  const unpaidCount = lastClosedDetail
    ? lastClosedDetail.items.filter((item) => !item.paid).length
    : 0

  const hasAttention = missingAttendance.length > 0 || openSettlements.length > 0 || unpaidCount > 0

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Přehled" subtitle="Rozcestník pro organizátora." />

      {hasAttention && (
        <section className="flex flex-col gap-1">
          <h2 className="text-meta text-chalk-dim">Vyžaduje pozornost</h2>
          <div className="flex flex-col">
            {missingAttendance.map((t) => (
              <Link key={t.id} href={`/admin/treninky/${t.id}`} className="row">
                <span className="text-body text-chalk">
                  Trénink {formatDate(t.date)} nemá zadanou docházku
                </span>
                <span className="text-meta text-chalk-dim">Doplnit</span>
              </Link>
            ))}
            {openSettlements.map((s) => (
              <Link key={s.id} href={`/admin/vyuctovani/${s.id}`} className="row">
                <span className="text-body text-chalk">Vyúčtování „{s.label}“ je rozpracované</span>
                <span className="text-meta text-chalk-dim">Dokončit</span>
              </Link>
            ))}
            {lastClosed && unpaidCount > 0 && (
              <Link href={`/admin/vyuctovani/${lastClosed.id}`} className="row">
                <span className="text-body text-chalk">
                  {unpaidCount} {unpaidCount === 1 ? 'hráč ještě nezaplatil' : 'hráčů ještě nezaplatilo'} za „{lastClosed.label}“
                </span>
                <span className="text-meta text-chalk-dim">Zobrazit</span>
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="flex min-h-24 flex-col justify-end border border-chalk-dim px-3 py-3 text-body text-chalk"
          >
            {tile.label}
          </Link>
        ))}
      </section>
    </div>
  )
}
