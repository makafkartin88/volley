'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { NavBar } from '@/components/NavBar'
import type { NavLink } from '@/lib/nav'

const links: readonly NavLink[] = [
  { href: '/', label: 'Přehled' },
  { href: '/treninky', label: 'Tréninky' },
  { href: '/zapasy', label: 'Zápasy' },
  { href: '/platby', label: 'Platby' },
]

/**
 * Veřejná část dostane navigaci a sloupec obsahu; /admin/* si chrome řeší
 * vlastním layoutem, aby se plocha --ink-raised mohla táhnout přes celou šířku.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return <>{children}</>

  return (
    <>
      <NavBar links={links} label="Hlavní navigace" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-28 sm:pt-8 sm:pb-12">
        {children}
      </main>
    </>
  )
}
