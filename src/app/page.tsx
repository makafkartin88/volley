import Link from 'next/link'

/** „20. 9.“ — hero je krátký, rok do něj nepatří. */
const shortDate = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' })

/** Nejbližší neděle (dnešek, pokud je neděle) — trénink je vždy v neděli. */
function nextSunday(from = new Date()): Date {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7))
  return date
}

// „Nejbližší neděle“ se počítá z aktuálního času, ne z času buildu.
export const dynamic = 'force-dynamic'

// Přehled zatím nemá z čeho číst — tréninky a dluhy přibydou s dotazy do DB.
// Hero, zápis pod ním a prázdný stav už drží cílovou podobu obrazovky.
export default function Home() {
  const sunday = nextSunday()

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-object bg-ink-raised px-5 py-6">
        <p className="text-meta text-chalk-dim">Nejbližší trénink</p>
        <p className="display mt-2 text-hero leading-none text-chalk">
          {shortDate.format(sunday)}
        </p>
        <p className="mt-3 text-meta text-chalk-dim">Neděle 18:30, zatím nikdo přihlášen.</p>
      </section>

      <section>
        <h2 className="display border-b border-rule pb-3 text-title">Poslední tréninky</h2>
        <p className="measure py-4 text-chalk-dim">Zatím žádný trénink. Založ první.</p>
        <Link href="/admin/treninky" className="btn-primary w-full sm:w-auto">
          Založit trénink
        </Link>
      </section>
    </div>
  )
}
