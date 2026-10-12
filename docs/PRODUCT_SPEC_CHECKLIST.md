# Product specification checklist

Last reviewed: 12 October 2026
Source of truth: `Paris_Website_Spec.pdf`, supplied 26 July 2026
Target launch: August 2026
Event: 3–4 October 2026

This is the living delivery checklist for the public website, admin panel, content
model, integrations, and launch. Update a checkbox only when the behaviour has
been implemented and verified in both the development and production deployments
of whichever backend serves it, where data is involved.

## Backend migration interim status (5 October 2026)

The backend is mid-migration and currently dual-backend. This section is the
status record for that interim period; the feature sections below remain the
authority on delivered product behaviour.

- Dual-backend, interim: the web app and the Expo mail-desk app read and write
  content through a Hono API on Cloudflare Workers backed by D1 (content,
  submissions, audit) and R2 (images and files). `convex/` is retained and
  still serves the live Vercel production deployment only. Neither backend is
  scheduled for removal on this branch; Vercel/Convex stays online until the
  Cloudflare system is verified fully operational.
- Prod state verified 12 October 2026: `summit-website` Worker live
  (`https://summit-website.venue-mind.workers.dev`, 21/21 public routes 200);
  `summit-db` at ledger `0001`–`0005` with content byte-identical to the 4
  October snapshot on all shared tables; `summit-assets` holds all 80
  referenced files; mail router dual-archives to both backends. A 12 October
  field-by-field diff of Convex prod vs D1 prod found zero content deltas, so
  no content carry-over was needed. Still open (organiser-authored via Admin):
  `legal`, `statements`, and `homeBanners` rows, empty in both stores.
- Payment decision recorded (organiser decision, October 2026): online payments
  are permanently out of scope. The `/donate` page is bank-transfer information
  only; the tier/checkout/ledger machinery is removed from the Worker, the web
  UI, and D1 (`db/migrations/0005_drop_donations.sql`). The `convex/` Stripe
  prototype stays untouched until the Convex cutover. Do not reintroduce any
  payment provider on either stack.
- Expo mail-desk migrated: the app authenticates against Worker better-auth and
  uses the Hono admin mail API (`/api/v1/admin/mail/*`) for messages,
  allowance, contacts, read state, deletion, and sending via Resend. It no
  longer imports `convex/react` or reads Convex data.
- Inbound mail dual-archives during the interim: the mail router (deployed
  12 October 2026, version `bbf1f315`, migrated from wrangler.jsonc to cf)
  posts every message to both Convex and D1 (`MAIL_ARCHIVE_ENDPOINT` set to
  the prod Worker inbound route), so neither backend misses mail. The same
  `MAIL_INGEST_SECRET` value must be set in both backends — verify with a
  test email landing in the D1 Mail Desk.
- Known issues and open items on this branch:
  - R2 image optimizer fix in progress. The Cloudflare Images optimizer wiring in
    `vite.config.ts` is not yet settled; verify rendering and dimensions of managed
    R2 images before a production Cloudflare release.
  - `/privacy` and `/terms` render empty. The `legal` content category has 0 rows
    in the D1 store, so both routes have nothing to render. This needs an
    authenticated Admin content write, not a seed or fixture script.
  - Content deltas against Convex development are Admin-owned data, not code
    bugs: the Day 03 programme day, the engage cards, and the evidence stats
    records differ between the two stores. Carry them across as Admin writes.
  - Fingerprint comparison and migration-runner scripts have been added so D1
    releases can be gated on content-table fingerprints the same way Convex
    releases were.
  - Release of 12 October 2026 (commit `94131fb`): the payment-removal batch
    is live on both Workers (`summit-website` version `d69f9052`,
    `summit-website-dev` version `41025459`). D1 prod ledger is at
    `0005_drop_donations.sql` (`0004_rate_limits.sql` plus `0005` applied via
    `cf d1 migrations apply` after a SELECT-only safety dump).
    `/api/v1/donation-tiers` is 404 on both Workers and the
    `donations`/`donationTiers` tables no longer exist in prod. The
    post-release fingerprint shows no drift
    (`25 tables, 1588 rows, digest e1d83796`). Vercel/Convex stays online.

For the full delivered-feature inventory, see
[`COMPLETED_WORK_CHECKLIST.md`](COMPLETED_WORK_CHECKLIST.md).
For the exact boundary between editable editorial copy and code-owned interface
text, see [`CONTENT_EDITABILITY_AUDIT.md`](CONTENT_EDITABILITY_AUDIT.md).

## Status legend

- `[x]` Implemented and verified
- `[ ]` Not yet implemented
- `Partial` exists, but does not yet meet the supplied specification
- `Decision` requires organiser/client approval

## Confirmed product decisions

- [x] Theme Showcase No. 06 is the visual direction, with matching light and dark modes.
- [x] Nepal is included in Beyond Bangladesh alongside Pakistan, Afghanistan, and Myanmar.
- [x] Beyond Bangladesh is data-driven: admins can add more countries and edit their details.
- [x] Partners and sponsors use a stationary, tiered institutional wall rather than a slider or marquee.
- [x] Convex is the central content store and file/image storage service.
  `Interim (5 October 2026)`: dual-backend during migration. The web app reads and
  writes D1/R2 through the Hono API on Workers; Convex still serves live Vercel
  production and the Expo mail desk. Store the backend's file IDs in records and
  resolve URLs at read time on whichever store is in use.
- [x] Public content changes must publish without a new frontend deployment.
- [x] Online payments are permanently out of scope. SSLCOMMERZ, Stripe, Polar, and any other provider must not be (re)introduced on either stack. `Interim (12 October 2026)`: the Cloudflare `/donate` page is bank-transfer information only with no checkout or ledger; `convex/stripe.ts` and the `stripe` dependency are retained untouched while live Vercel production still runs on Convex, and are removed at cutover.
- [x] Registration and donation entry points remain visible in desktop and mobile navigation.
- [x] Working delivery decision: retain the complete homepage plus detail pages for deep content and SEO.
- [x] Public brand is “Paris Hindu Summit” with the subtitle “Global Forum on Religious Freedom and Hindu Minority Rights”.
- [x] Admin access uses named Better Auth email/password accounts, role records, and an audit trail.
- [x] Public account creation is disabled after bootstrap; administrators provision and suspend named team accounts from the protected Team Access panel.
- [x] Public-page rendering is independent from admin authentication lookups, so an auth delay cannot block the entire website.
- [x] Performance pass covers stable initial layout, reduced homepage JavaScript, off-screen rendering containment, reduced-motion-safe spring reveals, and visibility-aware countdown timers.
- [x] Cross-device typography pass provides explicit font fallbacks, stable browser text scaling, and readable minimum sizes for navigation, captions, metadata, body copy, and compact-phone layouts.
- [x] BeUI motion patterns are adapted to the square editorial system for uploads, global notifications, theme transitions, hero text, section reveals, and the 404 route.
- [x] Managed production copy renders only after its Convex records are ready, using layout-preserving loading states instead of briefly showing and replacing code fallbacks.

## Public website

### Global shell and navigation

- [x] Fixed navigation remains available while scrolling.
- [x] Light/dark theme control is available on all routes and remembers preference.
- [x] Theme changes use a reduced-motion-safe circle-blur transition, with the same control available in the protected admin workspace.
- [x] Responsive desktop and mobile navigation.
- [x] Admin-editable announcement strip is visible above the fixed public header.
- [x] Event logo/brand links to Home.
- [x] About dropdown includes the specified detailed routes.
- [x] Dynamic Programme dropdown is generated from published programme days.
- [x] Beyond Bangladesh entry links to the regional section.
- [x] Dynamic Media dropdown is generated from published media records. `Partial`: final client-approved category content remains.
- [x] Dynamic Engage dropdown is generated from published engagement cards.
- [x] Donate is available in desktop and mobile navigation; Register is available in the mobile menu and participation routes. `Partial`: add a second desktop Register button after client approval.

### Homepage section order and content

- [x] Design 06 hero foundation, event date/location, headline, primary CTAs, and responsive typography.
- [x] Homepage hero headline uses a restrained word reveal with spring timing, blur, and a reduced-motion fallback.
- [x] Mobile-first hero typography keeps both managed headline lines intact at compact-phone widths and scales without word-level gaps on desktop.
- [x] Live countdown prototype.
- [x] Dynamic hero information bar: Venue, Format, Delegates, Languages.
- [x] Homepage rationale is retained as concise editable introductory copy; the former rationale card grid was removed by client request.
- [x] Featured-speaker teaser is driven by the admin Featured flag and enforces a maximum of three published records.
- [x] When no speaker is marked Featured, the homepage shows up to the first three published speaker records instead of stale code fixtures.
- [x] Partners & Sponsors institutional wall; no slider.
- [x] Editable demographic and displacement charts, source notes, accessible data tables, and homepage evidence-number cards remain published.
- [x] The former homepage Challenges card section was removed by client request.
- [x] Beyond Bangladesh includes Pakistan, Afghanistan, Myanmar, and Nepal.
- [x] Regional cards are backed by an extensible Convex country model.
- [x] Dedicated animated Donate and Support pages. The Donate page presents admin-managed bank-transfer information only; there is no checkout, tier selection, or contribution ledger.
- [x] Full persistent Registration section with required fields, consent, reference, and admin inbox workflow.
- [x] Footer foundation.
- [x] Footer navigation, managed email, registration, donate, legal links, and recognisable Facebook, X/Twitter, Instagram, LinkedIn, and YouTube icons.
- [x] A summit-branded animated 404 route provides clear Home and Programme recovery actions.
- [x] Photo-gallery images render uncropped and open in an accessible in-page lightbox with next/previous controls instead of a new browser tab.
- [x] Photo-lightbox metadata reserves enough width for its headline and wraps long titles without clipping at desktop and tablet sizes.
- [x] The supplied 2026 campaign banner appears uncropped below the homepage hero, with reduced-motion-safe carousel controls when multiple banners are published.

### Detailed content

- [x] Overview is editable from Admin.
- [x] About includes the client-approved hero copy and an editable six-card “Present Moment” section.
- [x] Organizing Team is editable from Admin.
- [x] Advisory Board has its own public route and navigation entry, separate from the Organising Committee.
- [x] Advisory Board is editable from Admin and published on the Committee page.
- [x] Proposed Agenda is editable from Admin and published on `/agenda`.
- [x] Paris Resolution 2026 is editable from Admin and published on `/resolution`.
- [x] Five-Year Strategic Plan is editable from Admin and published on `/strategy`.
- [x] International Partnership Framework is editable from Admin and published on `/partnership-framework`.
- [x] Why This Summit is editable from Admin.
- [x] Beyond Bangladesh content is modelled as editable country records.

## Registration

- [x] Registration includes both programme days, printed materials, listed meals, and closing gala dinner.
- [x] Facts show dates, full venue address, and English/French/Bengali interpretation.
- [x] First name is required.
- [x] Last name is required.
- [x] Email is required.
- [x] WhatsApp contact number is required.
- [x] Organisation is optional.
- [x] “Attending as” options match Survivor, Delegate, Audience, Researcher-Speaker, defaulting to Delegate.
- [x] Registrations persist to Convex and can be exported as CSV from Admin.
- [x] Success confirmation UI exists.
- [x] Privacy draft, consent language, honeypot and per-email rate protection, admin reference and inbox workflow exist. `Partial`: client approval, retention period and external email notifications remain.
- [x] Header, mobile menu, Engage and footer registration links reach the registration route.

## Donations (bank-transfer information only)

Organiser decision, October 2026: online payments are permanently out of
scope. The former provider, checkout, tier, ledger, receipt, and activation
items are closed as out of scope rather than pending.

- [x] Donation headings, supporting copy, and both summit bank accounts are admin-editable and published on `/donate`.
- [x] No checkout, tier selection, contribution ledger, or provider integration exists on the Cloudflare stack.
- [x] Stripe, SSLCOMMERZ, Polar, and any other payment provider must not be (re)introduced on either stack.
- [x] `Interim (12 October 2026)`: `convex/stripe.ts`, the Convex `/stripe/webhook` route, and the `stripe` dependency stay untouched while live Vercel production runs on Convex; they are removed at cutover, not before.

## Admin panel

### Security and publishing

- [x] `/admin` has a dedicated Better Auth email/password sign-in and account setup screen.
- [x] Admin mutations verify Better Auth identity and an active role record on the server.
- [x] Passwords are handled by Better Auth and never stored in application tables.
- [x] Roles: Administrator, Editor, and Mail & Forms Only. The restricted role cannot access website content, donations, media, team access, or audit tools.
- [x] Invitation-only Team Access panel supports account creation, role selection, suspension, restoration, and last-administrator safeguards.
- [x] Draft/published status for public content.
- [x] Audit events and update timestamps for editorial operations.
- [x] Destructive content actions require confirmation; referenced files cannot be deleted until detached.
- [x] Admin opens into a visual Page Studio with a live public-page canvas and adjacent page-specific inspector.
- [x] Desktop, tablet, and mobile canvas controls render the selected public page at its target viewport width.
- [x] Website pages and operational tools are separated into clear navigation groups.
- [x] Home-page settings can be published from the inspector or the global Publish Changes action, with automatic preview refresh.
- [x] Programme, people, regional, partner, media, engagement, support, homepage evidence cards, evidence charts, and extended content editors are available beside their corresponding live pages.
- [x] The Evidence Charts Admin entry previews the matching homepage chart block directly instead of an unrelated section of the Context page.
- [x] Forms, donations, media storage, team access, dashboard metrics, and activity are retained in a separate Operations workspace.
- [x] Mail Desk archives routed inbound email in D1, supports read state and threading metadata, and sends authenticated replies from `info@parishindusummit.org` through Resend. `Interim (12 October 2026)`: the mail router dual-archives to Convex and D1, so live Vercel production keeps its copy too; the Expo mail-desk app uses the same D1-backed API.
- [x] Cloudflare Email Routing continues forwarding incoming messages to verified destination inboxes while the Email Worker records a copy for the protected Mail Desk.
- [x] All Convex-backed saves update public queries reactively without a code deployment.
- [x] Global Site Settings are bound to the public hero, event facts, rationale, donation invitation, registration/donation availability, header, and footer rather than duplicated static copy.
- [x] Page titles, eyebrows, and introductory paragraphs for all principal public pages are editable through a dedicated Page Titles & Intros inspector.
- [x] All remaining visible editorial headings, paragraphs, captions, fixed list items, calls to action, shared header/footer language, and operational content notices are editable through page-grouped Editorial Sections records.
- [x] Record switching in the right-hand inspector uses labelled dropdowns instead of horizontally scrolling record chips.
- [x] Privacy and Terms records are reachable through the Other Content inspector.
- [x] All admin file inputs use a consistent drag/drop queue with file metadata, progress, retry, removal, validation errors, and Convex-backed upload handlers.
- [x] Animated status notifications are shared by public forms and the protected admin workspace.
- [x] Home-page banners have a purpose-built Admin editor with direct Convex upload/selection, accessible image descriptions, order, draft/published status, and removal.

### General tab — dynamic

- [x] Event name, theme/tagline, date/time/timezone, venue, full address, format, delegates, and languages.
- [x] Website logo and favicon can be uploaded to Convex storage, selected, and changed from Site Settings.
- [x] Admin-managed event start time drives the public countdown.
- [x] Announcement content and enabled state.
- [x] Contact, registration and press emails, phone, and WhatsApp.
- [x] Facebook, X/Twitter, Instagram, and YouTube links.
- [x] Donation invitation copy, bank-transfer copy, and both summit bank accounts are editable; the `donationsEnabled` toggle controls Donate visibility. Donation tiers no longer exist on the Cloudflare stack.
- [x] Footer title/body. `Partial`: legal-link records remain.

### Programme tab — dynamic

- [x] Add, edit, remove, reorder, draft, and publish day tabs.
- [x] Day fields include tab label, navigation label, date, summary, and order.
- [x] Add, edit, remove, reorder, draft, and publish sessions per day.
- [x] Admin can publish every prepared programme draft in one explicit action; public queries continue to exclude drafts.
- [x] Admin session editors are grouped by programme day; each editor has a locked day assignment and cannot display another day’s sessions.
- [x] Session fields include start/end time, title, description, tag, speakers, location, and order.

### Engage tab — dynamic

- [x] Add, edit, remove, reorder, draft, and publish engagement cards.
- [x] Fields: title, description, supporting copy, link text, link destination, featured flag, and order. `Partial`: selectable icons remain.

### Speakers tab — dynamic

- [x] Add, edit, remove, reorder, draft, and publish speaker records.
- [x] Purpose-built speaker editor uses client-facing fields: name, short introduction shown below the name, country, biography, direct profile-picture upload/selection, order, and publication state.
- [x] The public Speakers page now reads published speaker records from Convex instead of a code-only list.
- [x] Expanding a long biography replaces its preview with one continuous paragraph, without leaving a Read more control or content break inside the biography.
- [x] Featured toggle drives the homepage teaser and the backend enforces the approved maximum of three.
- [x] Speaker views do not substitute removed or unpublished records with hard-coded fallback people.

### Organizing Team and Advisory Board tabs — dynamic

- [x] Organising Committee and Advisory Board have separate Page Studio navigation entries, live previews, and people editors.
- [x] Team and Advisory Board fields support name, short introduction, biography, direct profile-picture upload/selection, order, and publication state.
- [x] Published committee portraits render on `/committee`; published advisor portraits render separately on `/advisory-board`.
- [x] Public people portraits use a full-bleed circular, borderless, face-forward crop without an inner rectangular image frame.

### Partners & Sponsors tab — dynamic

- [x] Data model supports partner/sponsor type, tier, description, order, draft/published state, optional website, and optional Convex logo storage ID.
- [x] Admin CRUD, order, and publish controls.
- [x] Authenticated Convex media upload exists, with direct logo upload and managed-logo selection inside the partner editor.
- [x] Public presentation is a stable tiered institutional wall, not a slider, and displays both an attached logo and the organisation name.

### Media & Publications tab — dynamic

- [x] Public and admin navigation label is “Media & Publication”.
- [x] Admin can create, order, draft, publish, and remove submenu sections such as Books, Government Reports, and Research & Briefings.
- [x] Every publication belongs to a submenu section and supports title, description, optional cover image, uploaded file, order, and publication state.
- [x] Direct cover and PDF/Word/PowerPoint upload uses Convex storage; stored IDs, not expiring URLs, are persisted.
- [x] The public Media & Publication page renders published sections and downloadable files reactively.
- [x] Images & Videos uses dedicated photo and YouTube video gallery presentations rather than generic document-download cards.
- [x] Admin media records can be typed as a publication, gallery photo, or YouTube video, with server-side file and URL validation.
- [x] Media covers and publication files cannot be deleted while referenced.
- [x] A fixed Statements submenu lists official and non-official statements, press releases, and public notices in date order.
- [x] Admin can upload PDF, DOCX, JPG, and PNG statement files without a cover image, then draft, publish, edit, order, or remove each statement.

### Purpose-built About document editors

- [x] About inspector exposes only Overview and Present Moment records, with page-relevant labels and without unrelated contact, date, link, and parent fields.
- [x] Present Moment cards support heading, body, order, draft, and publication state.
- [x] Proposed Agenda editor exposes agenda number, title, discussion points, and expected outcome.
- [x] Paris Resolution editor exposes resolution number, title, summary, and expected outcomes; each published record expands in place to show its details and outcome.
- [x] 5-Year Strategic Plan editor supports a Vision above all goals, numbered strategic goals, key actions, expected outcomes, and year-based “Implementation Timeline” cards.
- [x] International Partnership Framework editor exposes country/institution name, area of cooperation, and expected outcomes.

### Population and displacement tabs — dynamic

- [x] Chart series: title, description, unit, source and order.
- [x] Population points: census year, context, numeric value and order.
- [x] Displacement points: period, sublabel, numeric value and order.
- [x] Charts validate non-negative values and remain accessible as data tables.

### Beyond Bangladesh tab — dynamic

- [x] Country fields: slug, name, code, eyebrow, headline, summary, detail, source link, optional Convex image, order, and draft/published state.
- [x] Seed includes Pakistan, Afghanistan, Myanmar, and Nepal.
- [x] Admin CRUD, order, draft, and publish controls with the public Regional page visible alongside the editor.
- [ ] Approved source/citation URLs for every published country. `Partial`: the field is editable, but existing supplied country records do not yet include approved sources and remain publishable while citations are prepared.

## Convex content and file architecture

`Interim (5 October 2026)`: this section is modelled on Convex and still describes
the Convex store, which continues to serve live production and the Expo mail desk.
The equivalent D1 tables and R2 objects now serve the web app on this branch.

- [x] `regionalCountries`, `organizations`, `homeBanners`, and `assets` schema.
- [x] Public reads use indexed queries and return resolved storage URLs rather than persisting URLs.
- [x] File records store `Id<"_storage">`; temporary storage URLs are never stored.
- [x] Authenticated upload URL generation.
- [x] Upload validates extension, MIME type, byte size, minimum image dimensions and mandatory custom alt text.
- [x] Allowlist: JPEG, PNG, WebP, AVIF and PDF; SVG is rejected.
- [ ] Image transformations/thumbnail strategy.
- [x] Referenced files are protected from deletion; safe replacement still requires client workflow testing.
- [x] General settings, flexible CMS, programme days/sessions, chart series/points, donation tiers, submissions, donations, admin users and audit events are modelled.

## Static vs dynamic boundary

Keep these in code:

- [x] Design tokens, typography, responsive grid, reusable components, accessibility behaviour, route/layout shell, and validation rules.
- [x] Convex schema, D1 migrations, secure server functions, and role enforcement. Online payments are out of scope, so no provider integration exists on the Cloudflare stack.

Move these to the content store and expose through Admin:

- [x] Event facts, contact/social links, announcement, footer content, and donation bank-transfer details.
- [x] Principal public-page hero labels, titles, and introductions.
- [x] Navigation labels are generated from programme, media, engage, and detailed content.
- [x] People, partners/sponsors, regional countries, media, programme, chart series, and detailed editorial copy are supported.
- [x] Logos, portraits, thumbnails, downloadable files, and alt text/metadata can be stored in the Convex media library. `Partial`: polished attachment pickers remain.
- [x] Homepage campaign banners are stored as ordered Convex records that reference managed storage IDs and resolve public URLs at read time.
- [x] Remaining editorial section framing is represented by named, layout-safe Convex records rather than a generic unstructured page builder.

Never make these editable as plain content:

- [x] Auth signing keys, admin role enforcement, database validators, and executable code remain code-owned.

## Delivery operations

- [x] `.env.local` is ignored by Git.
- [x] Development and production Convex deployments are configured.
- [x] `Interim (5 October 2026)`: Cloudflare resources are split the same way. Development and preview use `summit-db-dev` and `summit-assets-dev` with the `summit-website-dev` Worker; production uses `summit-db` and `summit-assets` with the `summit-website` Worker.
- [x] Separate ignored development and production deploy-key files allow
  Convex commands to run without the active CLI account session.
- [x] Package scripts explicitly select the intended deployment and prevent a
  production deploy from accidentally targeting development.
- [x] Every schema/function change passes `bun run typecheck`.
- [x] Every app change passes `bun run lint` and `bun run build`.
- [x] After every Git commit, run `bun run convex:deploy:prod`. `Interim (5 October 2026)`: scoped to Convex-touching changes only. Changes that do not touch `convex/` deploy through the Cloudflare pipeline instead, and D1 releases are gated on the content-table fingerprint gate.
- [x] The initial-content seed is first-install-only and becomes a verified no-op once Admin-managed site content exists.
- [x] Re-running the seed cannot restore administrator-deleted Evidence, Programme, Engage, support, legal, partner, media, or other fixture records.
- [x] Production seeding fails closed, and retired content migration/repair functions are absent from the deployed API.
- [x] Releases preserve every production content table and stored file; only authenticated Admin and operational form flows may write live data.
- [x] `Interim (5 October 2026)`: the same rules apply to the D1/R2 backend. D1 schema changes ship as ordered migrations in `db/migrations/`, and a release is only accepted when the content-table fingerprint comparison shows no unintended content change.
- [x] `Interim (5 October 2026)`: no seed, fixture sync, or reusable content migration runs against either production store. Carry Day 03, the engage cards, and the evidence stats across as authenticated Admin writes. The full procedure is [`CLOUDFLARE_PROD_CARRYOVER.md`](CLOUDFLARE_PROD_CARRYOVER.md).
- [ ] `Interim (5 October 2026)`: publish `legal` category rows through Admin so `/privacy` and `/terms` render approved copy.
- [x] Public managed lists use stable loading silhouettes rather than briefly rendering empty or fallback states while Convex resolves.
- [x] Media item saves omit absent optional storage and YouTube fields, allowing photo-gallery uploads to persist.
- [x] Media item saves validate live section and asset selections, generate safe slugs when omitted, and persist canonical registered-file metadata.
- [x] Partner and sponsor logos use a compact, uniform institutional-card presentation across responsive layouts.
- [x] The public visual system uses warm ivory, deep indigo, antique gold, and charcoal across light and dark themes.
- [x] The hero date has stronger visual weight, Proposed Agenda headings use a more readable scale, and the Advisory Board follows the Team’s responsive three-column roster.
- [x] Proposed Agenda, Paris Declaration, Five-year Strategy, and International Partnerships share the restrained document-heading scale.
- [x] The Register destination focuses on registration and contact, without the separate engagement and funding sections.
- [x] Production seeds contain no registrations, donor data, credentials, tokens, or personal accounts.
- [x] Every production Convex deploy and production seed automatically creates a checksummed full snapshot, including authentication records and stored files.
- [x] Production is the editorial source of truth; development may be refreshed from production only after separate backups of both deployments.
- [ ] Production backup/export and restore drill before launch.
- [ ] `Interim (5 October 2026)`: D1 export backup and restore drill before launch.
- [x] Automated and manual accessibility pass covers keyboard navigation, focus, contrast, reduced motion, form errors and chart data-table alternatives. `Partial`: final third-party audit remains a launch-day check.
- [x] GitHub issue #52 — committee and advisory designations use prominent, high-contrast labels that remain readable on compact screens and wrap longer roles safely.
- [x] Responsive QA covers compact mobile, tablet and desktop layouts. `Partial`: final physical-device and Safari/Firefox sign-off remains.
- [x] All 20 public routes are browser-verified without horizontal overflow at 320px, 390px, 768px, 1024px, and 1280px.
- [x] Mobile navigation fits a 320px viewport, scrolls vertically, wraps long labels, preserves touch targets, and exposes Programme and Partners.
- [x] Support forms, public document layouts, long editorial headings, shared footer content, and homepage record grids have explicit compact and tablet treatments.
- [x] Hero countdown digits, separators, labels, live indicator, and date row fit without clipping at 320px and 360px compact-phone widths.
- [x] Visitor-facing placeholder sweep completed; empty states are neutral and operational “coming soon” messages remain intentionally tied to availability settings.
- [ ] Content approval, legal/privacy approval, analytics/consent decision, and launch checklist.
