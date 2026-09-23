'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isActive, type NavLink } from '@/lib/nav'

const surfaceClass = {
  // veřejná část splývá s plochou stránky
  ink: 'bg-ink',
  // admin se odlišuje vyvýšenou plochou, ne růžovým proužkem
  raised: 'bg-ink-raised',
} as const

export type NavSurface = keyof typeof surfaceClass

/**
 * Lišta s odkazy. Na mobilu je dole (dosáhneš palcem), na desktopu nahoře.
 * Aktivní položka se pozná linkou v --chalk — růžová patří tomu jedinému
 * číslu na obrazovku a primární akci, ne navigaci.
 */
export function NavBar({
  links,
  label,
  surface = 'ink',
}: {
  links: readonly NavLink[]
  label: string
  surface?: NavSurface
}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label={label}
      className={`fixed inset-x-0 bottom-0 z-10 border-t border-rule pb-[env(safe-area-inset-bottom)] sm:static sm:border-t-0 sm:border-b sm:pb-0 ${surfaceClass[surface]}`}
    >
      <ul className="mx-auto flex w-full max-w-2xl sm:gap-6 sm:px-4">
        {links.map((link) => {
          const active = isActive(pathname, link.href)
          return (
            <li key={link.href} className="flex-1 sm:flex-none">
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-16 items-center justify-center px-1 text-meta sm:min-h-12 sm:justify-start ${
                  active ? 'text-chalk' : 'text-chalk-dim'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-1 top-0 h-0.5 bg-chalk"
                  />
                )}
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
