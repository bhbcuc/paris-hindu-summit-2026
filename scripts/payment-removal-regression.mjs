import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

// Contract for the October 2026 organiser decisions: online payments are gone
// from the Cloudflare stack (bank-transfer info only), and the Expo mail-desk
// app talks to the Hono API instead of Convex. Convex (live Vercel production)
// is intentionally untouched and therefore excluded from every negative check.
const ROOT = new URL("..", import.meta.url).pathname

const listFiles = (dir, extensions) => {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === ".expo") continue
      found.push(...listFiles(path, extensions))
    } else if (extensions.some((extension) => entry.endsWith(extension))) {
      found.push(path)
    }
  }
  return found
}

const read = (path) => readFileSync(path, "utf8")
const name = (path) => relative(ROOT, path)

// --- No payment providers or checkout machinery on the new stack ---

// Historical D1 migrations keep their text (0001 creates the tables, 0002
// retouches an index, 0003 drops the Stripe columns, 0005 drops the tables),
// so they are excluded from the negative checks below.
const HISTORY = new Set([
  "db/migrations/0001_init.sql",
  "db/migrations/0002_slug_indexes.sql",
  "db/migrations/0003_drop_stripe.sql",
])

const workerFiles = [
  ...listFiles(join(ROOT, "server"), [".ts"]),
  join(ROOT, "lib/api.ts"),
  join(ROOT, "scripts/import-convex-snapshot.mjs"),
]
for (const file of workerFiles) {
  const body = read(file)
  for (const token of ["stripe", "sslcommerz"]) {
    assert.ok(
      !body.toLowerCase().includes(token),
      `${name(file)} must not mention ${token}`
    )
  }
  for (const token of ["donationTiers", "donation-tiers", "donations/checkout", "FROM donations", "INTO donations"]) {
    assert.ok(!body.includes(token), `${name(file)} must not reference ${token}`)
  }
}

// Later migrations may DROP the removed tables, but must never recreate,
// reseed, or reintroduce provider columns for them.
const laterMigrations = listFiles(join(ROOT, "db/migrations"), [".sql"]).filter(
  (path) => !HISTORY.has(name(path))
)
assert.ok(laterMigrations.length > 0, "expected at least one post-removal migration")
for (const file of laterMigrations) {
  const body = read(file)
  for (const token of ["stripe", "sslcommerz"]) {
    assert.ok(
      !body.toLowerCase().includes(token),
      `${name(file)} must not mention ${token}`
    )
  }
  for (const token of ["CREATE TABLE donation", "CREATE TABLE `donation", "INSERT INTO donation", "FROM donation"]) {
    assert.ok(!body.includes(token), `${name(file)} must not recreate ${token}`)
  }
}

const webFiles = [
  ...listFiles(join(ROOT, "app"), [".ts", ".tsx", ".css"]),
  ...listFiles(join(ROOT, "components"), [".ts", ".tsx"]),
]
for (const file of webFiles) {
  const body = read(file)
  for (const token of ["stripe", "sslcommerz", "checkout"]) {
    assert.ok(
      !body.toLowerCase().includes(token),
      `${name(file)} must not mention ${token}`
    )
  }
  for (const token of ["PaymentDialog", "DonationsPanel", "TierEditor", "donation-tier", "payment-dialog", "donationTiers", "/donations"]) {
    assert.ok(!body.includes(token), `${name(file)} must not reference ${token}`)
  }
}
assert.ok(!existsSync(join(ROOT, "components/site/payment-dialog.tsx")), "payment-dialog.tsx must stay deleted")

// --- What must survive the removal (bank-transfer info page) ---
assert.ok(read(join(ROOT, "server/app.ts")).includes("bankTransferEyebrow"), "bank-transfer settings must stay in the Worker")
assert.ok(read(join(ROOT, "server/admin.ts")).includes("donationsEnabled"), "donationsEnabled toggle must stay in the Worker")
assert.ok(existsSync(join(ROOT, "app/donate/page.tsx")), "/donate info page must stay")
assert.ok(
  read(join(ROOT, "components/site/donation-experience.tsx")).includes("BankAccountCards"),
  "bank account cards must stay on the Donate page"
)

// --- Expo mail-desk talks to the Cloudflare Worker, not Convex ---
const expoSources = listFiles(join(ROOT, "apps/mail-desk/src"), [".ts", ".tsx"])
for (const file of expoSources) {
  const body = read(file)
  for (const token of ["convex/react", "@convex-dev", "convex/_generated", "CONVEX_", "convexClient"]) {
    assert.ok(!body.includes(token), `${name(file)} must not reference ${token}`)
  }
}
const expoPackage = JSON.parse(read(join(ROOT, "apps/mail-desk/package.json")))
for (const token of ["convex", "@convex-dev/better-auth"]) {
  assert.ok(!(token in (expoPackage.dependencies ?? {})), `Expo must not depend on ${token}`)
}
assert.ok(
  read(join(ROOT, "apps/mail-desk/src/lib/api.ts")).includes("/api/v1/admin"),
  "Expo API client must target the Hono admin API"
)
assert.ok(
  read(join(ROOT, "apps/mail-desk/.env.example")).includes("EXPO_PUBLIC_API_URL"),
  "Expo env example must document EXPO_PUBLIC_API_URL"
)

// --- The Hono mail endpoints Expo depends on must exist ---
const adminApi = read(join(ROOT, "server/admin.ts"))
for (const route of [
  "/mail/messages",
  "/mail/messages/:id",
  "/mail/allowance",
  "/mail/contacts",
  "/mail/contacts/save",
  "/mail/contacts/delete",
  "/mail/read",
  "/mail/send",
]) {
  assert.ok(adminApi.includes(`"${route}"`), `server/admin.ts must keep the ${route} route`)
}

// --- Mail router archives to both backends ---
const router = read(join(ROOT, "cloudflare/mail-router/src/index.ts"))
assert.ok(!router.includes("Overrides CONVEX_MAIL_ENDPOINT"), "router must not override Convex archiving")
assert.ok(router.includes("Promise.allSettled"), "router must post to every archive endpoint")

console.log("Payment-removal and Expo-migration regression checks passed.")
