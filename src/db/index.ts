import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

/**
 * Líný singleton: import tohoto modulu nesmí vyžadovat DATABASE_URL, jinak
 * `next build` selže při sběru dat o stránkách u každé cesty, která db
 * importuje, i když se nic nerenderuje ani nedotazuje. Proměnná se čte a
 * ověřuje až při prvním skutečném přístupu k `db` (tedy až za běhu, v
 * requestu), ne při importu modulu.
 */
type Db = ReturnType<typeof drizzle<typeof schema>>

let cached: Db | undefined

function getDb(): Db {
  if (!cached) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('Chybí proměnná DATABASE_URL')
    }
    cached = drizzle(neon(url), { schema })
  }
  return cached
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})

export { schema }
