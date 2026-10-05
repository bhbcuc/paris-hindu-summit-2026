-- Online payments removed: drop Stripe columns (bank transfer only).
--
-- Re-runnable safety: the index drop is idempotent (DROP INDEX IF EXISTS), but
-- SQLite has no conditional drop-column, so the three ALTER TABLE ... DROP
-- COLUMN statements below are *not* individually re-runnable. They are applied
-- exactly once, guarded by the d1_migrations ledger row for this file: apply
-- with scripts/d1-migrate.mjs (bun run db:migrate:dev), never by pasting this
-- file into cf d1 query by hand. If this file ever needs re-running, drop the
-- ledger row first and expect the DROP COLUMN statements to fail.
DROP INDEX IF EXISTS by_donations_stripe_session;
ALTER TABLE donationTiers DROP COLUMN stripePriceId;
ALTER TABLE donations DROP COLUMN stripeSessionId;
ALTER TABLE donations DROP COLUMN stripePaymentIntentId;
