import { HomeView } from '@/components/HomeView'
import {
  getAllPlayers, getLatestClosedSettlement, getMatchesWithAppearances, getTrainingsWithAttendance,
} from '@/db/queries'
import { todayIso } from '@/lib/format'
import { buildHomeData } from '@/lib/home'

// „Nejbližší trénink“ i hranice mezi historií a budoucností se počítají
// z aktuálního času, ne z času buildu.
export const dynamic = 'force-dynamic'

/** Rozcestník celé aplikace — jediná adresa, kterou stačí poslat do skupiny. */
export default async function Home() {
  const [trainings, players, closedSettlement, matches] = await Promise.all([
    getTrainingsWithAttendance(),
    getAllPlayers(),
    getLatestClosedSettlement(),
    getMatchesWithAppearances(),
  ])

  return (
    <HomeView
      data={buildHomeData({ trainings, players, closedSettlement, matches, today: todayIso() })}
    />
  )
}
