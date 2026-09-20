export type NavLink = { href: string; label: string }

/**
 * Rozcestníky, které jsou samy obsahovou stránkou a zároveň prefixem svých
 * podstránek. Kdyby se porovnávaly přes `startsWith`, svítily by v liště
 * současně se svojí podstránkou — `/admin/zapasy` začíná na `/admin`.
 */
const indexHrefs = new Set(['/', '/admin'])

/** Rozcestníky jsou aktivní jen přesně, ostatní i pro podstránky. */
export function isActive(pathname: string, href: string): boolean {
  return indexHrefs.has(href) ? pathname === href : pathname.startsWith(href)
}
