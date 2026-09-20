import { PageHeader } from '@/components/PageHeader'
import { openLabel, SettlementsSection } from '@/components/admin/SettlementsSection'
import { getAllPlayers, getSettlements } from '@/db/queries'

// Koncept se přepočítává živě, takže stránka nesmí zůstat na cache z buildu.
export const dynamic = 'force-dynamic'

export default async function AdminVyuctovaniPage() {
  const [settlements, players] = await Promise.all([
    getSettlements(),
    getAllPlayers(),
  ])
  // Jména všech hráčů, i archivovaných — dluh může zůstat i po archivaci.
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  const open = settlements.filter((s) => s.closedAt === null).length
  const subtitle = settlements.length === 0
    ? 'Zatím žádné období.'
    : open > 0
      ? `${settlements.length} období, ${openLabel(open)}.`
      : `${settlements.length} období, všechna uzavřená.`

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Vyúčtování" subtitle={subtitle} />
      <SettlementsSection settlements={settlements} nameById={nameById} />
    </div>
  )
}
