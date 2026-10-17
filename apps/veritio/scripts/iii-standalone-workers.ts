/**
 * Prepare the iii topology so production starts without the worker registry.
 *
 * `iii compose --up` (iii 0.23) asks api.workers.iii.dev to resolve every
 * package:// container on every start, and rolls the whole topology back when
 * one resolve fails (2026-10-15 outage). start.sh therefore lets Compose run
 * only the engine and launches the registry workers itself, from binaries
 * installed at image build time by scripts/install-iii-workers.sh.
 *
 * worker-compose.yaml stays the single source of truth. This script derives:
 *   1. <out> — the same file without `containers:` (engine + engine workers)
 *   2. config/<config_name>.yaml — each worker's configuration entry, as
 *      Compose would deliver it: the package's default config with the
 *      container's `config_override` merged on top. The engine's fs
 *      configuration adapter loads these before any worker registers.
 *   3. stdout — one `name<TAB>config_name<TAB>binary` line per worker.
 *
 * It fails when an installed worker's version differs from the declared one.
 *
 * Usage: bun scripts/iii-standalone-workers.ts <compose-file> <workers-dir> <out>
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type JsonObject = { [key: string]: Json }

interface Container {
  worker: string
  version: string
  config_name?: string
  config_override?: JsonObject
}

const PLACEHOLDER = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-?([^}]*))?\}/g

const isObject = (value: Json | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Expand `${VAR}`, `${VAR:default}` and `${VAR:-default}` the way Compose does. */
function expandEnv(value: Json): Json {
  if (Array.isArray(value)) return value.map(expandEnv)
  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expandEnv(item)]))
  }
  if (typeof value !== 'string') return value
  const expanded = value.replace(PLACEHOLDER, (_, name: string, fallback?: string) => {
    const env = process.env[name]
    return env !== undefined && env !== '' ? env : (fallback ?? '')
  })
  // A value that is exactly one placeholder takes the type of what it expands
  // to, so `port: ${PORT:4000}` becomes the number the schema expects.
  const whole = value.match(PLACEHOLDER)
  return whole?.length === 1 && whole[0] === value ? (Bun.YAML.parse(expanded) as Json) : expanded
}

/**
 * Compose's configuration precedence: maps merge key by key, arrays and
 * scalars replace, and a mapping whose `name` the override changes is
 * replaced whole (the keys beside `name` belong to the variant it picks).
 */
function mergeConfig(base: Json | undefined, override: Json): Json {
  if (!isObject(base) || !isObject(override)) return override
  if ('name' in override && 'name' in base && override.name !== base.name) return override
  const merged: JsonObject = { ...base }
  for (const [key, value] of Object.entries(override)) {
    merged[key] = mergeConfig(base[key], value)
  }
  return merged
}

function readManifest(binary: string): { name?: string; description?: string; default_config?: Json } {
  const result = Bun.spawnSync([binary, '--manifest'])
  if (result.exitCode !== 0) {
    throw new Error(`${binary} --manifest failed: ${result.stderr.toString().trim()}`)
  }
  return JSON.parse(result.stdout.toString())
}

const [composeArg, workersArg, outArg] = process.argv.slice(2)
if (!composeArg || !workersArg || !outArg) {
  console.error('Usage: bun scripts/iii-standalone-workers.ts <compose-file> <workers-dir> <out>')
  process.exit(2)
}

const composePath = resolve(composeArg)
const workersDir = resolve(workersArg)
const compose = Bun.YAML.parse(readFileSync(composePath, 'utf8')) as {
  engine: { workers?: { configuration?: { adapter?: { name?: string; config?: { directory?: string } } } } }
  containers?: Record<string, Container>
}

const configAdapter = compose.engine.workers?.configuration?.adapter
if (configAdapter?.name !== 'fs' || !configAdapter.config?.directory) {
  throw new Error('worker-compose.yaml must use the fs configuration adapter with a directory')
}
const configDir = resolve(dirname(composePath), configAdapter.config.directory)
mkdirSync(configDir, { recursive: true })

const launches: string[] = []
for (const [key, container] of Object.entries(compose.containers ?? {})) {
  const name = container.worker.split('/').pop()!
  const binary = join(workersDir, name)
  const marker = join(workersDir, `${name}.version`)
  const installed = existsSync(marker) ? readFileSync(marker, 'utf8').split(' ')[0] : 'none'
  if (!existsSync(binary) || installed !== container.version) {
    throw new Error(
      `${key}: worker-compose.yaml declares ${name} ${container.version} but ${workersDir} has ${installed}. ` +
        'Update the pins in scripts/install-iii-workers.sh and reinstall.'
    )
  }

  const configName = container.config_name ?? `default-${key}`
  const configFile = join(configDir, `${configName}.yaml`)
  if (container.config_override) {
    const manifest = readManifest(binary)
    const value = mergeConfig(manifest.default_config ?? {}, expandEnv(container.config_override))
    const entry = {
      id: configName,
      name: manifest.name ?? name,
      description: manifest.description ?? `${name} worker settings`,
      value,
    }
    writeFileSync(configFile, Bun.YAML.stringify(entry, null, 2))
  } else {
    // No override: the worker seeds its own defaults, exactly as under Compose.
    rmSync(configFile, { force: true })
  }
  launches.push([key, configName, binary].join('\t'))
}

const engineOnly = { ...compose }
delete engineOnly.containers
writeFileSync(
  resolve(outArg),
  `# Generated from ${composeArg} by scripts/iii-standalone-workers.ts. Do not edit.\n` +
    Bun.YAML.stringify(engineOnly, null, 2)
)

console.log(launches.join('\n'))
