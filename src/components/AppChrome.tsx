'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { NavBar } from '@/components/NavBar'
import type { NavLink } from '@/lib/nav'

const links: readonly NavLink[] = [
  { href: '/', label: 'Přehled' },
  { href: '/hraci', label: 'Hráči' },
  { href: '/treninky', label: 'Tréninky' },
  { href: '/zapasy', label: 'Zápasy' },
  { href: '/platby', label: 'Platby' },
]

/**
 * Veřejná část dostane hlavičku, navigaci a sloupec obsahu; /admin/* si
 * chrome řeší vlastním layoutem, aby se plocha --ink-raised mohla táhnout
 * přes celou šířku.
 *
 * Odkaz na administraci je v hlavičce, ne v liště: hráčů je dvaadvacet a
 * organizátor jeden, takže by neměl ukousnout pětinu navigace všem ostatním.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return <>{children}</>

  return (
    <>
      <div className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4">
          <Link href="/" className="display flex min-h-11 items-center text-body text-chalk">
            Volejbal
          </Link>
          <Link
            href="/admin"
            className="flex min-h-11 items-center text-meta text-chalk-dim underline-offset-4 hover:underline"
          >
            Organizátor
          </Link>
        </div>
      </div>

      <NavBar links={links} label="Hlavní navigace" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-28 sm:pt-8 sm:pb-12">
        {children}
      </main>
    </>
  )
}
