import type { ReactNode } from 'react'

/**
 * Nadpis obrazovky. Sentence case, nikdy verzálky, žádný eyebrow nad ním.
 * Linka pod hlavičkou navazuje na rytmus zápisu pod ní.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-rule pb-3">
      <div className="measure">
        <h1 className="display text-title leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-meta text-chalk-dim">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
