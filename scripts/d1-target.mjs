// Shared data-safety helpers for the D1/R2 scripts.
//
// cloudflare.config.ts binds production resources (summit-db / summit-assets)
// separately from the isolated development ones (summit-db-dev /
// summit-assets-dev) so branch work never reaches live content. AGENTS.md
// forbids seeding, repairing, or migrating production, so every write path in
// scripts/ refuses production identifiers *before* it writes a file, emits a
// statement, or applies SQL. This is the same rule
// scripts/refuse-production-seed.mjs applies to Convex seeding.
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

export const PRODUCTION = {
  databaseId: "b9d39325-0be9-4e4b-a935-2d39b6f6512b",
  databaseName: "summit-db",
  bucket: "summit-assets",
}

export const DEVELOPMENT = {
  databaseId: "63367dc8-c973-41b2-95ab-a93472fe48a8",
  databaseName: "summit-db-dev",
  bucket: "summit-assets-dev",
}

export const PRODUCTION_REFUSAL = `Refusing to touch production: ${PRODUCTION.databaseName} and ${PRODUCTION.bucket} hold live Admin-owned content that must never be seeded, imported, or migrated from this repository. Use the isolated development resources (${DEVELOPMENT.databaseName} / ${DEVELOPMENT.bucket}).`

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const normalize = (value) => String(value ?? "").trim().toLowerCase()

export const isProductionDatabase = (value) => {
  const candidate = normalize(value)
  return candidate === PRODUCTION.databaseId || candidate === PRODUCTION.databaseName
}

// Only the "-dev" suffix marks an isolated bucket in this project; cf previews
// and development-mode deploys both bind summit-assets-dev.
export const isIsolatedBucket = (value) => normalize(value).endsWith("-dev")

export const resolveTarget = (value = "dev") => {
  const target = normalize(value)
  if (target === "dev" || target === "development") return { target: "dev", ...DEVELOPMENT }
  if (target === "prod" || target === "production") return { target: "prod", ...PRODUCTION }
  return null
}

// Hard failure. Nothing has been written or applied at this point in any of the
// scripts that call this, so exiting here is always safe.
export const refuse = (message, code = 1) => {
  console.error(message)
  process.exit(code)
}

export const refuseProductionDatabase = (value) => {
  if (isProductionDatabase(value)) refuse(PRODUCTION_REFUSAL)
}

export const refuseProductionBucket = (value) => {
  if (normalize(value) === PRODUCTION.bucket) refuse(PRODUCTION_REFUSAL)
}

// Minimal `--key value` / `--flag` parser; keeps the CLI surface identical
// across the data scripts without a dependency.
export const parseFlags = (argv) => {
  const flags = {}
  const positional = []
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (!arg.startsWith("--")) {
      positional.push(arg)
      continue
    }
    const separator = arg.indexOf("=")
    if (separator !== -1) {
      flags[arg.slice(2, separator)] = arg.slice(separator + 1)
      continue
    }
    const key = arg.slice(2)
    const next = argv[index + 1]
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true
      continue
    }
    flags[key] = next
    index++
  }
  return { flags, positional }
}

// Prefer the repo-local cf binary so `node scripts/<file>.mjs` works without bun,
// and allow CF_BIN to point at a shim when testing the guard paths.
const localCf = () => resolve(process.cwd(), "node_modules/.bin/cf")
const cfBin = () => process.env.CF_BIN ?? (existsSync(localCf()) ? localCf() : "cf")

export const runCf = (args, options = {}) => {
  const result = spawnSync(cfBin(), args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    ...options,
  })
  if (result.error) throw new Error(`cf ${args.join(" ")} failed to start: ${result.error.message}`)
  return result
}

export const parseCfPayload = (stdout) => {
  const text = String(stdout ?? "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .trim()
  if (!text) return []
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error("cf d1 query did not return JSON on stdout")
  }
  return Array.isArray(payload) ? payload : [payload]
}

// `cf d1 query` prints one entry per statement: { results, success, meta }.
// A failed statement still exits 0, so success flags are checked here.
export const cfQuerySets = (databaseId, sql) => {
  const result = runCf(["d1", "query", databaseId, "--sql", sql])
  if (result.status !== 0) {
    const detail = String(result.stderr ?? "").trim().split("\n").slice(0, 4).join(" ")
    throw new Error(`cf d1 query exited ${result.status}${detail ? `: ${detail}` : ""}`)
  }
  const sets = parseCfPayload(result.stdout)
  const failures = sets
    .filter((set) => set && set.success === false)
    .map((set) => JSON.stringify(set.error ?? set))
  if (failures.length > 0) throw new Error(failures.join("\n"))
  return sets
}

// Rows of the single statement in `sql`.
export const cfQuery = (databaseId, sql) => {
  const [set] = cfQuerySets(databaseId, sql)
  if (Array.isArray(set?.results)) return set.results
  return Array.isArray(set) ? set : []
}

export const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`
export const quoteLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`