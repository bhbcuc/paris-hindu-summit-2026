-- Per-key fixed-window counters for public-write abuse controls
-- (server/app.ts checkRateLimit: submissions + donation intents).
-- Counters are best-effort (a lost row only weakens one window); failed
-- opens fall back to allowing the request so D1 trouble never 500s writes.
CREATE TABLE rateLimits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  windowStart INTEGER NOT NULL
);
