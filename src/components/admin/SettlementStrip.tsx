'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

export type StripCard = {
  key: string
  href: string
  top: string
  main: string
  bottom: string
  /** Stav, který po organizátorovi něco chce — světlejší text. */
  loud?: boolean
  active: boolean
  dashed?: boolean
}

/**
 * Vodorovný pás karet vyúčtování — stejný vzhled jako pás tréninků, jen
 * výběr jde přes adresu (`?s=`), protože detail se počítá na serveru.
 */
export function SettlementStrip({
  title, cards, prevHref, nextHref,
}: {
  title: string
  cards: StripCard[]
  prevHref: string | null
  nextHref: string | null
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const activeKey = cards.find((card) => card.active)?.key
  useEffect(() => {
    const strip = stripRef.current
    const card = strip?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!strip || !card) return
    strip.scrollTo({ left: card.offsetLeft - (strip.clientWidth - card.clientWidth) / 2 })
  }, [activeKey])

  const arrow = 'flex h-11 w-11 items-center justify-center border border-rule'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h1 className="display text-title">{title}</h1>
        <div className="flex gap-2">
          {prevHref ? (
            <Link href={prevHref} replace scroll={false} aria-label="Předchozí období" className={`${arrow} text-chalk`}>←</Link>
          ) : (
            <span aria-hidden="true" className={`${arrow} text-chalk-dim opacity-40`}>←</span>
          )}
          {nextHref ? (
            <Link href={nextHref} replace scroll={false} aria-label="Další období" className={`${arrow} text-chalk`}>→</Link>
          ) : (
            <span aria-hidden="true" className={`${arrow} text-chalk-dim opacity-40`}>→</span>
          )}
        </div>
      </div>

      <div
        ref={stripRef}
        className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      >
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            replace
            scroll={false}
            aria-current={card.active}
            className={`flex w-36 shrink-0 snap-center flex-col items-start border px-3 py-2 text-left ${
              card.dashed ? 'border-dashed' : ''
            } ${card.active ? 'border-chalk bg-ink-raised' : 'border-rule'}`}
          >
            <span className="text-meta text-chalk-dim">{card.top}</span>
            <span className="display text-body leading-snug text-chalk">{card.main}</span>
            <span className={`text-meta ${card.loud ? 'text-chalk' : 'text-chalk-dim'}`}>
              {card.bottom}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
