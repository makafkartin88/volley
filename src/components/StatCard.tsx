import type { ReactNode } from 'react'

export type StatTone = 'default' | 'owed' | 'settled'

const toneClass: Record<StatTone, string> = {
  default: 'text-chalk',
  owed: 'text-pink',
  settled: 'text-chalk-dim',
}

/**
 * Není to karta se stínem — je to blok s linkou nahoře. Žádný border-radius,
 * žádné pozadí. Popisek malý a tichý, hodnota hlasitá.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: StatTone
}) {
  return (
    <div className="border-t border-rule pt-2">
      <div className="text-meta text-chalk-dim">{label}</div>
      <div className={`display mt-0.5 text-title tabular-nums ${toneClass[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-meta text-chalk-dim">{hint}</div>}
    </div>
  )
}
