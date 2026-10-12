<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project delivery rules

- Treat `docs/PRODUCT_SPEC_CHECKLIST.md` as the living product-requirements and
  delivery checklist. Update it whenever scope, implementation status, or an
  organiser decision changes.
- Convex is the only application content store and the storage service for
  uploaded images and files. Store Convex storage IDs in data records and resolve
  URLs when reading.
- Never expose an unauthenticated admin write, upload, seed, or destructive
  function.
- After every Git commit, run `bun run convex:deploy:prod`. This uses the
  ignored production deploy-key file and does not depend on a logged-in Convex
  CLI session.
- Production is established and all live content is Admin-owned. Never run a
  seed, fixture sync, repair mutation, or reusable content migration against
  production. Use an authenticated Admin mutation for editorial changes and
  verify that production content-table fingerprints are unchanged by releases.

### Migration-interim amendment (5 October 2026)

The backend is dual-backend while the Cloudflare migration is in flight. These
rules amend the Convex-specific rules above for that interim period.

- The web app and the Expo mail-desk app on this branch read and write D1 and
  R2 through the Hono API on Cloudflare Workers. Web and Expo code must not
  import `convex/react` or reach a Convex client.
- `convex/` is retained and must not be deleted or proposed for deletion. Live
  Vercel production still depends on it. Treat Convex and D1 as two stores,
  and resolve file URLs at read time in both.
- Online payments are permanently out of scope (organiser decision, October
  2026). Do not reintroduce Stripe, SSLCOMMERZ, or any other payment provider
  on either stack; the `/donate` page is bank-transfer information only.
- `bun run convex:deploy:prod` is now scoped to changes that touch `convex/`.
  Do not run it for unrelated commits. Changes outside `convex/` ship through the
  Cloudflare pipeline, and D1 schema changes ship as ordered migrations in
  `db/migrations/`.
- Gate D1 releases on the content-table fingerprint comparison. A release that
  changes fingerprints is a failed release unless the change was a deliberate
  authenticated Admin edit.
- The rules above about never exposing an unauthenticated admin write, and never
  seeding, fixture-syncing, or migrating production, apply unchanged to D1 and R2.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
