import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '@/db/schema'

function createDb() {
  const url = process.env.DATABASE_URL || ''
  if (!url || url.includes('placeholder')) {
    // Return a dummy client during build static evaluation if DATABASE_URL is not set
    const dummySql = neon('postgresql://placeholder:placeholder@localhost/placeholder')
    return drizzle(dummySql, { schema })
  }
  const sql = neon(url)
  return drizzle(sql, { schema })
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = createDb()
    const value = (instance as any)[prop]
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
