/// <reference types="@cloudflare/workers-types" />

import PostalMime, { type Address } from "postal-mime"

interface Env {
  CONVEX_MAIL_ENDPOINT: string
  // TODO: point at https://<worker>/api/v1/mail/inbound once the production
  // worker URL is known, so inbound mail lands in D1 instead of Convex.
  // Overrides CONVEX_MAIL_ENDPOINT when set.
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

async function archiveMessage(message: ForwardableEmailMessage, raw: ArrayBuffer, env: Env) {
  const parsed = await PostalMime.parse(raw)
  const sender = firstMailbox(parsed.from)
  const archiveEndpoint = env.MAIL_ARCHIVE_ENDPOINT || env.CONVEX_MAIL_ENDPOINT
  const response = await fetch(archiveEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-mail-ingest-secret": env.MAIL_INGEST_SECRET,
    },
    body: JSON.stringify({
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
    }),
  })
  if (!response.ok) {
    throw new Error(`Convex mail archive returned ${response.status}`)
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
