import 'server-only'
import pg from 'pg'

const isProduction = process.env.NODE_ENV === 'production'

const parsePoolSize = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const poolConfig = {
  connectionString: process.env.DATABASE_URL!,
  min: parsePoolSize(process.env.DB_POOL_MIN, isProduction ? 2 : 1),
  max: parsePoolSize(process.env.DB_POOL_MAX, isProduction ? 10 : 5),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  maxUses: 7500,
  allowExitOnIdle: true,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPool(): any {
  if (!pool) {
    pool = new pg.Pool(poolConfig)
    pool.on('error', (err: Error) => {
      console.error('[DB Pool] Unexpected error on idle client', err)
    })
  }

  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
