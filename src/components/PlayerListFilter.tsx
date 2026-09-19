'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { formatRate } from '@/lib/attendance'
import { PlayerSearch, playerMatchesQuery } from '@/components/PlayerSearch'

export type PlayerListRow = {
  id: number
  name: string
  percent: number | null
  detail: string
  dim?: boolean
}

/**
 * Soupiska hráčů se search barem nad ní. Řazení je hotové na serveru
 * (podle docházky), tenhle komponent jen filtruje podle jména —
 * stejná diakritiku-necitlivá shoda jako v mřížce docházky a sestavě.
 */
export function PlayerListFilter({ rows }: { rows: PlayerListRow[] }) {
  const [query, setQuery] = useState('')
  const inputId = useId()
  const visible = rows.filter((row) => playerMatchesQuery(row.name, query))

  return (
    <div className="flex flex-col gap-4">
      <PlayerSearch id={inputId} value={query} onChange={setQuery} />
      {visible.length === 0 ? (
        <p className="py-4 text-body text-chalk-dim">
          Nikdo se jménem „{query}“. Zkus kratší kus jména.
        </p>
      ) : (
        <ul>
          {visible.map((row) => (
            <PlayerRowLink key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  )
}

function PlayerRowLink({ row }: { row: PlayerListRow }) {
  const { dim = false } = row
  return (
    <li>
      <Link href={`/hraci/${row.id}`} className="block border-b border-rule py-3">
        <span className="flex items-baseline justify-between gap-4">
          <span className={`text-body ${dim ? 'text-chalk-dim' : 'text-chalk'}`}>
            {row.name}
          </span>
          <span className="flex items-baseline gap-3">
            <span className="text-meta text-chalk-dim">{row.detail}</span>
            <span className={`text-body tabular-nums ${dim ? 'text-chalk-dim' : 'text-chalk'}`}>
              {formatRate(row.percent === null ? null : row.percent / 100)}
            </span>
          </span>
        </span>
        {row.percent !== null && (
          <span aria-hidden="true" className="mt-2 block h-1 bg-rule">
            <span
              className={`block h-full ${dim ? 'bg-chalk-dim' : 'bg-chalk'}`}
              style={{ width: `${row.percent}%` }}
            />
          </span>
        )}
      </Link>
    </li>
  )
}
