# Paris Hindu Summit · 2026

Production-shaped, responsive website for the **Global Forum on Religious Freedom and Hindu Minority Rights**, taking place on **3–4 October 2026** at Salle des Princes in Drancy, Paris.

The visual system develops the client-selected **Design 06** direction: paper and cobalt civic architecture, signal-red actions, monumental institutional typography, strict rules, and editorial serif support.

The complete website includes matching **light and dark modes**. The header control follows the visitor across every route, defaults to their system preference, and remembers their selection.

## Preview

![Design 06 light homepage](public/reference/design-06-implementation-light.png)

![Design 06 dark homepage](public/reference/design-06-implementation-dark.png)

## Pages

| Route          | Purpose                                                                             |
| -------------- | ----------------------------------------------------------------------------------- |
| `/`            | Summit overview, evidence, programme preview, speakers, countdown, and donation CTA |
| `/about`       | Mission, principles, outcomes, and seven-point charter                              |
| `/context`     | Historical, demographic, legal, and recent-incident context                         |
| `/programme`   | Interactive two-day summit schedule                                                 |
| `/agenda`      | Seventeen-part, Convex-managed proposed agenda                                      |
| `/resolution`  | Paris Resolution commitments and final declaration                                  |
| `/strategy`    | Editable Five-Year Strategic Action Plan for 2027–2031                              |
| `/partnership-framework` | International cooperation and future institutional framework             |
| `/speakers`    | Confirmed and proposed contributors                                                 |
| `/committee`   | Organising committee and responsibilities                                           |
| `/advisory-board` | International Advisory Board and strategic guidance                              |
| `/media`       | Research, publication, documentary, press, and media resources                      |
| `/participate` | Registration, volunteering, sponsorship, media accreditation, contact, and donation |
| `/engage`      | Convex-managed ways to attend, support, volunteer, partner, and amplify              |
| `/regional`    | Dynamic Beyond Bangladesh regional forum, including Nepal                           |
| `/partners`    | Non-carousel institutional partner and sponsor wall                                |
| `/support`     | Persistent support, contact, volunteer, sponsor, and media enquiry forms             |
| `/donate`      | Bank-transfer giving information; online payments are permanently out of scope      |
| `/admin`       | Better Auth-protected editorial control room                                         |

The client’s living delivery requirements, implementation state, admin-panel
scope, dynamic-content boundary, and launch checks are maintained in
[`docs/PRODUCT_SPEC_CHECKLIST.md`](docs/PRODUCT_SPEC_CHECKLIST.md).
The detailed record of delivered work is maintained in
[`docs/COMPLETED_WORK_CHECKLIST.md`](docs/COMPLETED_WORK_CHECKLIST.md).

## Functional prototype flows

- Responsive desktop and mobile navigation
- Visual Page Studio admin with a live page canvas, page-specific inspector, and desktop/tablet/mobile preview controls
- Page-oriented website navigation separated from forms, donations, media, users, and audit operations
- Admin-date-driven animated flip countdown in the landing-page hero
- Live Global Site Settings across hero copy, event facts, availability controls, donation messaging, contact details, and footer
- Day-specific Programme session editors with automatic, locked day assignment
- Persistent light/dark mode with a visible theme control
- Tuned compact-phone, large-phone, tablet, small-laptop, and desktop layouts
- Two-day programme tabs
- Delegate registration form with a realistic success state
- Convex-persistent registration, contact, volunteer, sponsor, support, and media enquiry flows with references, consent, spam controls, and CSV export
- Donation dialog with selectable euro amounts, email validation, and a mock success state
- Dedicated donation page presenting the summit bank accounts as managed information; online payments are permanently out of scope
- Better Auth email/password login; the first verified account can establish the initial administrator, and later accounts require an assigned role
- Administrator and editor roles enforced inside the Hono admin API (Convex mutations on live Vercel production)
- Invitation-only team access: public account creation closes after bootstrap, and administrators provision or suspend named accounts from Admin
- Global settings editor for event identity, dates, venue, format, audience numbers, languages, announcement, email addresses, phone/WhatsApp, social links, hero, donation, and footer copy
- Purpose-built page editors for Proposed Agenda, Paris Resolution, the 5-Year Strategic Plan, the International Partnership Framework, Speakers, Organizing Team and Advisory Board, and Media & Publication
- Dynamic Media & Publication submenu sections with direct cover and downloadable PDF/Word/PowerPoint uploads to Convex storage
- Strategic Plan Vision and editable 2027–2031 Implementation Timeline cards
- New seminar brief represented as 68 editable records across overview, people, agenda, resolution, strategy, and international partnership content
- Purpose-built programme-day/session, homepage evidence-card, and evidence-chart editors, dynamic navigation, and an admin-controlled featured-speaker homepage
- Editable regional-country and partner/sponsor directories
- Support, contact, sponsorship, volunteer, and media forms with a protected admin inbox
- Convex file library for managed images and PDF documents
- Donation tiers and contribution ledger, plus editorial activity logs
- Generated witness-flame favicon and Apple touch icon
- Convex-backed Beyond Bangladesh section with Pakistan, Afghanistan, Myanmar, and Nepal
- Admin-extensible regional-country model with draft/published ordering
- Stationary, tiered partner and sponsor wall (no carousel)
- Convex storage-ready asset records for logos, portraits, media, and documents
- Privacy and terms draft pages, managed social/footer links, fixed announcement/navigation, and accessible chart data tables

## Local development

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

The sections below describe both backends in play during the migration: the
live Vercel + Convex production deployment, and the Cloudflare Workers + D1/R2
path on the `cf-migration-vinext-hono-d1r2` branch. See
[Cloudflare runbook](#cloudflare-runbook) for the Worker commands.

Quality checks:

```bash
bun run typecheck
bun run lint
bun run build
```

Vercel requires these public endpoint variables in Production, Preview, and
Development:

```bash
NEXT_PUBLIC_CONVEX_URL
NEXT_PUBLIC_CONVEX_SITE_URL
```

Authentication secrets remain in Convex environment variables and must not be
duplicated into `NEXT_PUBLIC_*` values.

Convex workflow:

```bash
bun run convex:dev
```

Development and production use separate ignored deploy-key files, so backend
commands continue to work after changing Convex accounts or logging the CLI
out. See [`docs/CONVEX_DEPLOY_KEYS.md`](docs/CONVEX_DEPLOY_KEYS.md).

### Initial administrator

For a brand-new Convex deployment only:

1. Temporarily set `ALLOW_INITIAL_ADMIN_SIGNUP=true` in that Convex deployment.
2. Open `/admin` and create the organiser-owned account with a password of at least 10 characters.
3. Sign in and choose **Become administrator**.
4. Immediately set `ALLOW_INITIAL_ADMIN_SIGNUP=false`.

After bootstrap, public account creation is disabled at the Better Auth endpoint.
An administrator creates every additional named account from **Admin → Team
access**, chooses Administrator or Editor, and shares the initial credentials
securely. Administrators can suspend or restore those accounts at any time.

Better Auth signing secrets, `ALLOW_INITIAL_ADMIN_SIGNUP`, and payment
credentials stay in Convex environment variables. Never add them to CMS fields
or commit them to Git.

### Payment decision

Online payments are permanently out of scope (organiser decision, October
2026). The `/donate` page is bank-transfer information only: there is no
checkout, no contribution ledger, and no provider integration on the
Cloudflare stack. Do not reintroduce Stripe, SSLCOMMERZ, or any other payment
provider. The `convex/` Stripe prototype stays untouched until the Convex
cutover, when it is removed with the rest of the legacy backend.

Every commit must be followed by a production backend deploy:

```bash
bun run convex:deploy:prod
```

That command now takes and checksums a complete production snapshot—including
uploaded files—before deploying backend functions. Production admin content is
the source of truth and must never be replaced from development.

The seed is a development/bootstrap tool only. Production seeding is disabled
and all retired repair/content-migration functions are removed from the deployed
API, so deleted or edited Admin content cannot be recreated by a release. Make
live editorial changes through authenticated Admin mutations after taking a
production backup. Never seed personal, donor, registration, or credential data.

```bash
bun run convex:seed:dev
```

## Cloudflare runbook

The web app on this branch runs as a Cloudflare Worker built with
[vinext](https://vinext.dev). A Hono API at `/api/v1/*` reads and writes D1
(content, submissions, donations, audit, auth) and R2 (images and files). Better
Auth also runs on D1 through Kysely.

Convex is still present and still serves the live Vercel production deployment
only; the Expo mail-desk app now talks to the Hono admin mail API on the
Worker. Nothing in this section replaces the Convex workflow above.

### Build and preview

```bash
bun run dev:vinext      # vite dev server on :3001
bun run build:vinext    # production Worker bundle
bun run start:vinext    # preview the built bundle locally
```

Deploy a preview, then production:

```bash
bunx vinext-cloudflare deploy --preview
bun run deploy:vinext
```

Worker, D1, and R2 bindings live in `cloudflare.config.ts`. Compatibility date
is pinned there, along with observability settings.

### D1 and R2 resource names

| Purpose             | D1              | R2               | Worker             |
| ------------------- | --------------- | ---------------- | ------------------ |
| Development/preview | `summit-db-dev` | `summit-assets-dev` | `summit-website-dev` |
| Production          | `summit-db`     | `summit-assets`  | `summit-website`   |

`cf dev --mode development` and Worker previews resolve to the `-dev` resources,
so branch work never reaches production data.

D1 schema changes ship as ordered files in `db/migrations/`:

```bash
cf d1 migrations apply summit-db-dev --local   # apply against local D1
cf d1 migrations apply summit-db-dev           # apply to dev D1
cf d1 migrations apply summit-db               # apply to production D1
```

Seed or restore production data by exporting first and writing rows through an
authenticated Admin action. There is no reusable content migration or fixture
sync against either store:

```bash
cf d1 export summit-db --output backup.sql
```

### Secrets

Declared as `bindings.secret()` in `cloudflare.config.ts`. Copy
`.dev.vars.example` to `.dev.vars` (gitignored) for local development, and set
each one with `cf secret put <NAME>` per environment.

| Secret                     | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `ADMIN_API_TOKEN`          | Server-to-server token for the Admin API                |
| `MAIL_INGEST_SECRET`       | Authenticates inbound mail from the Email Worker         |
| `BETTER_AUTH_SECRET`       | Better Auth signing secret                               |
| `RESEND_API_KEY`           | Outbound admin email; replies send through Resend        |
| `ALLOW_INITIAL_ADMIN_SIGNUP` | Bootstrap flag; set `true` only for first-account setup |

Optional: `EXTRA_TRUSTED_ORIGINS` accepts a comma-separated list of additional
origins for Better Auth CORS and CSRF checks, which preview deployments need.
`BETTER_AUTH_URL` sets the canonical auth origin. Secrets never belong in CMS
fields or Git.

### Initial administrator

Same flow as the Convex deployment, driven by the Better Auth admin API:

1. Temporarily set `ALLOW_INITIAL_ADMIN_SIGNUP=true`.
2. Open `/admin` and create the organiser-owned account with a password of at
   least 10 characters.
3. Sign in and choose **Become administrator**.
4. Immediately set `ALLOW_INITIAL_ADMIN_SIGNUP=false`.

After bootstrap, public account creation is disabled at the Better Auth
endpoint, and an administrator provisions every additional named account from
**Admin → Team access**.

### Release gate

Before releasing a D1 change, confirm the content-table fingerprints are
unchanged so a schema migration has not silently altered or dropped Admin-owned
content. Editorial changes belong in Admin, not in a migration. Loading live
content into Cloudflare production follows
[`docs/CLOUDFLARE_PROD_CARRYOVER.md`](docs/CLOUDFLARE_PROD_CARRYOVER.md):
authenticated Admin writes in batches, fingerprinted before and after — never a
bulk import.

### New scripts

```bash
bun run dev:vinext         # local Workers dev server
bun run build:vinext       # production Worker build
bun run start:vinext       # serve the built bundle
bun run deploy:vinext      # production Worker deploy
```

D1 migrations are ledger-guarded (each file applies once; re-runs are
blocked). Plan first, then apply with `--yes`. Production D1 is refused by
every write script — the guarded runner additionally fingerprints content
before and after:

```bash
bun run db:migrate:dev             # plan only; lists applied and pending files
bun run db:migrate:dev --yes       # apply pending migrations to development D1
bun run db:migrate:guarded --yes   # same, with a content fingerprint before and after
```

Content fingerprints are row counts plus a SHA-256 over each content table's
ordered rows. Compare against a stored baseline to gate a release — any drift
fails the check unless it was a deliberate authenticated Admin edit:

```bash
bun run db:fingerprint:dev --out baseline.json      # take a baseline
bun run db:fingerprint:dev --baseline baseline.json # exit 1 on drift
bun run db:fingerprint:prod                         # read-only production check
```

Importing a Convex snapshot export is development-only and requires `--yes`;
it emits SQL and an upload script rather than writing to D1 or R2 itself:

```bash
bun run import:convex:snapshot <snapshotDir> <outDir> --yes
```

## Source material

The content architecture and factual event details were developed from the supplied summit documents in the parent folder, including `Paris Website.pdf`, the event concept note, the conference committee document, and the speaker/committee profiles.

Before publication, the organisers should approve final speaker status, programme timings, contact destinations, source links, privacy language, and the selected payment provider.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui with Base UI primitives
- Bun
- Convex database and file storage (live Vercel production, until cutover)
- Cloudflare Workers with vinext and Vite (migration target for the web app)
- Hono API on D1 and R2
- Better Auth on D1 via Kysely
- Resend for outbound admin email
