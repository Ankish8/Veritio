#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";

const migrations = [
  {
    version: "20260730000000",
    name: "add_better_auth_apikey_table",
  },
  {
    version: "20260730010000",
    name: "add_better_auth_mcp_oauth_tables",
  },
] as const;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is not set. Run with --env-file=.env.local");

const apply = process.argv.includes("--apply");
const client = new Client({ connectionString: databaseUrl });
await client.connect();

async function inspect() {
  const [versions, tables, requiredColumns, indexes, policies, rls] =
    await Promise.all([
      client.query(
        `SELECT version
         FROM supabase_migrations.schema_migrations
        WHERE version = ANY($1::text[])
        ORDER BY version`,
        [migrations.map((migration) => migration.version)],
      ),
      client.query(
        `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name`,
        [["apikey", "oauthApplication", "oauthAccessToken", "oauthConsent"]],
      ),
      client.query(
        `SELECT table_name, column_name, is_nullable
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (table_name, column_name) IN (
            ('apikey', 'key'),
            ('apikey', 'userId'),
            ('oauthApplication', 'clientId'),
            ('oauthApplication', 'redirectUrls'),
            ('oauthApplication', 'type'),
            ('oauthAccessToken', 'accessToken'),
            ('oauthAccessToken', 'refreshToken'),
            ('oauthAccessToken', 'accessTokenExpiresAt'),
            ('oauthAccessToken', 'refreshTokenExpiresAt'),
            ('oauthAccessToken', 'clientId'),
            ('oauthAccessToken', 'scopes'),
            ('oauthConsent', 'clientId'),
            ('oauthConsent', 'userId'),
            ('oauthConsent', 'scopes')
          )
        ORDER BY table_name, column_name`,
      ),
      client.query(
        `SELECT c.relname AS index_name, i.indisunique AS is_unique
         FROM pg_index i
         JOIN pg_class c ON c.oid = i.indexrelid
        WHERE c.relname = ANY($1::text[])
        ORDER BY c.relname`,
        [
          [
            "idx_apikey_key",
            "idx_apikey_user_id",
            "idx_oauthAccessToken_accessToken",
            "idx_oauthAccessToken_refreshToken",
            "idx_oauthConsent_clientId",
            "idx_oauthConsent_userId",
          ],
        ],
      ),
      client.query(
        `SELECT tablename, policyname
         FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY($1::text[])
        ORDER BY tablename`,
        [["apikey", "oauthApplication", "oauthAccessToken", "oauthConsent"]],
      ),
      client.query(
        `SELECT c.relname AS table_name, c.relrowsecurity AS enabled
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = ANY($1::text[])
        ORDER BY c.relname`,
        [["apikey", "oauthApplication", "oauthAccessToken", "oauthConsent"]],
      ),
    ]);

  const state = {
    migrationVersions: versions.rows.map((row) => row.version),
    tables: tables.rows.map((row) => row.table_name),
    requiredColumnsNotNull: requiredColumns.rows.every(
      (row) => row.is_nullable === "NO",
    ),
    indexes: indexes.rows,
    policies: policies.rowCount,
    rlsEnabled: rls.rows.length === 4 && rls.rows.every((row) => row.enabled),
  };
  console.log(JSON.stringify(state, null, 2));

  return (
    state.migrationVersions.length === migrations.length &&
    state.tables.length === 4 &&
    requiredColumns.rows.length === 14 &&
    state.requiredColumnsNotNull &&
    state.indexes.length === 6 &&
    state.policies === 4 &&
    state.rlsEnabled
  );
}

try {
  if (apply) {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "veritio:mcp-auth-migrations",
    ]);

    for (const migration of migrations) {
      const exists = await client.query(
        "SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = $1",
        [migration.version],
      );
      if (exists.rowCount) {
        console.log(`Already recorded: ${migration.version}`);
        continue;
      }

      const path = join(
        import.meta.dir,
        "..",
        "supabase",
        "migrations",
        `${migration.version}_${migration.name}.sql`,
      );
      const sql = await readFile(path, "utf8");
      await client.query(sql);
      await client.query(
        `INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
         VALUES ($1, $2::text[], $3)`,
        [migration.version, [sql], migration.name],
      );
      console.log(`Applied: ${migration.version}`);
    }

    await client.query("COMMIT");
  }

  const valid = await inspect();
  if (!valid) {
    if (!apply)
      console.error(
        "Schema is not ready. Re-run with --apply after reviewing the target.",
      );
    process.exitCode = 1;
  }
} catch (error) {
  if (apply) await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
