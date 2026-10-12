import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "paris-hindu-summit-mail-router",
		compatibilityDate: "2026-08-01",
		entrypoint: "src/index.ts",
		workersDev: false,
		env: {
			CONVEX_MAIL_ENDPOINT: bindings.text("https://amiable-dogfish-765.convex.site/mail/inbound"),
			MAIL_ARCHIVE_ENDPOINT: bindings.text("https://summit-website.venue-mind.workers.dev/api/v1/mail/inbound"),
			FORWARD_TO: bindings.text("seyamalam41@gmail.com"),
			// Worker secret, set outside this file. Must match MAIL_INGEST_SECRET
			// on the summit-website Worker and in Convex prod. Deploying never
			// overwrites the stored secret value.
			MAIL_INGEST_SECRET: bindings.secret(),
		},
	},
});
