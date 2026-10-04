-- Summit website D1 schema (ported from convex/schema.ts + better-auth).
-- Conventions: Convex _id -> TEXT PRIMARY KEY (preserved on import, else
-- crypto.randomUUID()); numbers -> INTEGER; booleans -> INTEGER 0/1;
-- string arrays -> JSON TEXT; Convex _storage ids -> TEXT R2 object keys.

CREATE TABLE adminUsers (
  id TEXT PRIMARY KEY,
  authUserId TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'editor', 'mail_manager')),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX by_adminUsers_auth_user_id ON adminUsers (authUserId);
CREATE INDEX by_adminUsers_email ON adminUsers (email);
CREATE INDEX by_adminUsers_status ON adminUsers (status);

CREATE TABLE siteSettings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  eventName TEXT NOT NULL,
  shortName TEXT NOT NULL,
  theme TEXT NOT NULL,
  eventStartIso TEXT NOT NULL,
  eventEndIso TEXT NOT NULL,
  timezone TEXT NOT NULL,
  venue TEXT NOT NULL,
  address TEXT NOT NULL,
  cityCountry TEXT NOT NULL,
  format TEXT NOT NULL,
  delegateInfo TEXT NOT NULL,
  languages TEXT NOT NULL,
  announcement TEXT NOT NULL,
  announcementEnabled INTEGER NOT NULL,
  contactEmail TEXT NOT NULL,
  registrationEmail TEXT NOT NULL,
  pressEmail TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  facebookUrl TEXT NOT NULL,
  xUrl TEXT NOT NULL,
  instagramUrl TEXT NOT NULL,
  youtubeUrl TEXT NOT NULL,
  linkedinUrl TEXT,
  heroEyebrow TEXT NOT NULL,
  heroTitleLine1 TEXT NOT NULL,
  heroTitleLine2 TEXT NOT NULL,
  heroLead TEXT NOT NULL,
  whyTitle TEXT NOT NULL,
  whyBody TEXT NOT NULL,
  donationEyebrow TEXT NOT NULL,
  donationTitle TEXT NOT NULL,
  donationBody TEXT NOT NULL,
  bankTransferEyebrow TEXT,
  bankTransferTitle TEXT,
  bankTransferBody TEXT,
  bankAccountLabel TEXT,
  bankName TEXT,
  bankAccountName TEXT,
  bankIban TEXT,
  bankBic TEXT,
  usBankAccountLabel TEXT,
  usBankName TEXT,
  usBankAccountName TEXT,
  usBankRoutingNumber TEXT,
  usBankAccountNumber TEXT,
  usBankSwift TEXT,
  registrationFeeLabel TEXT,
  registrationFeeTitle TEXT,
  registrationFeeBody TEXT,
  registrationFeeEmail TEXT,
  forumPackagesMenuLabel TEXT,
  accommodationPackageLabel TEXT,
  accommodationPackageTitle TEXT,
  accommodationPackageIntro TEXT,
  sponsorshipPackageLabel TEXT,
  sponsorshipPackageTitle TEXT,
  sponsorshipPackageIntro TEXT,
  footerTitle TEXT NOT NULL,
  footerBody TEXT NOT NULL,
  registrationOpen INTEGER NOT NULL,
  donationsEnabled INTEGER NOT NULL,
  logoR2Key TEXT,
  faviconR2Key TEXT,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_siteSettings_key ON siteSettings (key);

CREATE TABLE cmsEntries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  eyebrow TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  secondaryText TEXT NOT NULL,
  country TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  linkLabel TEXT NOT NULL,
  linkUrl TEXT NOT NULL,
  dateLabel TEXT NOT NULL,
  timeLabel TEXT NOT NULL,
  parentSlug TEXT NOT NULL,
  imageR2Key TEXT,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  featured INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX by_cmsEntries_slug ON cmsEntries (slug);
CREATE INDEX by_cmsEntries_cat_status_order ON cmsEntries (category, status, "order");
CREATE INDEX by_cmsEntries_cat_order ON cmsEntries (category, "order");

CREATE TABLE homeBanners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  imageR2Key TEXT NOT NULL,
  altText TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  updatedAt INTEGER NOT NULL
);
CREATE INDEX by_homeBanners_status_order ON homeBanners (status, "order");

CREATE TABLE programmeDays (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  tabLabel TEXT NOT NULL,
  navigationLabel TEXT NOT NULL,
  dateLabel TEXT NOT NULL,
  summary TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_programmeDays_slug ON programmeDays (slug);
CREATE INDEX by_programmeDays_status_order ON programmeDays (status, "order");

CREATE TABLE programmeSessions (
  id TEXT PRIMARY KEY,
  daySlug TEXT NOT NULL,
  slug TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tag TEXT NOT NULL,
  speakers TEXT NOT NULL,
  location TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  updatedAt INTEGER NOT NULL
);
CREATE INDEX by_programmeSessions_day_status_order ON programmeSessions (daySlug, status, "order");
CREATE INDEX by_programmeSessions_day_order ON programmeSessions (daySlug, "order");

CREATE TABLE chartSeries (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  eyebrow TEXT NOT NULL,
  description TEXT NOT NULL,
  sourceLabel TEXT NOT NULL,
  sourceUrl TEXT NOT NULL,
  unit TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_chartSeries_slug ON chartSeries (slug);
CREATE INDEX by_chartSeries_status_order ON chartSeries (status, "order");

CREATE TABLE chartPoints (
  id TEXT PRIMARY KEY,
  seriesSlug TEXT NOT NULL,
  label TEXT NOT NULL,
  sublabel TEXT NOT NULL,
  value REAL NOT NULL,
  "order" INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX by_chartPoints_series_order ON chartPoints (seriesSlug, "order");

CREATE TABLE regionalCountries (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  eyebrow TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT NOT NULL,
  sourceUrl TEXT,
  imageR2Key TEXT,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_regionalCountries_slug ON regionalCountries (slug);
CREATE INDEX by_regionalCountries_status_order ON regionalCountries (status, "order");

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  organizationRole TEXT CHECK (organizationRole IN ('organizing', 'managing', 'supporting')),
  kind TEXT NOT NULL CHECK (kind IN ('partner', 'sponsor')),
  tier TEXT NOT NULL CHECK (tier IN ('strategic', 'knowledge', 'community', 'supporting')),
  description TEXT NOT NULL,
  websiteUrl TEXT,
  logoR2Key TEXT,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_organizations_slug ON organizations (slug);
CREATE INDEX by_organizations_status_order ON organizations (status, "order");
CREATE INDEX by_organizations_kind_status_order ON organizations (kind, status, "order");

CREATE TABLE mediaSections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_mediaSections_slug ON mediaSections (slug);
CREATE INDEX by_mediaSections_status_order ON mediaSections (status, "order");

CREATE TABLE mediaItems (
  id TEXT PRIMARY KEY,
  sectionSlug TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  mediaType TEXT CHECK (mediaType IN ('document', 'photo', 'video')),
  coverR2Key TEXT,
  fileR2Key TEXT,
  fileName TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  youtubeUrl TEXT,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  updatedAt INTEGER NOT NULL
);
CREATE INDEX by_mediaItems_slug ON mediaItems (slug);
CREATE INDEX by_mediaItems_section_status_order ON mediaItems (sectionSlug, status, "order");
CREATE INDEX by_mediaItems_section_order ON mediaItems (sectionSlug, "order");

CREATE TABLE statements (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  releaseDate TEXT NOT NULL,
  fileR2Key TEXT NOT NULL,
  fileName TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_statements_slug ON statements (slug);
CREATE INDEX by_statements_status_date_order ON statements (status, releaseDate, "order");

CREATE TABLE donationTiers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  amountCents INTEGER,
  description TEXT NOT NULL,
  stripePriceId TEXT,
  customAmount INTEGER NOT NULL,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_donationTiers_slug ON donationTiers (slug);
CREATE INDEX by_donationTiers_status_order ON donationTiers (status, "order");

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('registration', 'support', 'contact', 'sponsorship', 'volunteer', 'media')),
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  organization TEXT NOT NULL,
  attendingAs TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  consent INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'in_progress', 'resolved', 'archived')),
  adminNote TEXT NOT NULL DEFAULT '',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX by_submissions_type_status ON submissions (type, status);
CREATE INDEX by_submissions_status_created ON submissions (status, createdAt);
CREATE INDEX by_submissions_email_created ON submissions (email, createdAt);

CREATE TABLE mailMessages (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  messageId TEXT NOT NULL,
  inReplyTo TEXT,
  "references" TEXT,
  fromAddress TEXT NOT NULL,
  fromName TEXT NOT NULL DEFAULT '',
  toAddresses TEXT NOT NULL DEFAULT '[]',
  ccAddresses TEXT NOT NULL DEFAULT '[]',
  bccAddresses TEXT DEFAULT '[]',
  deliveredAddresses TEXT DEFAULT '[]',
  failedAddresses TEXT DEFAULT '[]',
  deferredAddresses TEXT DEFAULT '[]',
  subject TEXT NOT NULL,
  textBody TEXT NOT NULL DEFAULT '',
  htmlBody TEXT NOT NULL DEFAULT '',
  deliveryStatus TEXT NOT NULL CHECK (deliveryStatus IN ('received', 'queued', 'sent', 'failed')),
  isRead INTEGER NOT NULL DEFAULT 0,
  sentByEmail TEXT,
  providerResponse TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_mailMessages_messageId ON mailMessages (messageId);
CREATE INDEX by_mailMessages_created ON mailMessages (createdAt);
CREATE INDEX by_mailMessages_dir_created ON mailMessages (direction, createdAt);

CREATE TABLE mailContacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX by_mailContacts_email ON mailContacts (email);
CREATE INDEX by_mailContacts_updated ON mailContacts (updatedAt);

CREATE TABLE mailAttachments (
  id TEXT PRIMARY KEY,
  messageId TEXT NOT NULL REFERENCES mailMessages(id),
  fileName TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  byteSize INTEGER NOT NULL,
  contentId TEXT,
  createdAt INTEGER NOT NULL
);
CREATE INDEX by_mailAttachments_message ON mailAttachments (messageId);

CREATE TABLE mailDispatches (
  id TEXT PRIMARY KEY,
  providerMessageId TEXT NOT NULL,
  recipientCount INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE INDEX by_mailDispatches_provider ON mailDispatches (providerMessageId);
CREATE INDEX by_mailDispatches_created ON mailDispatches (createdAt);

CREATE TABLE donations (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL,
  donorName TEXT NOT NULL,
  donorEmail TEXT NOT NULL,
  amountCents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('demo', 'pending', 'paid', 'failed', 'refunded', 'expired')),
  stripeSessionId TEXT,
  stripePaymentIntentId TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_donations_reference ON donations (reference);
CREATE INDEX by_donations_stripe_session ON donations (stripeSessionId);
CREATE INDEX by_donations_status_created ON donations (status, createdAt);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  r2Key TEXT NOT NULL,
  fileName TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  byteSize INTEGER NOT NULL,
  altText TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('logo', 'portrait', 'media', 'document', 'general')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  uploadedBy TEXT,
  uploadedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_assets_r2Key ON assets (r2Key);
CREATE INDEX by_assets_cat_status ON assets (category, status);

CREATE TABLE auditEvents (
  id TEXT PRIMARY KEY,
  actorId TEXT NOT NULL,
  actorEmail TEXT NOT NULL,
  action TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  summary TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE INDEX by_auditEvents_actor_created ON auditEvents (actorId, createdAt);
CREATE INDEX by_auditEvents_created ON auditEvents (createdAt);

-- better-auth core tables (session cutover target; auth still on Convex until then).
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX by_user_email ON user (email);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES user(id)
);
CREATE UNIQUE INDEX by_session_token ON session (token);
CREATE INDEX by_session_user ON session (userId);

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id),
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX by_account_user ON account (userId);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX by_verification_identifier ON verification (identifier);
