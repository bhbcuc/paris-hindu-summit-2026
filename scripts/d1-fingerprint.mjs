// Read-only content fingerprint for a D1 database.
//
// AGENTS.md requires that production content-table fingerprints stay unchanged
// across releases, and that development work never rewrites live content. This
// script makes both checkable:
//
//   * per-table row counts for every real table, plus a SHA-256 over the
//     ordered row dump of every content table (the migration ledger is reported
//     but excluded from the comparison);
//   * `--baseline <file>` compares a live fingerprint against a stored one and
//     exits non-zero on any drift (added, removed, or changed table).
//
// It only ever sends SELECT statements to D1 (asserted per statement below) and
// shells out to `cf d1 query`. It never writes to D1 and never runs a migration.
//
// Usage:
//   node scripts/d1-fingerprint.mjs                        # dev baseline on stdout
//   node scripts/d1-fingerprint.mjs --out <file>           # dev baseline to a file
//   node scripts/d1-fingerprint.mjs --baseline <file>      # compare, exit 1 on drift
//   node scripts/d1-fingerprint.mjs --target prod --allow-production --baseline <file>
//
// Exit codes: 0 = fingerprint written or no drift, 1 = drift, 2 = bad usage or
// query failure.
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import {
  DEVELOPMENT,
  UUID,
  cfQuery,
  isProductionDatabase,
  parseFlags,
  quoteIdentifier,
  refuse,
  resolveTarget,
} from "./d1-target.mjs"

export const LEDGER_TABLE = "d1_migrations"
export const DEFAULT_MAX_ROWS = 50000

// A write keyword anywhere in the statement is refused, not just after the
// first semicolon, so a smuggled second statement cannot slip through.
const FORBIDDEN =
  /\b(?:insert|update|delete|drop|alter|create|replace|truncate|attach|detach|vacuum|pragma|reindex|begin|commit|rollback|savepoint|release|analyze)\b/i

// Structural guarantee that this tool cannot write to D1. Exported so the guard
// itself can be exercised without a database.
export const assertSelect = (sql) => {
  const statement = sql.trim()
  // Quoted text and comments are removed first so a column named "order" or a
  // comment mentioning "delete" is not mistaken for a write.
  const bare = statement
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""')
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
  if (!/^select\b/i.test(bare) || FORBIDDEN.test(bare)) {
    throw new Error(`refusing non-SELECT statement: ${statement.slice(0, 60)}`)
  }
  return statement
}

const select = async (databaseId, sql) => cfQuery(databaseId, assertSelect(sql))

export const contentTables = async (databaseId) => {
  const tables = await tableSchema(databaseId)
  return tables.map(([name]) => name).filter((name) => name !== LEDGER_TABLE)
}

// Table names plus their column list, in one round trip.
const tableSchema = async (databaseId) => {
  const rows = await select(
    databaseId,
    "SELECT m.name AS tbl, p.cid AS cid, p.name AS col FROM sqlite_master AS m JOIN pragma_table_info(m.name) AS p WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%' AND m.name NOT LIKE '_cf_%' ORDER BY m.name, p.cid"
  )
  const tables = new Map()
  for (const row of rows) {
    const columns = tables.get(row.tbl) ?? []
    columns.push(row.col)
    tables.set(row.tbl, columns)
  }
  return [...tables.entries()]
}

// Hash the column list plus every row as an ordered JSON array, so a schema
// change (dropped column) or a value change both move the digest.
const digest = (columns, rows) => {
  const hash = createHash("sha256")
  hash.update(`columns=${columns.join(",")}\n`)
  for (const row of rows) {
    hash.update(`${JSON.stringify(columns.map((column) => (column in row ? row[column] : null)))}\n`)
  }
  return hash.digest("hex")
}

// Canonical single-value summary of the whole table map, so an unchanged
// database is visible at a glance in release checks.
export const fingerprintDigest = (tables) => {
  const canonical = Object.keys(tables)
    .sort()
    .map((table) => `${table}=${tables[table].rows}:${tables[table].sha256 ?? "counts"}`)
    .join("\n")
  return createHash("sha256").update(canonical).digest("hex")
}

export const ledgerNames = async (databaseId) => {
  try {
    const rows = await select(databaseId, `SELECT name FROM ${quoteIdentifier(LEDGER_TABLE)} ORDER BY name`)
    return rows.map((row) => row.name)
  } catch {
    return null
  }
}

// Window-function total so one round trip per table returns both the row count
// and the ordered dump. LIMIT keeps an oversized table from being downloaded;
// a full table always trips the guard rather than producing a partial hash.
const TOTAL_COLUMN = "__fp_total"

export const fingerprintDatabase = async (
  databaseId,
  {
    countsOnly = false,
    maxRows = DEFAULT_MAX_ROWS,
    target = DEVELOPMENT.databaseId === databaseId ? "dev" : "custom",
  } = {}
) => {
  const schema = (await tableSchema(databaseId)).filter(
    ([name, columns]) => name !== LEDGER_TABLE && !columns.includes(TOTAL_COLUMN)
  )
  const tables = {}

  for (const [name, columns] of schema) {
    if (countsOnly) {
      const counted = await select(databaseId, `SELECT COUNT(*) AS rows FROM ${quoteIdentifier(name)}`)
      tables[name] = { rows: Number(counted[0]?.rows ?? 0), sha256: null }
      continue
    }
    const ordered = columns.map(quoteIdentifier).join(", ")
    const dump = await select(
      databaseId,
      `SELECT COUNT(*) OVER () AS ${quoteIdentifier(TOTAL_COLUMN)}, * FROM ${quoteIdentifier(name)} ORDER BY ${ordered} LIMIT ${maxRows + 1}`
    )
    if (dump.length > maxRows) {
      throw new Error(
        `${name} has more than ${maxRows} rows; raise --max-rows instead of hashing a partial dump (a partial hash can hide drift)`
      )
    }
    const rows = dump.length === 0 ? 0 : Number(dump[0][TOTAL_COLUMN])
    // The helper column is dropped before hashing so only real columns count.
    const dumped = dump.map((row) =>
      Object.fromEntries(columns.filter((column) => column in row).map((column) => [column, row[column]]))
    )
    tables[name] = { rows, sha256: digest(columns, dumped) }
  }

  const ledger = await ledgerNames(databaseId)
  return {
    tool: "scripts/d1-fingerprint.mjs",
    format: 1,
    mode: countsOnly ? "counts" : "full",
    generatedAt: new Date().toISOString(),
    database: { id: databaseId, target },
    digest: fingerprintDigest(tables),
    tables,
    ledger: ledger ? { rows: ledger.length, names: ledger } : null,
  }
}

export const compareBaselines = (baseline, current) => {
  const drift = []
  for (const [table, value] of Object.entries(current.tables)) {
    const before = baseline.tables?.[table]
    if (!before) {
      drift.push({ table, change: "added", rows: value.rows })
      continue
    }
    if (Number(before.rows) !== Number(value.rows)) {
      drift.push({ table, change: "rows", from: before.rows, to: value.rows })
    }
    if ((before.sha256 ?? null) !== (value.sha256 ?? null)) {
      drift.push({ table, change: "content", from: before.sha256 ?? "counts-only", to: value.sha256 ?? "counts-only" })
    }
  }
  for (const table of Object.keys(baseline.tables ?? {})) {
    if (!current.tables[table]) drift.push({ table, change: "removed" })
  }
  return drift
}

const usage = () => {
  console.log(`Usage: node scripts/d1-fingerprint.mjs [options]

  --db <uuid>              D1 database UUID (default: ${DEVELOPMENT.databaseName})
  --target dev|prod        Resolve the database from the worker bindings (default dev)
  --allow-production       Required to fingerprint the production database (read-only)
  --baseline <file>        Compare against a stored fingerprint; exit 1 on drift
  --out <file>             Write the fingerprint JSON to a file (also printed)
  --counts-only            Row counts only, skip row-dump hashes
  --max-rows <n>           Fail instead of hashing tables above n rows (default ${DEFAULT_MAX_ROWS})
  --help                   Show this message`)
}

const readBaseline = (path) => {
  try {
    return readFileSync(path, "utf8")
  } catch (error) {
    refuse(`Cannot read baseline ${path}: ${error.message}`, 2)
  }
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

  if (isProductionDatabase(databaseId)) {
    if (!flags["allow-production"]) {
      refuse(
        "Refusing to fingerprint production without --allow-production: this tool only sends SELECT statements, but production reads must be requested explicitly.",
        2
      )
    }
    console.warn(
      `READ-ONLY production fingerprint of ${databaseId}. No statements are written; do not run migrations, seeds, or repairs against this database.`
    )
  }

  const maxRows = flags["max-rows"] === undefined ? DEFAULT_MAX_ROWS : Number(flags["max-rows"])
  if (!Number.isInteger(maxRows) || maxRows < 1) refuse("--max-rows must be a positive integer", 2)

  const baseline = await fingerprintDatabase(databaseId, {
    countsOnly: flags["counts-only"] === true,
    maxRows,
    target: target.target,
  })

  if (flags.out && flags.out !== true) {
    const out = resolve(String(flags.out))
    writeFileSync(out, `${JSON.stringify(baseline, null, 2)}\n`, "utf8")
    console.log(`Fingerprint written: ${out}`)
  }

  const totalRows = Object.values(baseline.tables).reduce((sum, table) => sum + Number(table.rows), 0)

  if (!flags.baseline || flags.baseline === true) {
    console.log(JSON.stringify(baseline, null, 2))
    console.log(
      `${Object.keys(baseline.tables).length} content tables, ${totalRows} rows, digest ${baseline.digest}`
    )
    return
  }

  const stored = JSON.parse(readBaseline(String(flags.baseline)))
  if (stored.mode !== baseline.mode) {
    refuse(`baseline was taken in "${stored.mode}" mode but this run is "${baseline.mode}"; take a matching baseline`, 2)
  }
  if (stored.database?.id !== baseline.database.id) {
    refuse(
      `baseline was taken against ${stored.database?.id} but this run reads ${baseline.database.id}; compare like with like`,
      2
    )
  }

  const drift = compareBaselines(stored, baseline)
  if (drift.length === 0) {
    console.log(
      `No drift: ${Object.keys(baseline.tables).length} content tables, ${totalRows} rows, digest ${baseline.digest}`
    )
    return
  }

  console.error(`DRIFT: ${drift.length} difference(s) against ${flags.baseline}`)
  for (const change of drift) {
    const detail =
      change.change === "rows"
        ? `rows ${change.from} -> ${change.to}`
        : change.change === "content"
          ? `content ${change.from} -> ${change.to}`
          : change.change === "added"
            ? `new table with ${change.rows} rows`
            : "table no longer exists"
    console.error(`  ${change.table}: ${detail}`)
  }
  process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}