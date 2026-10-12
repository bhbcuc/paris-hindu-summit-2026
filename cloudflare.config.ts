import { bindings, defineConfig, defineWorker } from "cf/config";

// Production uses summit-db / summit-assets. Development mode
// (`cf deploy --mode development`, `cf dev --mode development`) and Worker
// Previews (`cf previews deploy`, isPreview) use the isolated -dev resources
// so branch work never touches production data.
export default defineConfig(({ mode, isPreview }) => {
  const dev = mode === "development" || isPreview;
  return {
    worker: defineWorker({
      name: dev ? "summit-website-dev" : "summit-website",
      entrypoint: "vinext/server/fetch-handler",
      compatibilityDate: "2026-10-04",
      compatibilityFlags: ["nodejs_compat"],
      assets: { notFoundHandling: "none" },
      domains: dev ? [] : ["parishindusummit.org", "www.parishindusummit.org"],
      workersDev: true,
      observability: {
        enabled: true,
        logs: {
          enabled: true,
          persist: true,
        },
        traces: {
          enabled: true,
          persist: true,
        },
        issues: {
          enabled: true,
        },
      },
      env: {
        ASSETS: bindings.assets(),
        IMAGES: bindings.images(),
        DB: bindings.d1(
          dev
            ? {
                id: "63367dc8-c973-41b2-95ab-a93472fe48a8",
                name: "summit-db-dev",
              }
            : {
                id: "b9d39325-0be9-4e4b-a935-2d39b6f6512b",
                name: "summit-db",
              }
        ),
        SUMMIT_ASSETS: bindings.r2({
          name: dev ? "summit-assets-dev" : "summit-assets",
        }),
        ADMIN_API_TOKEN: bindings.secret(),
        MAIL_INGEST_SECRET: bindings.secret(),
        BETTER_AUTH_SECRET: bindings.secret(),
        RESEND_API_KEY: bindings.secret(),
        ALLOW_INITIAL_ADMIN_SIGNUP: bindings.secret(),
      },
    }),
  };
});
