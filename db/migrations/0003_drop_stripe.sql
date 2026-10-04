-- Online payments removed: drop Stripe columns (bank transfer only).
DROP INDEX by_donations_stripe_session;
ALTER TABLE donationTiers DROP COLUMN stripePriceId;
ALTER TABLE donations DROP COLUMN stripeSessionId;
ALTER TABLE donations DROP COLUMN stripePaymentIntentId;
