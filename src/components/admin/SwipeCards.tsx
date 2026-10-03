'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export type SwipeCard = {
  key: string
  content: ReactNode
  dashed?: boolean
}

/** Jak dlouho musí pás stát, než se karta uprostřed bere jako vybraná. */
const SETTLE_MS = 120

/**
 * Pás karet, který se táhne prstem. Karta, která docvakne doprostřed, se
 * sama vybere — během tažení se zvýrazňuje ta, která je zrovna uprostřed,
 * detail pod pásem se přepne až po dojetí. Klepnutí na kartu i šipky ji
 * naopak dotáhnou doprostřed.
 */
export function SwipeCards({
  cards, selectedKey, onSelect,
}: {
  cards: SwipeCard[]
  selectedKey: string
  onSelect: (key: string) => void
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const [centerKey, setCenterKey] = useState(selectedKey)
  const [prevSelected, setPrevSelected] = useState(selectedKey)
  if (prevSelected !== selectedKey) {
    setPrevSelected(selectedKey)
    setCenterKey(selectedKey)
  }
  const selectedRef = useRef(selectedKey)
  const settleTimer = useRef<number | undefined>(undefined)
  const firstScroll = useRef(true)

  function offsetOf(card: HTMLElement, strip: HTMLElement): number {
    return card.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft
  }

  function nearestKey(): string | null {
    const strip = stripRef.current
    if (!strip) return null
    const center = strip.scrollLeft + strip.clientWidth / 2
    let best: { key: string; distance: number } | null = null
    for (const card of strip.querySelectorAll<HTMLElement>('[data-key]')) {
      const distance = Math.abs(offsetOf(card, strip) + card.clientWidth / 2 - center)
      if (!best || distance < best.distance) best = { key: card.dataset.key!, distance }
    }
    return best?.key ?? null
  }

  useEffect(() => {
    selectedRef.current = selectedKey
    const strip = stripRef.current
    const card = strip?.querySelector<HTMLElement>(`[data-key="${CSS.escape(selectedKey)}"]`)
    if (!strip || !card) return
    const left = offsetOf(card, strip) - (strip.clientWidth - card.clientWidth) / 2
    if (Math.abs(strip.scrollLeft - left) > 1) {
      strip.scrollTo({ left, behavior: firstScroll.current ? 'auto' : 'smooth' })
    }
    firstScroll.current = false
  }, [selectedKey])

  useEffect(() => () => window.clearTimeout(settleTimer.current), [])

  function handleScroll() {
    const key = nearestKey()
    if (key) setCenterKey(key)
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => {
      const settled = nearestKey()
      if (settled && settled !== selectedRef.current) {
        selectedRef.current = settled
        onSelect(settled)
      }
    }, SETTLE_MS)
  }

  // Okrajové výplně dovolí, aby i první a poslední karta dojela doprostřed.
  const spacer = <div aria-hidden="true" className="w-[calc(50%-7rem-0.75rem)] shrink-0" />

  return (
    <div
      ref={stripRef}
      onScroll={handleScroll}
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {spacer}
      {cards.map((card) => {
        const active = card.key === centerKey
        return (
          <button
            key={card.key}
            type="button"
            data-key={card.key}
            onClick={() => onSelect(card.key)}
            aria-current={active}
            className={`flex min-h-28 w-56 shrink-0 snap-center flex-col items-start justify-between gap-2 border px-4 py-3 text-left ${
              card.dashed ? 'border-dashed' : ''
            } ${active ? 'border-chalk bg-ink-raised' : 'border-rule opacity-60'}`}
          >
            {card.content}
          </button>
        )
      })}
      {spacer}
    </div>
  )
}

/** Šipky nad pásem — pro jednu ruku a pro desktop, kde se prstem netáhne. */
export function SwipeArrows({
  onPrev, onNext, label,
}: {
  onPrev: (() => void) | null
  onNext: (() => void) | null
  label: string
}) {
  const arrow =
    'flex h-11 w-11 items-center justify-center border border-rule text-chalk disabled:text-chalk-dim disabled:opacity-40'
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onPrev ?? undefined} disabled={!onPrev} aria-label={`Předchozí ${label}`} className={arrow}>
        ←
      </button>
      <button type="button" onClick={onNext ?? undefined} disabled={!onNext} aria-label={`Další ${label}`} className={arrow}>
        →
      </button>
    </div>
  )
}
