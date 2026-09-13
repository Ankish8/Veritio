#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";

import {
  containsConcurrentIndex,
  concurrentIndexTarget,
  makeIndexCompatibleWithPartitioning,
  orderMigrationFilenames,
  splitSqlStatements,
} from "./migrate-self-host-utils";

const databaseUrl = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
const appDirectory = join(import.meta.dir, "..");
const schemaPath = join(appDirectory, "supabase", "schema.sql");
const migrationsDirectory = join(appDirectory, "supabase", "migrations");
const dryRun = process.argv.includes("--dry-run");
const statusOnly = process.argv.includes("--status");
const BASELINE = "__baseline_schema.sql";
const LOCK_ID = 8_675_309_021;

if (!databaseUrl) {
  console.error("DATABASE_DIRECT_URL or DATABASE_URL is required.");
  process.exit(1);
}

function checksum(contents: string) {
  return createHash("sha256").update(contents).digest("hex");
}

async function tableExists(client: Client, table: string) {
  const result = await client.query<{ exists: boolean }>(
    "select to_regclass($1) is not null as exists",
    [`public.${table}`],
  );
  return result.rows[0]?.exists === true;
}

async function applyTransactional(
  client: Client,
  sql: string,
  filename: string,
  digest: string,
) {
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query(
      `insert into veritio_internal.schema_migrations (filename, checksum)
       values ($1, $2)`,
      [filename, digest],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
    await client.query("create schema if not exists veritio_internal");
    await client.query(`
      create table if not exists veritio_internal.schema_migrations (
        filename text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `);

    const appliedResult = await client.query<{
      filename: string;
      checksum: string;
    }>(
      "select filename, checksum from veritio_internal.schema_migrations order by filename",
    );
    const applied = new Map(
      appliedResult.rows.map((row) => [row.filename, row.checksum]),
    );
    const schema = await readFile(schemaPath, "utf8");

    if (!applied.has(BASELINE)) {
      if (await tableExists(client, "projects")) {
        throw new Error(
          "This database already contains Veritio tables but has no migration ledger. " +
            "Do not replay clean-install migrations. Back up the database and follow the existing-install upgrade procedure.",
        );
      }
      if (dryRun || statusOnly) {
        console.log(`[pending] ${BASELINE}`);
      } else {
        console.log(`[apply] ${BASELINE}`);
        await applyTransactional(client, schema, BASELINE, checksum(schema));
      }
    } else if (applied.get(BASELINE) !== checksum(schema)) {
      throw new Error(
        `${BASELINE} changed after it was applied; refusing to continue.`,
      );
    }

    const filenames = orderMigrationFilenames(
      (await readdir(migrationsDirectory)).filter((filename) =>
        filename.endsWith(".sql"),
      ),
    );

    let pending = 0;
    for (const filename of filenames) {
      const path = join(migrationsDirectory, filename);
      const sql = await readFile(path, "utf8");
      const digest = checksum(sql);
      const recorded = applied.get(filename);

      if (recorded) {
        if (recorded !== digest) {
          throw new Error(
            `${filename} changed after it was applied; refusing to continue.`,
          );
        }
        continue;
      }

      pending += 1;
      if (dryRun || statusOnly) {
        console.log(`[pending] ${filename}`);
        continue;
      }

      console.log(`[apply] ${filename}`);
      if (containsConcurrentIndex(sql)) {
        // PostgreSQL forbids CONCURRENTLY inside a transaction. The migration
        // files using it are written to be retryable; execute each command as
        // its own query because a multi-command query is an implicit transaction.
        for (const statement of splitSqlStatements(sql)) {
          const target = concurrentIndexTarget(statement);
          let partitioned = false;
          if (target) {
            const result = await client.query<{ partitioned: boolean }>(
              `select exists (
                 select 1 from pg_partitioned_table
                 where partrelid = to_regclass($1)
               ) as partitioned`,
              [target.replaceAll('"', "")],
            );
            partitioned = result.rows[0]?.partitioned === true;
          }
          await client.query(
            makeIndexCompatibleWithPartitioning(statement, partitioned),
          );
        }
        await client.query(
          `insert into veritio_internal.schema_migrations (filename, checksum)
           values ($1, $2)`,
          [filename, digest],
        );
      } else {
        await applyTransactional(client, sql, filename, digest);
      }
    }

    if (statusOnly || dryRun) {
      console.log(
        pending === 0
          ? "Database schema is current."
          : `${pending} migration(s) pending.`,
      );
    } else {
      console.log(
        `Database schema is current (${filenames.length} migrations).`,
      );
    }
  } catch (error) {
    console.error(
      `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  } finally {
    await client
      .query("select pg_advisory_unlock($1)", [LOCK_ID])
      .catch(() => undefined);
    await client.end();
  }
}

await main();
