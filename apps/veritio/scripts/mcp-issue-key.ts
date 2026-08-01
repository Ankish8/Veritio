#!/usr/bin/env bun
/**
 * Issue a Veritio MCP API key.
 *
 * Usage:
 *   bun --env-file=.env.local scripts/mcp-issue-key.ts <userId> [name] [scope,scope,...]
 *   bun --env-file=.env.local scripts/mcp-issue-key.ts --revoke <keyId>
 *   bun --env-file=.env.local scripts/mcp-issue-key.ts --list <userId>
 *
 * Scopes default to full access. Pass an explicit list for a narrower key,
 * e.g. `studies:read,results:read` for an analysis-only credential.
 *
 * The raw key is printed once and is not recoverable — only its hash is stored.
 *
 * This writes the `apikey` row directly rather than going through
 * `auth.api.createApiKey`, because the auth instance imports `server-only` and
 * so cannot be loaded outside a Next.js build. It uses better-auth's own
 * `defaultKeyHasher`, so the resulting rows are byte-identical to ones the
 * plugin would have created.
 */

import { randomBytes, randomUUID } from 'node:crypto'
import { Client } from 'pg'
import { defaultKeyHasher } from 'better-auth/plugins'
import { MCP_SCOPES, permissionsFromScopes, type McpScope } from '../src/mcp/authz/scopes'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with --env-file=.env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const client = new Client({ connectionString: DATABASE_URL })
await client.connect()

try {
  if (args[0] === '--revoke') {
    const keyId = args[1]
    if (!keyId) throw new Error('Usage: --revoke <keyId>')
    const { rowCount } = await client.query('UPDATE public.apikey SET enabled = false WHERE id = $1', [keyId])
    console.log(rowCount ? `Revoked ${keyId}.` : `No key with id ${keyId}.`)
  } else if (args[0] === '--list') {
    const userId = args[1]
    if (!userId) throw new Error('Usage: --list <userId>')
    const { rows } = await client.query(
      'SELECT id, name, start, enabled, permissions, "createdAt" FROM public.apikey WHERE "userId" = $1 ORDER BY "createdAt" DESC',
      [userId],
    )
    if (rows.length === 0) console.log('No keys.')
    for (const r of rows) {
      console.log(
        `${r.id}  ${r.enabled ? 'active ' : 'revoked'}  ${String(r.start ?? '').padEnd(12)}  ${r.name ?? ''}  ${r.permissions ?? ''}`,
      )
    }
  } else {
    const [userId, name = 'MCP key', scopeArg] = args
    if (!userId) {
      console.error('Usage: bun scripts/mcp-issue-key.ts <userId> [name] [scope,scope,...]')
      console.error(`Scopes: ${MCP_SCOPES.join(', ')}`)
      process.exit(1)
    }

    const scopes = scopeArg ? (scopeArg.split(',').map((s) => s.trim()) as McpScope[]) : [...MCP_SCOPES]
    const unknown = scopes.filter((s) => !MCP_SCOPES.includes(s))
    if (unknown.length > 0) throw new Error(`Unknown scope(s): ${unknown.join(', ')}`)

    const { rows: users } = await client.query('SELECT id FROM public."user" WHERE id = $1', [userId])
    if (users.length === 0) throw new Error(`No user with id ${userId}.`)

    // 32 random bytes, base64url, behind the prefix the resolver looks for.
    const raw = `vrt_${randomBytes(32).toString('base64url')}`
    const hashed = await defaultKeyHasher(raw)
    const id = randomUUID()
    // One year, matching the plugin's configured keyExpiration.
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)

    await client.query(
      `INSERT INTO public.apikey
         (id, name, start, prefix, key, "userId", enabled,
          "rateLimitEnabled", "rateLimitTimeWindow", "rateLimitMax", "requestCount",
          "expiresAt", "createdAt", "updatedAt", permissions)
       VALUES ($1,$2,$3,$4,$5,$6,true,true,$7,$8,0,$9,NOW(),NOW(),$10)`,
      [
        id,
        name,
        raw.slice(0, 12),
        'vrt_',
        hashed,
        userId,
        60_000,
        300,
        expiresAt,
        JSON.stringify(permissionsFromScopes(scopes)),
      ],
    )

    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4001'
    console.log('\nKey issued. Copy it now — it is not recoverable.\n')
    console.log(`  ${raw}\n`)
    console.log(`  id      ${id}`)
    console.log(`  user    ${userId}`)
    console.log(`  scopes  ${scopes.join(', ')}`)
    console.log(`  expires ${expiresAt.toISOString().slice(0, 10)}\n`)
    console.log('Connect Claude Code with:\n')
    console.log(`  claude mcp add --transport http veritio ${base}/mcp \\`)
    console.log(`    --header "Authorization: Bearer ${raw}"\n`)
    console.log(`For an analysis-only connection use ${base}/mcp/readonly instead.\n`)
  }
} finally {
  await client.end()
}
