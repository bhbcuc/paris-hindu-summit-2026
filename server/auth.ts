import { kyselyAdapter } from "@better-auth/kysely-adapter"
import { betterAuth, type BetterAuthOptions } from "better-auth"
import {
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type DatabaseConnection,
  type Driver,
  type QueryResult,
} from "kysely"

import type { SummitEnv } from "./db"

// better-auth on Workers with D1 (replaces @convex-dev/better-auth).
// Sessions/users/accounts were imported from the Convex snapshot, so existing
// logins keep working as long as BETTER_AUTH_SECRET matches. The Expo mobile
// app still authenticates against the Convex deployment (untouched).

interface AuthTables {
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: Date | number
    updatedAt: Date | number
  }
  session: {
    id: string
    expiresAt: Date | number
    token: string
    createdAt: Date | number
    updatedAt: Date | number
    ipAddress: string | null
    userAgent: string | null
    userId: string
  }
  account: {
    id: string
    accountId: string
    providerId: string
    userId: string
    accessToken: string | null
    refreshToken: string | null
    idToken: string | null
    accessTokenExpiresAt: Date | number | null
    refreshTokenExpiresAt: Date | number | null
    scope: string | null
    password: string | null
    createdAt: Date | number
    updatedAt: Date | number
  }
  verification: {
    id: string
    identifier: string
    value: string
    expiresAt: Date | number
    createdAt: Date | number
    updatedAt: Date | number
  }
}

class D1Connection implements DatabaseConnection {
  constructor(private db: D1Database) {}
  async executeQuery<R>(compiledQuery: {
    sql: string
    parameters: readonly unknown[]
  }): Promise<QueryResult<R>> {
    const result = await this.db
      .prepare(compiledQuery.sql)
      .bind(...(compiledQuery.parameters as unknown[]))
      .all<R>()
    return {
      rows: result.results ?? [],
    }
  }
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("D1 does not support streaming queries.")
  }
}

class D1Driver implements Driver {
  private connection: D1Connection | null = null
  constructor(private db: D1Database) {}
  async init() {
    this.connection = new D1Connection(this.db)
  }
  async acquireConnection() {
    return this.connection ?? new D1Connection(this.db)
  }
  async beginTransaction() {
    throw new Error("D1 does not support interactive transactions.")
  }
  async commitTransaction() {
    throw new Error("D1 does not support interactive transactions.")
  }
  async rollbackTransaction() {
    throw new Error("D1 does not support interactive transactions.")
  }
  async releaseConnection() {}
  async destroy() {}
  get isTransactionDriver() {
    return false
  }
}

export function createD1Kysely(db: D1Database) {
  return new Kysely<AuthTables>({
    dialect: {
      createAdapter: () => new SqliteAdapter(),
      createDriver: () => new D1Driver(db) as unknown as Driver,
      createIntrospector: (kysely) => new SqliteIntrospector(kysely),
      createQueryCompiler: () => new SqliteQueryCompiler(),
    },
  })
}

const TRUSTED_ORIGINS = [
  "https://www.parishindusummit.org",
  "https://parishindusummit.org",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3111",
]

export function getAuth(env: SummitEnv, origin: string) {
  // Extra origins (preview deployments, alternate domains) come from the
  // comma-separated EXTRA_TRUSTED_ORIGINS plain-text var; entries are trimmed
  // and empty items dropped so a trailing comma cannot widen trust.
  const extraOrigins = (env.EXTRA_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
  const options = {
    baseURL: env.BETTER_AUTH_URL ?? origin,
    trustedOrigins: [...TRUSTED_ORIGINS, env.BETTER_AUTH_URL ?? origin, ...extraOrigins],
    secret: env.BETTER_AUTH_SECRET,
    database: kyselyAdapter(createD1Kysely(env.DB), { type: "sqlite" }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: env.ALLOW_INITIAL_ADMIN_SIGNUP !== "true",
      requireEmailVerification: false,
      minPasswordLength: 10,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
  } satisfies BetterAuthOptions
  return betterAuth(options)
}

export interface SessionActor {
  id: string
  name: string
  email: string
}

export async function getSessionUser(
  env: SummitEnv,
  request: Request
): Promise<SessionActor | null> {
  try {
    const auth = getAuth(env, new URL(request.url).origin)
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return null
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    }
  } catch {
    return null
  }
}

export interface AdminRecord {
  _id: string
  name: string
  email: string
  role: "administrator" | "editor" | "mail_manager"
  status: "active" | "suspended"
}

// Port of convex/lib/admin getAdmin (mail=false) and getMailOperator (mail=true).
export async function requireAdminUser(
  env: SummitEnv,
  request: Request,
  options: { mail?: boolean } = {}
): Promise<{ user: SessionActor; admin: AdminRecord } | Response> {
  const user = await getSessionUser(env, request)
  if (!user) {
    return Response.json({ error: "Sign in is required." }, { status: 401 })
  }
  const admin = await env.DB.prepare("SELECT * FROM adminUsers WHERE authUserId = ?")
    .bind(user.id)
    .first<AdminRecord & { authUserId: string }>()
  if (!admin || admin.status !== "active") {
    return Response.json({ error: "Administrator access is required." }, { status: 403 })
  }
  if (options.mail) {
    if (admin.role !== "administrator" && admin.role !== "mail_manager") {
      return Response.json({ error: "Mail desk access is required." }, { status: 403 })
    }
  } else if (admin.role === "mail_manager") {
    return Response.json({ error: "Editorial administrator access is required." }, { status: 403 })
  }
  return {
    user,
    admin: {
      _id: (admin as unknown as { id: string }).id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    },
  }
}

export async function adminIdentity(env: SummitEnv, request: Request) {
  return requireAdminUser(env, request)
}

export async function mailIdentity(env: SummitEnv, request: Request) {
  return requireAdminUser(env, request, { mail: true })
}
