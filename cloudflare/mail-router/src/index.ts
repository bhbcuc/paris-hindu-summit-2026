/// <reference types="@cloudflare/workers-types" />

import PostalMime, { type Address } from "postal-mime"

interface Env {
  CONVEX_MAIL_ENDPOINT: string
  // Hono inbound endpoint, e.g. https://<worker>/api/v1/mail/inbound. When
  // set, every message is archived to BOTH endpoints so the Convex backend
  // (live Vercel production) and the D1 backend (Cloudflare Worker) each keep
  // a complete mail history during the dual-backend interim. Use the same
  // MAIL_INGEST_SECRET value in both backends.
  MAIL_ARCHIVE_ENDPOINT?: string
  FORWARD_TO: string
  MAIL_INGEST_SECRET: string
}

function flattenAddresses(addresses: Address[] | undefined) {
  return (addresses ?? []).flatMap((entry) =>
    entry.group
      ? entry.group.map((member) => member.address)
      : entry.address
        ? [entry.address]
        : []
  )
}

function firstMailbox(address: Address | undefined) {
  if (!address) return { name: "", address: "" }
  if (address.group) return address.group[0] ?? { name: "", address: "" }
  return address
}

async function postArchive(endpoint: string, payload: Record<string, unknown>, secret: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-mail-ingest-secret": secret,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`${endpoint} returned ${response.status}`)
  }
}

async function archiveMessage(message: ForwardableEmailMessage, raw: ArrayBuffer, env: Env) {
  const parsed = await PostalMime.parse(raw)
  const sender = firstMailbox(parsed.from)
  const payload: Record<string, unknown> = {
    messageId: parsed.messageId || message.headers.get("message-id") || crypto.randomUUID(),
    inReplyTo: parsed.inReplyTo,
    references: parsed.references,
    fromAddress: sender.address || message.from,
    fromName: sender.name,
    toAddresses: flattenAddresses(parsed.to).length ? flattenAddresses(parsed.to) : [message.to],
    ccAddresses: flattenAddresses(parsed.cc),
    subject: parsed.subject || "(no subject)",
    textBody: (parsed.text || "").slice(0, 300_000),
    htmlBody: (parsed.html || "").slice(0, 300_000),
    attachments: parsed.attachments.slice(0, 50).map((attachment) => ({
      fileName: attachment.filename || "attachment",
      mimeType: attachment.mimeType,
      byteSize:
        typeof attachment.content === "string"
          ? new TextEncoder().encode(attachment.content).byteLength
          : attachment.content.byteLength,
      contentId: attachment.contentId,
    })),
    receivedAt: parsed.date ? Date.parse(parsed.date) || Date.now() : Date.now(),
  }
  // Deduplicated so a single configured endpoint is posted once; both
  // endpoints are posted in parallel and one failing must not cancel the other.
  const endpoints = [...new Set([env.CONVEX_MAIL_ENDPOINT, env.MAIL_ARCHIVE_ENDPOINT].filter((endpoint): endpoint is string => Boolean(endpoint)))]
  const results = await Promise.allSettled(
    endpoints.map((endpoint) => postArchive(endpoint, payload, env.MAIL_INGEST_SECRET))
  )
  const failures = results
    .map((result, index) => ({ result, endpoint: endpoints[index] }))
    .filter(({ result }) => result.status === "rejected")
  if (failures.length > 0) {
    throw new Error(
      failures
        .map(({ result, endpoint }) =>
          `Mail archive to ${endpoint} failed: ${result.status === "rejected" ? (result.reason instanceof Error ? result.reason.message : "Unknown error") : ""}`
        )
        .join("; ")
    )
  }
}

export default {
  async email(message, env, ctx): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer()
    ctx.waitUntil(
      archiveMessage(message, raw, env).catch((error) => {
        console.error("Mail archive failed", error instanceof Error ? error.message : "Unknown error")
      })
    )

    const destinations = env.FORWARD_TO.split(",")
      .map((address) => address.trim())
      .filter(Boolean)
    await Promise.all(destinations.map((address) => message.forward(address)))
  },
} satisfies ExportedHandler<Env>
