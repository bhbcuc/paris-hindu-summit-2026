import { apiFetch } from "@/lib/api"

export type OutboundAttachment = {
  fileName: string
  mimeType: string
  byteSize: number
  contentBase64: string
}

export type SendResult = {
  messageId: string
  providerMessageId: string
  recipientCount: number
  status: string
}

export async function sendMail(body: Record<string, unknown>) {
  return apiFetch<SendResult>("/mail/send", { method: "POST", body })
}
