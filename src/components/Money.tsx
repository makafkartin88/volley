import { formatCzk } from '@/lib/format'

export type MoneyTone = 'default' | 'owed' | 'settled'

const toneClass: Record<MoneyTone, string> = {
  // běžná částka
  default: 'text-chalk',
  // nezaplaceno — jediná věc, která něco chce
  owed: 'text-pink',
  // vyřízeno — tiché, ustoupí z cesty
  settled: 'text-chalk-dim',
}

/**
 * Částka v korunách. Vždy tabulární číslice a zarovnání vpravo, aby se
 * částky ve sloupci srovnaly na desítky.
 */
export function Money({
  value,
  tone = 'default',
}: {
  value: number
  tone?: MoneyTone
}) {
  return (
    <span
      className={`inline-block text-right tabular-nums whitespace-nowrap ${toneClass[tone]}`}
    >
      {formatCzk(value)}
    </span>
  )
}
