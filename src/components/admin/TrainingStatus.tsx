import { setTrainingStatus } from '@/actions/trainings'

export const trainingStatusLabel: Record<'held' | 'cancelled', string> = {
  held: 'Proběhl',
  cancelled: 'Zrušen',
}

/**
 * Přepínač stavu tréninku. Stav je jen `held`/`cancelled` — nic mezi tím.
 */
export function TrainingStatusToggle({
  id,
  status,
}: {
  id: number
  status: 'held' | 'cancelled'
}) {
  return (
    <form action={setTrainingStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status === 'held' ? 'cancelled' : 'held'} />
      <button type="submit" className="btn-quiet">
        {status === 'held' ? 'Zrušit trénink' : 'Obnovit trénink'}
      </button>
    </form>
  )
}
