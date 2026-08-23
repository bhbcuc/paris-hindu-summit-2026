/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as assets from "../assets.js";
import type * as auth from "../auth.js";
import type * as banners from "../banners.js";
import type * as charts from "../charts.js";
import type * as cms from "../cms.js";
import type * as content from "../content.js";
import type * as donations from "../donations.js";
import type * as forms from "../forms.js";
import type * as forumPackageData from "../forumPackageData.js";
import type * as forumPackages from "../forumPackages.js";
import type * as http from "../http.js";
import type * as lib_admin from "../lib/admin.js";
import type * as mail from "../mail.js";
import type * as media from "../media.js";
import type * as programme from "../programme.js";
import type * as programmeData from "../programmeData.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as statements from "../statements.js";
import type * as stripe from "../stripe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  assets: typeof assets;
  auth: typeof auth;
  banners: typeof banners;
  charts: typeof charts;
  cms: typeof cms;
  content: typeof content;
  donations: typeof donations;
  forms: typeof forms;
  forumPackageData: typeof forumPackageData;
  forumPackages: typeof forumPackages;
  http: typeof http;
  "lib/admin": typeof lib_admin;
  mail: typeof mail;
  media: typeof media;
  programme: typeof programme;
  programmeData: typeof programmeData;
  seed: typeof seed;
  settings: typeof settings;
  statements: typeof statements;
  stripe: typeof stripe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
