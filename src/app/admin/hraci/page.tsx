import { PageHeader } from '@/components/PageHeader'
import { PlayersSection } from '@/components/admin/PlayersSection'
import { getAllPlayers } from '@/db/queries'
import { plural } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AdminHraciPage() {
  const players = await getAllPlayers()
  const active = players.filter((player) => player.archivedAt === null).length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Hráči"
        subtitle={`${active} ${plural(active, 'aktivní hráč', 'aktivní hráči', 'aktivních hráčů')} v kádru.`}
      />
      <PlayersSection players={players} />
    </div>
  )
}
