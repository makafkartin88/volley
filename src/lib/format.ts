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
