-- Match Convex semantics: `.index("by_slug")` is non-unique. Prod data
-- contains a duplicate organizations slug, so UNIQUE was wrong here.
DROP INDEX by_programmeDays_slug;
CREATE INDEX by_programmeDays_slug ON programmeDays (slug);
DROP INDEX by_regionalCountries_slug;
CREATE INDEX by_regionalCountries_slug ON regionalCountries (slug);
DROP INDEX by_organizations_slug;
CREATE INDEX by_organizations_slug ON organizations (slug);
DROP INDEX by_mediaSections_slug;
CREATE INDEX by_mediaSections_slug ON mediaSections (slug);
DROP INDEX by_statements_slug;
CREATE INDEX by_statements_slug ON statements (slug);
DROP INDEX by_donationTiers_slug;
CREATE INDEX by_donationTiers_slug ON donationTiers (slug);
DROP INDEX by_chartSeries_slug;
CREATE INDEX by_chartSeries_slug ON chartSeries (slug);
