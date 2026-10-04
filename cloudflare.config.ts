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
    },
  }),
});
