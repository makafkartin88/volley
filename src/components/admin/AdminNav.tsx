import { NavBar } from '@/components/NavBar'
import type { NavLink } from '@/lib/nav'

/**
 * Lišta administrace. Stejná komponenta jako veřejná navigace, jen na
 * vyvýšené ploše --ink-raised — admin se odlišuje plochou, ne růžovou.
 *
 * Pořadí je podle toho, co organizátor potřebuje nejčastěji: hned po
 * tréninku zapisuje docházku, takže Tréninky jsou první a jsou na `/admin`.
 */
const links: readonly NavLink[] = [
  { href: '/admin', label: 'Tréninky' },
  { href: '/admin/zapasy', label: 'Zápasy' },
  { href: '/admin/vyuctovani', label: 'Vyúčtování' },
  { href: '/admin/hraci', label: 'Hráči' },
]

export function AdminNav() {
  return <NavBar links={links} label="Navigace administrace" surface="raised" />
}
