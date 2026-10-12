-- Online payments permanently removed (organiser decision, October 2026): drop
-- the donation tier and ledger tables. The /donate page stays as bank-transfer
-- information only, driven by the siteSettings donation/bank copy columns and
-- the donationsEnabled visibility toggle, which this migration keeps.
--
-- Re-runnable safety: DROP TABLE has no IF EXISTS guard issue here — both
-- statements below use IF EXISTS, so re-applying after a partial failure is
-- safe. Like every migration, this file applies exactly once, guarded by the
-- d1_migrations ledger row: apply with scripts/d1-migrate.mjs
-- (bun run db:migrate:dev), never by pasting this file into cf d1 query by
-- hand. Dropping a table also drops its indexes.
DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS donationTiers;
