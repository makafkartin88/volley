import {
  archivePlayer, createPlayer, restorePlayer, updatePlayer,
} from '@/actions/players'

type Player = {
  id: number
  name: string
  contact: string | null
  archivedAt: Date | null
}

const inputClass =
  'mt-1 w-full border border-chalk-dim bg-transparent px-3 py-2 text-body text-chalk'

/** Kádr pro zápis docházky a vyúčtování. */
export function PlayersSection({ players }: { players: Player[] }) {
  const active = players.filter((p) => p.archivedAt === null)
  const archived = players.filter((p) => p.archivedAt !== null)

  return (
    <div className="flex flex-col gap-6">
      <form action={createPlayer} className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Jméno</span>
            <input type="text" name="name" required maxLength={60} className={inputClass} />
          </label>
          <label className="flex-1">
            <span className="text-meta text-chalk-dim">Kontakt</span>
            <input type="text" name="contact" maxLength={100} className={inputClass} />
          </label>
        </div>
        <button type="submit" className="btn-quiet self-start">
          Přidat hráče
        </button>
      </form>

      <section className="flex flex-col">
        {active.length === 0 && (
          <p className="measure py-4 text-chalk-dim">
            Zatím žádný hráč. Přidej první jméno a můžeš zapisovat docházku.
          </p>
        )}
        {active.map((player) => (
          <details key={player.id}>
            <summary className="row min-h-11 cursor-pointer list-none">
              <span className="flex flex-col">
                <span className="text-body text-chalk">{player.name}</span>
                {player.contact && (
                  <span className="text-meta text-chalk-dim">{player.contact}</span>
                )}
              </span>
              <span className="text-meta text-chalk-dim">Upravit</span>
            </summary>
            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end">
              <form action={updatePlayer} className="flex flex-1 flex-col gap-3 sm:flex-row">
                <input type="hidden" name="id" value={player.id} />
                <label className="flex-1">
                  <span className="text-meta text-chalk-dim">Jméno</span>
                  <input
                    type="text"
                    name="name"
                    required
                    maxLength={60}
                    defaultValue={player.name}
                    className={inputClass}
                  />
                </label>
                <label className="flex-1">
                  <span className="text-meta text-chalk-dim">Kontakt</span>
                  <input
                    type="text"
                    name="contact"
                    maxLength={100}
                    defaultValue={player.contact ?? ''}
                    className={inputClass}
                  />
                </label>
                <button type="submit" className="btn-quiet self-start sm:self-auto">
                  Uložit
                </button>
              </form>
              <form action={archivePlayer}>
                <input type="hidden" name="id" value={player.id} />
                <button type="submit" className="btn-quiet">
                  Archivovat
                </button>
              </form>
            </div>
          </details>
        ))}
      </section>

      <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-meta text-chalk-dim">
          Archivovaní ({archived.length})
        </summary>
        <section className="mt-3 flex flex-col">
          {archived.length === 0 && (
            <p className="text-meta text-chalk-dim">Nikdo není archivovaný.</p>
          )}
          {archived.map((player) => (
            <div key={player.id} className="row">
              <span className="flex flex-col">
                <span className="text-body text-chalk">{player.name}</span>
                {player.contact && (
                  <span className="text-meta text-chalk-dim">{player.contact}</span>
                )}
              </span>
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
