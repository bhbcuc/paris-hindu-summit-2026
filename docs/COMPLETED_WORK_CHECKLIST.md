# Completed Work Checklist

Last verified: 12 October 2026

This is the detailed delivery record for the Paris Hindu Summit 2026 website.
It complements `PRODUCT_SPEC_CHECKLIST.md`, which remains the source of truth
for incomplete work, approvals, and launch dependencies.

## Project foundation

- ✅ Dedicated Next.js project created for the selected Design 06 direction.
- ✅ Previous multi-design exploration preserved separately.
- ✅ Next.js 16 App Router and React 19 foundation.
- ✅ TypeScript, Bun, Tailwind CSS 4, and shadcn/ui integration.
- ✅ Convex database, functions, realtime queries, and file storage.
- ✅ Better Auth email/password authentication integrated with Convex.
- ✅ Shared layouts and reusable public-site components.
- ✅ Shared administrative interface components.
- ✅ Light and dark themes with stored visitor preference.
- ✅ Responsive layouts from compact phones through wide desktop screens.
- ✅ Product specification maintained as a living checklist.
- ✅ README includes setup, architecture, deployment, and administrator guidance.
- ✅ Global public rendering no longer waits for an admin authentication token.
- ✅ Better Auth and Convex authentication initialize client-side after the site or admin shell has loaded.
- ✅ Replaced the heavyweight homepage chart runtime with accessible native HTML/CSS charts.
- ✅ Stabilized the initial announcement/header layout while live settings connect.
- ✅ Paused countdown work in hidden tabs and reduced its active polling rate.
- ✅ Applied reduced-motion-safe spring and blur patterns to section reveals and hero text.
- ✅ Replaced fallback-copy flashes with stable loading silhouettes while managed Convex content resolves.
- ✅ Removed mobile fixed-header backdrop blur to keep scrolling responsive on lower-powered devices.

## Visual system and responsive design

- ✅ Client-selected Design 06 visual language implemented.
- ✅ Paper, cobalt, signal-red, and editorial typography system.
- ✅ Matching dark-mode palette.
- ✅ Persistent theme switcher on public pages.
- ✅ Circle-blur theme transition and matching admin theme control.
- ✅ System-theme preference used on first visit.
- ✅ Fluid hero typography prevents horizontal overflow.
- ✅ Mobile-first hero headline stays in two compact lines without animated word gaps.
- ✅ Long programme headlines wrap cleanly.
- ✅ Day 01 and Day 02 content reflowed for narrow screens.
- ✅ Compact-phone, large-phone, tablet, small-laptop, desktop, and wide-screen passes.
- ✅ Mobile-friendly input and button sizing.
- ✅ Responsive speaker, partner, regional, chart, and footer grids.
- ✅ Deliberate reveal and staggered-entry animation.
- ✅ Animated global toast stack shared by public forms and admin operations.
- ✅ Reduced-motion alternatives.
- ✅ Visible keyboard focus treatment.
- ✅ Generated witness-flame favicon and Apple touch icon.
- ✅ Supplied logo integrated into the site identity.

## Header, navigation, and footer

- ✅ Fixed header remains available while scrolling.
- ✅ Admin-controlled announcement strip and registration link.
- ✅ Structured desktop navigation using shadcn Navigation Menu.
- ✅ Detailed About dropdown.
- ✅ Dynamic Programme dropdown from published programme days.
- ✅ Dynamic Media dropdown from published media records.
- ✅ Dynamic Engage dropdown from published engagement records.
- ✅ Beyond Bangladesh and Support navigation.
- ✅ Desktop Register and Donate actions.
- ✅ Complete mobile navigation.
- ✅ Registration and donation routes available on mobile.
- ✅ Footer navigation columns.
- ✅ Managed contact email and social links.
- ✅ Footer registration, contribution, privacy, and terms links.
- ✅ Responsive footer wrapping.

## Public pages

- ✅ Homepage.
- ✅ About.
- ✅ Historical and human-rights Context.
- ✅ Programme.
- ✅ Speakers.
- ✅ Organizing Committee.
- ✅ Dedicated Advisory Board page and navigation entry.
- ✅ Media and Publications.
- ✅ Participate and Registration.
- ✅ Engage.
- ✅ Beyond Bangladesh Regional Forum.
- ✅ Partners and Sponsors.
- ✅ Support and Contact.
- ✅ Donation demonstration page.
- ✅ Privacy Notice.
- ✅ Terms and Conditions.
- ✅ Protected Admin workspace.
- ✅ Route-level titles and metadata.
- ✅ Branded animated 404 route with Home and Programme recovery paths.
- ✅ Drag/drop upload queues with progress, retry, removal, and inline errors across every admin upload surface.

## Homepage

- ✅ Summit hero with date, location, and calls to action.
- ✅ Responsive 03–04 October date composition.
- ✅ Paris editorial banner.
- ✅ Dynamic Venue, Format, Delegates, and Languages information bar.
- ✅ “Why Paris · Why now” introduction.
- ✅ Admin-managed “Why This Summit” cards.
- ✅ Admin-managed Challenges cards.
- ✅ Evidence statistics band.
- ✅ Editable demographic and displacement charts.
- ✅ Chart sources, tooltips, and accessible data tables.
- ✅ Two-day programme preview.
- ✅ Admin-controlled featured-speaker teaser.
- ✅ Backend maximum of three featured homepage speakers.
- ✅ Homepage uses the first published admin speakers when none is explicitly featured.
- ✅ Full Speakers page has no stale code-data fallback.
- ✅ Stable non-carousel partner and sponsor wall.
- ✅ Dynamic Beyond Bangladesh section including Nepal.
- ✅ Countdown driven by the admin-managed event start time.
- ✅ Closing support and contribution section.

## Programme

- ✅ Purpose-built `programmeDays` and `programmeSessions` models.
- ✅ Indexed public and administrator queries.
- ✅ Published-only public programme data.
- ✅ Day creation, editing, deletion, ordering, draft, and publication.
- ✅ Day tab label, navigation label, date, summary, and order.
- ✅ Session creation, editing, deletion, ordering, draft, and publication.
- ✅ Session times, title, description, tag, speakers, and location.
- ✅ Public programme tabs connected to Convex.
- ✅ Header programme navigation connected to Convex.
- ✅ Two production programme days and four sessions seeded.

## Evidence charts

- ✅ Purpose-built `chartSeries` and `chartPoints` models.
- ✅ Indexed public and administrator queries.
- ✅ Published-only public chart data.
- ✅ Series creation, editing, deletion, ordering, draft, and publication.
- ✅ Title, eyebrow, description, unit, source label, and source URL fields.
- ✅ Point creation, editing, deletion, and ordering.
- ✅ Point labels, supporting labels, and numeric values.
- ✅ Backend validation rejects negative chart values.
- ✅ Recharts and shadcn chart presentation.
- ✅ Equivalent accessible data table for every chart.
- ✅ Two production chart series and six points seeded.

## Beyond Bangladesh

- ✅ Pakistan, Afghanistan, Myanmar, and Nepal regional records.
- ✅ Extensible Convex country model.
- ✅ Administrators can add more countries.
- ✅ Slug, country name, code, eyebrow, headline, summary, and detail fields.
- ✅ Optional managed image and source link.
- ✅ Ordering and draft/published state.
- ✅ Source URL required when an administrator publishes a country.
- ✅ Protected create, edit, delete, order, and publish controls.
- ✅ Public regional cards connected to Convex.

## Partners and sponsors

- ✅ Rotating carousel replaced with a stable institutional wall.
- ✅ Partner and sponsor record types and sponsorship tiers.
- ✅ Description, website, logo, and order fields.
- ✅ Draft and published status.
- ✅ Protected administrator CRUD.
- ✅ Public organisation wall connected to Convex.
- ✅ Initial production organisations seeded.

## Registration, support, and forms

- ✅ Persistent Convex registration workflow.
- ✅ Required first name, last name, email, and WhatsApp number.
- ✅ Optional organisation and notes.
- ✅ Survivor, Delegate, Audience, and Researcher-Speaker options.
- ✅ Delegate selected as the default attendance type.
- ✅ Consent language and privacy link.
- ✅ Honeypot and per-email rate protection.
- ✅ Server-side input trimming and length limits.
- ✅ Unique submission references and success state.
- ✅ Registrations delivered to the protected inbox.
- ✅ Registration and enquiry CSV export.
- ✅ Persistent general-support, contact, sponsorship, volunteer, and media pathways.
- ✅ Submission status management and private organiser notes.
- ✅ Interpretation information for English, French, and Bengali.

## Authentication and access control

- ✅ Better Auth email/password account creation and sign-in.
- ✅ Public Better Auth sign-up disabled after initial administrator bootstrap.
- ✅ Administrator-only Team Access panel.
- ✅ Administrators can provision additional named accounts.
- ✅ Administrator or Editor role selected at provisioning time.
- ✅ Administrators can suspend and restore team access.
- ✅ Editors can review the authorised team but cannot change access.
- ✅ Self-suspension and removal of the last active administrator are blocked.
- ✅ Team account creation and access changes are written to the audit log.
- ✅ Ten-character minimum password.
- ✅ Password visibility toggle on sign-in.
- ✅ Password visibility toggles on both account-creation password fields.
- ✅ Required “Retype password” field during account creation.
- ✅ Client-side password-match validation with an accessible error.
- ✅ Correct browser autocomplete hints for current and new passwords.
- ✅ First-administrator bootstrap process.
- ✅ Later accounts receive no automatic administrator access.
- ✅ Administrator and Editor roles.
- ✅ Convex-side role enforcement.
- ✅ Secure sign-out and protected administrator functions.
- ✅ Production trusted origin configured.
- ✅ Production authentication endpoint verified with HTTP 200.
- ✅ Deployed sign-in and account-creation states verified.

## Admin panel and editable content

- ✅ Full visual Page Studio redesign based on the selected Page Canvas Studio direction.
- ✅ Public-page rail for Home, About, Programme, Speakers, Regional, Partners, Media, Engage, Support, Evidence, extended pages, and shared settings.
- ✅ Live page canvas with desktop, tablet, and mobile preview modes.
- ✅ Selected-page editorial frame and contextual inspector.
- ✅ Page-specific editors shown beside the page they affect.
- ✅ One-action Home-page publishing with saved feedback and live-preview refresh.
- ✅ Website editing separated from Overview, Forms Inbox, Donations, Media Library, Team Access, and Activity operations.
- ✅ Compact responsive admin rail, stacked small-screen workspace, keyboard-visible controls, and reduced-motion handling.
- ✅ Protected editorial dashboard and Global Site Settings.
- ✅ Structured Page Content editor.
- ✅ Programme and Evidence Chart editors.
- ✅ Regional-country and Partner/Sponsor editors.
- ✅ Forms Inbox and Registration management.
- ✅ Donation-record preparation.
- ✅ Media Library and Audit Activity timeline.
- ✅ Administrator-role controls.
- ✅ Draft, publication, feature, and order controls.
- ✅ Destructive-action confirmation dialogs.
- ✅ Success and failure notifications.
- ✅ Public-site preview canvas and direct live-site link.
- ✅ Editable identity, dates, timezone, venue, address, format, delegates, and languages.
- ✅ Editable announcement, contact details, social links, hero, and footer.
- ✅ Editable Overview, Agenda, Resolution, Strategy, and Partnership records.
- ✅ Editable Why, Challenge, Engage, Speaker, Team, and Advisory records.
- ✅ Supplied seminar brief mapped into 68 additional editable CMS records.
- ✅ Three public conference-overview sections.
- ✅ Four-member Advisory Board with editable roles and responsibilities.
- ✅ Fifteen-member Organising Committee with editable responsibilities.
- ✅ Seventeen-part proposed agenda published on a dedicated route.
- ✅ Twelve Paris Resolution commitments plus the Final Declaration.
- ✅ Eight goals for the 2027–2031 strategic action plan.
- ✅ Seven international cooperation areas plus the future institutional framework.
- ✅ “Advisory Council” public navigation renamed to “Advisory Board”.
- ✅ Editable Programme, Media, FAQ, and Legal records.
- ✅ Featured speaker records connected to the homepage.
- ✅ About editor simplified to only Overview and Present Moment content fields.
- ✅ Media & Publication editor contrast corrected for its nested section editor.
- ✅ Public implementation notes removed from partner, regional, evidence, document, media, and contribution sections.
- ✅ Obsolete About and Programme principle sections removed at the client’s request.
- ✅ New dark-blue Present Moment section with six editable pressure cards.
- ✅ Revised About hero copy and “A standing platform, not a single event” headline.

## GitHub issue resolution pass · 27 July 2026

- ✅ Issue #8 — Page Content reorganised into the visual Page Studio with contextual page editors.
- ✅ Issue #9 — obsolete Programme principles and About prelude/purpose sections removed; About hero content replaced.
- ✅ Issue #10 — old shared-principle section removed and the six-card Present Moment section added.
- ✅ Issue #11 — About controls simplified and Media editor readability corrected.
- ✅ Issue #12 — full public-site sweep removed visitor-facing implementation and placeholder notes.
- ✅ Issue #13 — public speaker views now follow the published Convex records instead of showing stale fallback speakers.
- ✅ Page Studio record switching uses labelled dropdowns instead of horizontal scrolling rows.
- ✅ Principal page eyebrows, titles, and introductions are Convex-backed and editable in one Page Titles & Intros inspector.
- ✅ Privacy and Terms records are reachable through the Other Content inspector.
- ✅ Stale code fixtures no longer reappear when regional, partner, or team records are unpublished or removed.
- ✅ Content editability and remaining code-owned editorial copy are documented in `CONTENT_EDITABILITY_AUDIT.md`.
- ✅ Sixty-six page-grouped Editorial Sections records make all remaining visible event editorial modifiable without exposing layout code.
- ✅ Homepage evidence statistics and source note, About outcomes, Context chapters and charter, committee responsibilities, participation pathways, shared header/footer language, donation-state copy, and section framing now publish reactively from Convex.
- ✅ The Editorial Sections inspector uses page and section dropdowns, preserving the visual page structure while giving administrators full copy control.

## Media and Convex storage

- ✅ Convex-managed file uploads.
- ✅ JPEG, PNG, WebP, AVIF, and PDF allowlist; SVG rejected.
- ✅ MIME, extension, file-size, and image-dimension validation.
- ✅ Mandatory custom alternative text.
- ✅ Permanent Convex storage IDs instead of temporary URLs.
- ✅ Resolved storage URLs returned by public queries.
- ✅ Managed asset selection in the CMS editor.
- ✅ Next.js remote-image configuration for Convex.
- ✅ Image-reference database indexes.
- ✅ Referenced CMS, regional, and organisation files protected from deletion.

## Legal, accessibility, and safety

- ✅ CMS-backed Privacy Notice and Terms and Conditions.
- ✅ Visible draft notice until final client approval.
- ✅ Semantic headings, page sections, and clear form labels.
- ✅ Keyboard-accessible navigation, theme controls, and dialogs.
- ✅ Screen-reader chart captions and data tables.
- ✅ Meaningful image alternative text.
- ✅ Loading and submission status messages.
- ✅ Reduced-motion behaviour.
- ✅ Backend validators and explicit return validators.
- ✅ Draft/published content boundary.
- ✅ Audit events and update timestamps.
- ✅ Authentication secrets kept out of public frontend variables.
- ✅ No personal registrations, credentials, or donor data in production seeds.

## Production, verification, and source control

- ✅ Completed a route-by-route responsive audit of all 20 public pages at 320px, 390px, 768px, 1024px, and 1280px.
- ✅ Removed horizontal overflow from compact-phone and tablet layouts.
- ✅ Rebuilt the mobile navigation drawer to remain within the viewport, scroll vertically, wrap long destinations, and retain accessible touch targets.
- ✅ Added the previously missing Programme and Partners destinations to mobile navigation.
- ✅ Made Support page columns, pathways, fields, and form padding safe at 320px.
- ✅ Added resilient wrapping and compact sizing for long public editorial headings.
- ✅ Collapsed dense agenda, resolution, strategy, committee, and document layouts for compact screens.
- ✅ Corrected shared footer callout and contact wrapping on narrow devices.
- ✅ Corrected homepage record-grid min-content overflow at the 768px tablet breakpoint.
- ✅ Stabilized the hero flip-clock’s server/client render and moved its keyframes to global CSS, eliminating the countdown hydration mismatch.
- ✅ Corrected the flip-unit attribute passthrough so compact-phone digit sizing is applied; the entire countdown now fits at 320px and 360px without clipping.
- ✅ Recorded the browser QA findings and verification matrix in `dogfood-output/mobile-responsive/report.md`.
- ✅ GitHub issue #1 resolved: public Global Site Settings now reactively reflect admin changes without a Vercel redeployment or cache purge.
- ✅ GitHub issue #2 resolved: Programme sessions are grouped into day-specific admin editors with locked day assignments.
- ✅ GitHub issue #3 resolved: Beyond Bangladesh edits persist even when legacy published records do not yet have citation URLs.
- ✅ GitHub issue #5 resolved: the Regional page starts directly with country details after its page introduction, while the homepage retains the full regional feature introduction.
- ✅ GitHub issue #5 resolved: the formal event name is placed beneath the short footer title instead of competing with it inline.
- ✅ GitHub issue #6 resolved: partner and sponsor editors support direct Convex logo upload, managed-logo selection, replacement, and removal.
- ✅ Partner and sponsor cards display the organisation name together with its attached logo.
- ✅ GitHub issue #7 resolved: the programme editor clearly identifies draft visibility and can publish all prepared days and sessions in one action.
- ✅ GitHub issue #8 resolved: the generic Page Content workflow is replaced by page-specific Agenda, Resolution, Strategic Plan, Partnership, Speakers, Team/Board, and Media & Publication editors.
- ✅ Media & Publication has dynamic submenu sections plus title, description, optional cover, and downloadable-file uploads for every item.
- ✅ Speakers, Organizing Team, and Advisory Board have direct portrait upload, short-introduction, biography, ordering, draft, and publication controls.
- ✅ Proposed Agenda, Paris Resolution, 5-Year Strategic Plan, and International Partnership Framework expose the client-requested field names and public layouts.
- ✅ The Strategic Plan includes an editable Vision and five editable Implementation Timeline cards for 2027–2031.
- ✅ Seeded Books, Government Reports, and Research & Briefings publication sections in development and production.
- ✅ Production programme repair safely removes completely empty session rows and publishes prepared session drafts without altering their content.
- ✅ Directory-editor mutation failures now remain on screen and show an actionable error instead of appearing to revert.
- ✅ Animated flip-clock countdown added to the landing-page hero.
- ✅ Hero countdown reads its target date and timezone from editable Global Site Settings.
- ✅ Countdown includes responsive compact-phone treatment and reduced-motion behaviour.
- ✅ Latest Convex schema and functions deployed to production.
- ✅ Durable, deployment-scoped Convex deploy keys created separately for
  development and production.
- ✅ Convex deployment commands no longer depend on the currently logged-in
  CLI account.
- ✅ Production chart, programme, and storage-reference indexes deployed.
- ✅ Production content seed completed.
- ✅ Ninety-three CMS records seeded.
- ✅ Two chart series, six chart points, two programme days, and four sessions seeded.
- ✅ Four regional countries and four organisations updated.
- ✅ Three Media & Publication submenu sections seeded.
- ✅ Global settings and four demonstration tiers seeded.
- ✅ Production programme, chart, and regional queries verified.
- ✅ `bun run typecheck`, `bun run lint`, and `bun run build` pass.
- ✅ All application routes compile.
- ✅ `git diff --check` passes.
- ✅ Vercel Convex endpoint requirements documented.
- ✅ Production Better Auth origin corrected.
- ✅ GitHub repository is the source of truth.
- ✅ Latest completed work pushed to `master`.
- ✅ GitHub issue #26 resolved: partner and sponsor cards now use a balanced uniform grid with compact logo plaques and restrained organisation names.
- ✅ GitHub issue #27 resolved: repeat seeds no longer resurrect chart series or points deleted by an administrator.
- ✅ Initial-content seeding is now a site-wide first-install-only operation; existing Admin content and intentional deletions are preserved across deployments and accidental repeat seed commands.
- ✅ Production content protection is fail-closed: production seed commands are blocked and retired CLI migrations/repair functions are removed from the deployed API.
- ✅ Programme, Engage, FAQ, legal, and long-form managed content keep stable loading geometry until live Convex records resolve.
- ✅ GitHub issue #28 resolved: media saves no longer send unsupported undefined values, and replacing an item clears stale optional media fields.
- ✅ GitHub issue #30 resolved: refined editorial palette, larger hero date, more readable Agenda headings, and a three-column Team-style Advisory Board.
- ✅ GitHub issue #32 resolved: unified structured-document typography, streamlined Register page, and revised Contact and homepage evidence copy.
- ✅ Reopened GitHub issue #28 resolved: hardened gallery saves against incomplete slugs, stale section/file selections, irrelevant optional fields, and client-supplied file metadata.
- ✅ GitHub issue #43 resolved: footer social links use recognisable Facebook, X/Twitter, Instagram, LinkedIn, and YouTube icons, with protected Admin fields and quiet placeholders for unconfigured networks.
- ✅ GitHub issue #44 resolved: gallery cards preserve complete image framing and open in a keyboard-accessible, mobile-first lightbox instead of a new tab.

## Intentionally not activated

- ✅ Online payments are permanently out of scope at the organiser’s request (October 2026): no provider, checkout, tier, ledger, receipt, or activation work ships on either stack.
- ✅ Population Share and Displacement charts remain published and editable; the Admin Evidence preview now targets their live homepage section.

## Cloudflare migration (October 2026)

- ✅ Web app runs on Cloudflare Workers (vinext) with a Hono API on D1/R2; no `convex/react` in web code.
- ✅ Donation tier/checkout/ledger machinery removed from the Worker, web UI, admin portal, and D1 (`0005_drop_donations.sql`); `/donate` is bank-transfer information only.
- ✅ Expo mail-desk app migrated to Worker better-auth and the Hono admin mail API; Convex dependencies removed.
- ✅ Mail router dual-archives inbound mail to Convex and D1 during the interim.
- ✅ Hono `/mail/read` defaults to mark-read and single messages accept Bcc, matching the retired Convex-era behaviour.
- ✅ Production carry-over runs through authenticated Admin writes per `CLOUDFLARE_PROD_CARRYOVER.md`; bulk import into production stays refused.
