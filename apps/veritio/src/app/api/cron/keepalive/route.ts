import 'server-only'
import { Client } from 'pg'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: 'DATABASE_URL not set' }, { status: 500 })
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  })

  try {
    await client.connect()
    const result = await client.query('SELECT 1 as ok')
    return Response.json({
      ok: true,
      at: new Date().toISOString(),
      result: result.rows[0],
    })
  } catch (err) {
    console.error('[cron/keepalive] DB error', err)
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await client.end().catch(() => {})
  }
}
