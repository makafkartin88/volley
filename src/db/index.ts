import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('Chybí proměnná DATABASE_URL')
}

export const db = drizzle(neon(process.env.DATABASE_URL), { schema })
export { schema }
