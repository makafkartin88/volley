import { notFound } from 'next/navigation'
import { setTrainingStatus } from '@/actions/trainings'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { PageHeader } from '@/components/PageHeader'
import { getActivePlayers, getTrainingWithAttendance } from '@/db/queries'
import { formatCzk, formatDate } from '@/lib/format'

const statusLabel: Record<'held' | 'cancelled', string> = {
  held: 'Proběhl',
  cancelled: 'Zrušen',
}

export default async function TreninkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trainingId = Number(id)
  if (!Number.isInteger(trainingId) || trainingId <= 0) notFound()

  const [result, players] = await Promise.all([
    getTrainingWithAttendance(trainingId),
    getActivePlayers(),
  ])
  if (!result) notFound()

  const { training, attendance } = result

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={formatDate(training.date)}
        subtitle={`${statusLabel[training.status]} · ${formatCzk(training.priceCzk)} za halu`}
        action={
          <form action={setTrainingStatus}>
            <input type="hidden" name="id" value={training.id} />
            <input
              type="hidden"
              name="status"
              value={training.status === 'held' ? 'cancelled' : 'held'}
            />
            <button type="submit" className="btn-quiet">
              {training.status === 'held' ? 'Zrušit' : 'Obnovit'}
            </button>
          </form>
        }
      />

      <AttendanceGrid
        trainingId={training.id}
        priceCzk={training.priceCzk}
        players={players}
        initial={attendance.map((a) => ({ playerId: a.playerId, guests: a.guests }))}
      />
    </div>
  )
}
