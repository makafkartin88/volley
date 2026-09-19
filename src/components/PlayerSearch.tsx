'use client'

import { stripDiacritics } from '@/domain/spd'

/**
 * Filtr jmen nad výběrem hráčů. Sdílený mezi `AttendanceGrid` (mapa s hosty)
 * a `LineupPicker` (množina) — obě komponenty zůstávají oddělené, společné
 * je jen tohle políčko a normalizace pod ním.
 *
 * Filtr je čistě zobrazovací: nikdy nesahá na výběr. Odfiltrovaný hráč
 * zůstává zaškrtnutý a dál se počítá do hlav.
 */
export function playerMatchesQuery(name: string, query: string): boolean {
  const needle = normalize(query)
  if (needle === '') return true
  return normalize(name).includes(needle)
}

/** „Šárka Beková“ → „sarka bekova“, ať `sarka` i `SARKA` najdou totéž. */
function normalize(value: string): string {
  return stripDiacritics(value).toLowerCase().trim()
}

export function PlayerSearch({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (value: string) => void
  id: string
}) {
  return (
    <label htmlFor={id} className="flex flex-col">
      <span className="sr-only">Hledat hráče</span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Hledat hráče"
        autoComplete="off"
        className="min-h-11 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk placeholder:text-chalk-dim"
      />
    </label>
  )
}
