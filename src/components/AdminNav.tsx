import { NavBar } from '@/components/NavBar'
import type { NavLink } from '@/lib/nav'

const links: readonly NavLink[] = [
  { href: '/admin/hraci', label: 'Hráči' },
  { href: '/admin/treninky', label: 'Tréninky' },
  { href: '/admin/zapasy', label: 'Zápasy' },
  { href: '/admin/vyuctovani', label: 'Vyúčtování' },
]

/**
 * Admin navigace. Odlišení od veřejné části dělá plocha --ink-raised za
 * lištou, ne růžový proužek.
 */
export function AdminNav() {
  return <NavBar links={links} label="Navigace organizátora" surface="raised" />
}
