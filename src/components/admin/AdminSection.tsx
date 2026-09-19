import type { ReactNode } from 'react'

/**
 * Složená sekce jednostránkové administrace. Čistě `<details>`/`<summary>`,
 * bez JavaScriptu — otevírání nesmí čekat na hydrataci, organizátor
 * kliká v hale hned po tréninku.
 *
 * Uvnitř sekcí není nic růžového: jediná růžová akce stránky je uložení
 * docházky nahoře. Výjimka zůstává `<Money tone="owed">` ve vyúčtování,
 * kde růžová nese stav „nezaplaceno“, ne akci.
 */
export function AdminSection({
  title,
  count,
  children,
}: {
  title: string
  count: string
  children: ReactNode
}) {
  return (
    <details className="border-b border-rule">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3">
        <span className="display text-body text-chalk">
          {title} <span className="text-chalk-dim tabular-nums">({count})</span>
        </span>
        <span className="text-meta text-chalk-dim">Rozbalit</span>
      </summary>
      <div className="flex flex-col gap-6 pt-2 pb-6">{children}</div>
    </details>
  )
}
