import { archivePlayer, createPlayer, restorePlayer } from '@/actions/players'
import { getAllPlayers } from '@/db/queries'
import { PageHeader } from '@/components/PageHeader'

export default async function HraciPage() {
  const allPlayers = await getAllPlayers()
  const active = allPlayers.filter((p) => p.archivedAt === null)
  const archived = allPlayers.filter((p) => p.archivedAt !== null)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Hráči" subtitle="Kádr pro zápis docházky a vyúčtování." />

      <form action={createPlayer} className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Jméno</span>
            <input
              type="text"
              name="name"
              required
              maxLength={60}
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk"
            />
          </label>
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Kontakt</span>
            <input
              type="text"
              name="contact"
              maxLength={100}
              className="mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk"
            />
          </label>
        </div>
        <button type="submit" className="btn-primary self-start">
          Přidat
        </button>
      </form>

      <section className="flex flex-col">
        {active.length === 0 && <p className="text-meta text-chalk-dim">Zatím žádní aktivní hráči.</p>}
        {active.map((player) => (
          <div key={player.id} className="row">
            <div className="flex flex-col">
              <span className="text-body text-chalk">{player.name}</span>
              {player.contact && <span className="text-meta text-chalk-dim">{player.contact}</span>}
            </div>
            <form action={archivePlayer}>
              <input type="hidden" name="id" value={player.id} />
              <button type="submit" className="btn-quiet">
                Archivovat
              </button>
            </form>
          </div>
        ))}
      </section>

      <details className="group">
        <summary className="cursor-pointer text-meta text-chalk-dim">
          Archivovaní ({archived.length})
        </summary>
        <section className="mt-3 flex flex-col">
          {archived.length === 0 && <p className="text-meta text-chalk-dim">Nikdo není archivovaný.</p>}
          {archived.map((player) => (
            <div key={player.id} className="row">
              <div className="flex flex-col">
                <span className="text-body text-chalk">{player.name}</span>
                {player.contact && <span className="text-meta text-chalk-dim">{player.contact}</span>}
              </div>
              <form action={restorePlayer}>
                <input type="hidden" name="id" value={player.id} />
                <button type="submit" className="btn-quiet">
                  Vrátit
                </button>
              </form>
            </div>
          ))}
        </section>
      </details>
    </div>
  )
}
