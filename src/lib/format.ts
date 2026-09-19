const czk = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
})

const czechDate = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})

/** `1350` → `"1 350 Kč"` (nedělitelné mezery). */
export function formatCzk(amount: number): string {
  return czk.format(amount)
}

/** `"2026-09-14"` → `"14. 9. 2026"`. */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return czechDate.format(date)
}

/** `0.75` → `"75 %"`, `null` → `"—"` (nikdo ještě nehrál). */
export function formatWinRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)} %`
}

/**
 * ISO datum (YYYY-MM-DD) dneška v místním čase.
 *
 * Záměrně ne `new Date().toISOString()` — ten vrací UTC, takže mezi půlnocí
 * a druhou ranní (letní čas) hlásí ještě včerejšek. Docházka se zapisuje
 * v neděli večer, tedy přesně kolem téhle hranice.
 */
export function todayIso(from: Date = new Date()): string {
  const date = new Date(from)
  date.setHours(12, 0, 0, 0) // poledne, aby letní čas neposunul den
  return date.toISOString().slice(0, 10)
}

/** ISO datum (YYYY-MM-DD) nejbližší neděle. Když je dnes neděle, vrátí dnešek. */
export function nextSundayIso(from: Date = new Date()): string {
  const date = new Date(from)
  date.setHours(12, 0, 0, 0) // poledne, aby letní čas neposunul den
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7))
  return date.toISOString().slice(0, 10)
}
