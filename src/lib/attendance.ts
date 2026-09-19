import { todayIso } from '@/lib/format'

/**
 * Docházková statistika. Doména (`src/domain/`) je uzavřená a otestovaná,
 * tohle je odvozování pro obrazovky — proto sedí v `lib`, ne v ní.
 */

export type AttendanceRow = { playerId: number; guests: number }

export type TrainingRow = {
  id: number
  date: string
  priceCzk: number
  status: 'held' | 'cancelled'
  attendance: AttendanceRow[]
  heads: number
}

export type PlayerRow = { id: number; name: string; archivedAt: Date | null }

/**
 * Tréninky, které už proběhly (nebo měly proběhnout), vzestupně podle data.
 * Budoucí termín se do historie nepočítá — na něj se lidé teprve hlásí a
 * jeho „nula hlav“ by křivila každé procento i graf.
 *
 * Zrušené tréninky zůstávají: graf z nich dělá mezeru a přehled tréninků
 * je ukazuje. Do jmenovatele docházky je nepouští `heldOnly` níž.
 */
export function pastTrainings(trainings: TrainingRow[], today = todayIso()): TrainingRow[] {
  return trainings
    .filter((t) => t.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Z minulých tréninků jen ty, které se skutečně konaly. */
export function heldTrainings(trainings: TrainingRow[], today = todayIso()): TrainingRow[] {
  return pastTrainings(trainings, today).filter((t) => t.status === 'held')
}

export type AttendanceStat = {
  /** Kolik tréninků měl hráč k dispozici (jmenovatel). */
  available: number
  /** Na kolika z nich byl (čitatel). */
  attended: number
  /** Podíl 0–1, nebo `null` když hráč neměl k dispozici žádný trénink. */
  rate: number | null
}

/**
 * Docházka hráče: byl / z konaných tréninků, které mu byly k dispozici.
 *
 * „K dispozici“ ořízne jen archivace — hráč, který v půlce sezóny odešel,
 * nemá nést tréninky po svém odchodu. Podle `createdAt` se neořezává
 * záměrně: ten nese, kdy někdo hráče zapsal do aplikace, ne kdy začal
 * chodit, a u dat naimportovaných zpětně by vyšel všem nulový jmenovatel.
 */
export function attendanceStat(
  held: TrainingRow[],
  player: PlayerRow,
): AttendanceStat {
  const until = player.archivedAt ? isoDate(player.archivedAt) : null
  const available = until ? held.filter((t) => t.date <= until) : held
  const attended = available.filter(
    (t) => t.attendance.some((a) => a.playerId === player.id),
  ).length
  return {
    available: available.length,
    attended,
    rate: available.length === 0 ? null : attended / available.length,
  }
}

/** Hráči seřazení podle docházky sestupně; kdo neměl žádný trénink, vypadne. */
export function attendanceRanking(
  held: TrainingRow[],
  players: PlayerRow[],
): { player: PlayerRow; stat: AttendanceStat }[] {
  return players
    .map((player) => ({ player, stat: attendanceStat(held, player) }))
    .filter((row) => row.stat.rate !== null)
    .sort((a, b) => (
      (b.stat.rate as number) - (a.stat.rate as number)
      || b.stat.attended - a.stat.attended
      || a.player.name.localeCompare(b.player.name, 'cs')
    ))
}

/** `0.857` → `"86 %"`, `null` → `"—"`. */
export function formatRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)} %`
}

/** Cena na hlavu, nebo `null` když nikdo nepřišel (dělení nulou). */
export function perHead(training: TrainingRow): number | null {
  return training.heads > 0 ? Math.round(training.priceCzk / training.heads) : null
}

function isoDate(value: Date): string {
  const date = new Date(value)
  date.setHours(12, 0, 0, 0)
  return date.toISOString().slice(0, 10)
}
