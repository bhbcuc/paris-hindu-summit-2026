// Ordered D1 migration runner for db/migrations/*.sql.
//
// Ledger
// ------
// Applied migrations are recorded in the `d1_migrations` table (the same ledger
// `cf d1 migrations apply` uses). This runner reads that ledger first and only
// sends statements for files it does not list, so a migration is never applied
// twice: re-running it, or re-running after a partial failure, is safe. Each
// migration file and its ledger row are sent as one D1 batch (a transaction), so
// a failing migration leaves no ledger entry.
//
// Production safety
// -----------------
// AGENTS.md forbids running migrations against production, so this script
// hard-fails on the production database id or name (summit-db /
// b9d39325-...) before it reads or writes anything, mirroring
// scripts/refuse-production-seed.mjs. Nothing is applied without an explicit
// --yes. File names must stay zero-padded (0001_init.sql) so lexical order is
// also apply order.
//
// Usage:
//   node scripts/d1-migrate.mjs                                   # plan only
//   node scripts/d1-migrate.mjs --yes                             # apply to dev
//   bun run db:migrate:dev --yes
//   node scripts/d1-migrate.mjs --guarded --yes                   # pre/post fingerprints
//   bun run db:migrate:guarded --yes
//
// Exit codes: 0 = nothing pending or applied cleanly, 1 = refusal or apply
// failure, 2 = bad usage.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { LEDGER_TABLE, compareBaselines, fingerprintDatabase } from "./d1-fingerprint.mjs"
import {
  UUID,
  cfQuery,
  cfQuerySets,
  parseFlags,
  quoteIdentifier,
  quoteLiteral,
  refuse,
  refuseProductionDatabase,
  resolveTarget,
  stripSqlComments,
} from "./d1-target.mjs"

const MIGRATION_FILE = /^\d[\d_]*[^/]*\.sql$/

// Matches the ledger `cf d1 migrations apply` creates, so this runner and the
// cf CLI agree on the table definition.
const LEDGER_DDL = `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(LEDGER_TABLE)}(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`

const migrationFiles = (dir) =>
  readdirSync(dir)
    .filter((name) => MIGRATION_FILE.test(name))
    .sort()

// A ledger read that cannot distinguish "missing table" from "query failed"
// would let a broken CLI session fall through to CREATE TABLE + apply, so the
// existence check is a plain SELECT on sqlite_master and any failure propagates.
const ledgerExists = async (databaseId) => {
  const rows = cfQuery(
    databaseId,
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${quoteLiteral(LEDGER_TABLE)}`
  )
  return rows.length > 0
}

const appliedMigrations = async (databaseId) => {
  if (!(await ledgerExists(databaseId))) return []
  return cfQuery(databaseId, `SELECT name FROM ${quoteIdentifier(LEDGER_TABLE)} ORDER BY name`).map(
    (row) => row.name
  )
}

// One transactional batch per migration: file contents then the ledger row.
// Comments are stripped first: `cf d1 query --sql` rejects payloads that
// contain `--` or `/* */` comments, while quoted text passes through.
const applyMigration = async (databaseId, dir, name) => {
  const contents = stripSqlComments(readFileSync(join(dir, name), "utf8").replaceAll("\r\n", "\n")).trim()
  const sql = `${contents}\nINSERT INTO ${quoteIdentifier(LEDGER_TABLE)} (name) VALUES (${quoteLiteral(name)});\n`
  cfQuerySets(databaseId, sql)
}

const writeFingerprint = (dir, label, baseline) => {
  const target = resolve(join(String(dir), `${label}.json`))
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(baseline, null, 2)}\n`, "utf8")
  console.log(`Fingerprint written: ${target}`)
}

const printFingerprint = (label, baseline) => {
  console.log(`Fingerprint (${label}): digest ${baseline.digest}, ${Object.keys(baseline.tables).length} tables`)
  for (const [table, value] of Object.entries(baseline.tables)) {
    console.log(`  ${table} rows=${value.rows} sha256=${(value.sha256 ?? "counts-only").slice(0, 16)}`)
  }
  if (baseline.ledger) console.log(`  ledger: ${baseline.ledger.rows} (${baseline.ledger.names.join(", ")})`)
}

const usage = () => {
  console.log(`Usage: node scripts/d1-migrate.mjs [options]

  --dir <path>             Migration directory (default db/migrations)
  --target dev|prod        Resolve the database from the worker bindings (default dev)
  --db <uuid>              D1 database UUID; production is refused
  --yes                    Apply the pending migrations (otherwise plan only)
  --guarded                Require --yes and fingerprint content before and after
  --fingerprint-out <dir>  Write the pre/post fingerprint JSON files to this directory
  --help                   Show this message`)
}

const main = async () => {
  const { flags } = parseFlags(process.argv.slice(2))
  if (flags.help) {
    usage()
    return
  }

  const target = resolveTarget(flags.target ?? "dev")
  if (!target) refuse("--target must be dev or prod", 2)

  let databaseId = target.databaseId
  if (flags.db !== undefined && flags.db !== true) {
    databaseId = String(flags.db)
    if (!UUID.test(databaseId)) {
      refuse(`--db must be a D1 database UUID (names and bindings are rejected by cf d1 query), got ${databaseId}`, 2)
    }
  }
  // Production migrations are forbidden outright; this runs before any query.
  refuseProductionDatabase(databaseId)

  const dir = resolve(String(flags.dir ?? "db/migrations"))
  if (!existsSync(dir)) refuse(`No migration directory at ${dir}`, 2)

  const yes = flags.yes === true
  const guarded = flags.guarded === true
  if (guarded && !yes) {
    refuse("Guarded migrations require --yes: nothing was read from or written to the database.", 1)
  }

  const files = migrationFiles(dir)
  if (files.length === 0) {
    console.log(`No migrations in ${dir}; nothing to do.`)
    return
  }

  const applied = await appliedMigrations(databaseId)
  const pending = files.filter((name) => !applied.includes(name))
  const orphaned = applied.filter((name) => !files.includes(name))

  const label =
    databaseId === target.databaseId ? `${target.databaseName} [${target.target}]` : `${databaseId} [custom]`
  console.log(`Target: ${label}`)
  console.log(`Migrations: ${dir} (${files.length} files, ledger ${LEDGER_TABLE})`)
  console.log(`Applied: ${applied.length}${applied.length ? ` (${applied.join(", ")})` : ""}`)
  if (orphaned.length > 0) {
    console.log(`WARNING: ledger rows with no matching file: ${orphaned.join(", ")}`)
  }
  console.log(`Pending: ${pending.length}${pending.length ? ` (${pending.join(", ")})` : ""}`)

  if (pending.length === 0) {
    console.log("Nothing pending; the ledger is up to date.")
    return
  }

  if (!yes) {
    console.log(`Nothing applied. Re-run with --yes to apply ${pending.length} migration(s).`)
    return
  }

  const fingerprintOut = flags["fingerprint-out"] === undefined ? null : String(flags["fingerprint-out"])
  let before = null
  if (guarded) {
    console.log(`Taking a pre-migration content fingerprint of ${databaseId}...`)
    before = await fingerprintDatabase(databaseId, { target: target.target })
    printFingerprint("before", before)
    if (fingerprintOut) writeFingerprint(fingerprintOut, "before", before)
  }

  if (!(await ledgerExists(databaseId))) {
    console.log(`Creating the ${LEDGER_TABLE} ledger table...`)
    cfQuerySets(databaseId, LEDGER_DDL)
  }

  for (const name of pending) {
    console.log(`Applying ${name}...`)
    try {
      await applyMigration(databaseId, dir, name)
    } catch (error) {
      refuse(`Migration ${name} failed: ${error.message}`, 1)
    }
    const recorded = await appliedMigrations(databaseId)
    if (!recorded.includes(name)) {
      refuse(`Migration ${name} reported success but ${LEDGER_TABLE} has no row for it; stop and inspect the database.`, 1)
    }
    console.log(`Applied ${name} (recorded in ${LEDGER_TABLE})`)
  }

  console.log(`${pending.length} migration(s) applied to ${databaseId}. Ledger: ${(await appliedMigrations(databaseId)).join(", ")}`)

  if (!guarded) return

  const after = await fingerprintDatabase(databaseId, { target: target.target })
  printFingerprint("after", after)
  if (fingerprintOut) writeFingerprint(fingerprintOut, "after", after)

  const drift = compareBaselines(before, after)
  if (drift.length === 0) {
    console.log("Content fingerprint unchanged by this migration.")
    return
  }
  console.log(`Content fingerprint changed in ${drift.length} place(s); review each before the release gate:`)
  for (const change of drift) {
    console.log(`  ${change.table}: ${change.change}`)
  }
}

try {
  await main()
} catch (error) {
  refuse(error instanceof Error ? error.message : String(error), 1)
}