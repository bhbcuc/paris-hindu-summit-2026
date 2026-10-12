# Cloudflare production carry-over runbook

How live content gets into Cloudflare production (`summit-db` / `summit-assets` /
`summit-website`): exclusively through authenticated Admin writes, one batch at
a time, with a fingerprint before and after every session. There is no bulk
import path by design — every script in `scripts/` refuses the production
database and bucket, and that guard stays in place.

## Prerequisites (one time, operator)

1. Deploy the production Worker and set every secret from the README runbook
   (`ADMIN_API_TOKEN`, `MAIL_INGEST_SECRET`, `BETTER_AUTH_SECRET`,
   `RESEND_API_KEY`, `ALLOW_INITIAL_ADMIN_SIGNUP=false` after bootstrap).
2. Apply the D1 schema to production with the `cf` CLI directly (the guarded
   repo runner only targets development):
   `cf d1 migrations apply summit-db`
3. Bootstrap the first production administrator (`/admin` → Become
   administrator), then provision the named team accounts from Team access.
4. Set `MAIL_ARCHIVE_ENDPOINT=https://<prod-worker>/api/v1/mail/inbound` on the
   mail router and redeploy it, so new inbound mail lands in D1 as well as
   Convex. Use the same `MAIL_INGEST_SECRET` value in both backends.
5. Take a safety export before the first content session:
   `cf d1 export summit-db --output carryover-base.sql`
   Keep exports and fingerprints outside the repository.

## Carry-over order

Work through the Admin UI on production; after each batch, confirm the public
page renders and the fingerprint moved only by what was entered:

1. Global Site Settings (identity, dates, contact, bank accounts, toggles).
2. `legal` rows via the Other Content inspector — `/privacy` and `/terms`
   render empty until these exist.
3. Known Convex deltas: the Day 03 programme day, the engage cards, and the
   evidence stats records.
4. Remaining programme, people, regional, partner, media (re-upload covers and
   files through the Admin pickers so R2 objects are created properly),
   statements, banners, charts, and editorial/page copy.
5. Mail contacts worth keeping. Message history is not carried over: new mail
   dual-archives from step 4 of the prerequisites, and history stays readable
   in Convex until decommission.

## Fingerprint discipline

```bash
bun run db:fingerprint:prod --out /tmp/prod-before.json
# ... one Admin batch ...
bun run db:fingerprint:prod --baseline /tmp/prod-before.json
```

A clean run prints `No drift` only when nothing changed; after a content batch
the drift report must list exactly the tables that were edited, with row counts
matching what was entered. Anything else stops the session until it is
explained. Releases never change fingerprints — only deliberate Admin edits do.

## Cutover sequencing (later, not part of carry-over)

Vercel/Convex stays online until the Cloudflare system is verified fully
operational: public routes, Admin publishing, Expo mail-desk against the prod
Worker (`EXPO_PUBLIC_API_URL` pointing at `summit-website`), and inbound mail
landing in D1. Only then: point DNS at the Worker, soak, and decommission
Convex — including the untouched `convex/stripe.ts` prototype.
