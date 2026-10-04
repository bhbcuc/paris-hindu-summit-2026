import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "summit-website",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-04",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
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
      DB: bindings.d1({
        id: "b9d39325-0be9-4e4b-a935-2d39b6f6512b",
        name: "summit-db",
      }),
      SUMMIT_ASSETS: bindings.r2({
        name: "summit-assets",
      }),
      ADMIN_API_TOKEN: bindings.secret(),
      MAIL_INGEST_SECRET: bindings.secret(),
      STRIPE_SECRET_KEY: bindings.secret(),
      STRIPE_WEBHOOK_SECRET: bindings.secret(),
      BETTER_AUTH_SECRET: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      ALLOW_INITIAL_ADMIN_SIGNUP: bindings.secret(),
    },
  }),
});
