'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { SwipeArrows, SwipeCards } from '@/components/admin/SwipeCards'

export type StripCard = {
  key: string
  href: string
  top: string
  main: string
  bottom: string
  /** Stav, který po organizátorovi něco chce — světlejší text. */
  loud?: boolean
  dashed?: boolean
}

/**
 * Pás karet vyúčtování — stejné tažení prstem jako u tréninků. Detail se
 * počítá na serveru, takže výběr přepíše adresu (`?s=`) a stránka ho dopočítá.
 * Karta se zvýrazní hned, nečeká na server.
 */
export function SettlementStrip({
  title, cards, selectedKey,
}: {
  title: string
  cards: StripCard[]
  selectedKey: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useState(selectedKey)
  const [prevKey, setPrevKey] = useState(selectedKey)
  if (prevKey !== selectedKey) {
    setPrevKey(selectedKey)
    setSelected(selectedKey)
  }

  function select(key: string) {
    const card = cards.find((c) => c.key === key)
    if (!card) return
    setSelected(key)
    startTransition(() => router.replace(card.href, { scroll: false }))
  }

  const index = cards.findIndex((c) => c.key === selected)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h1 className="display text-title">{title}</h1>
        <SwipeArrows
          label="období"
          onPrev={index > 0 ? () => select(cards[index - 1].key) : null}
          onNext={index < cards.length - 1 ? () => select(cards[index + 1].key) : null}
        />
      </div>
      <SwipeCards
        selectedKey={selected}
        onSelect={select}
        cards={cards.map((card) => ({
          key: card.key,
          dashed: card.dashed,
          content: (
            <>
              <span className="text-meta text-chalk-dim">{card.top}</span>
              <span className="display text-title leading-tight text-chalk">{card.main}</span>
              <span className={`text-meta ${card.loud ? 'text-chalk' : 'text-chalk-dim'}`}>
                {card.bottom}
              </span>
            </>
          ),
        }))}
      />
    </div>
  )
}
