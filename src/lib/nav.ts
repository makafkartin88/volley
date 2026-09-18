export type NavLink = { href: string; label: string }

/** `/` je aktivní jen přesně, ostatní i pro podstránky. */
export function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}
