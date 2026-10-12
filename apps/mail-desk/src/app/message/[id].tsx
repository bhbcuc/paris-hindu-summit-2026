import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useRef } from "react"
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native"

import { AuthenticatedScreen } from "@/components/authenticated-screen"
import { NativeButton } from "@/components/native-button"
import { Card, Screen } from "@/components/screen"
import { apiFetch, useMailApi, type MailMessage } from "@/lib/api"
import { palette, useSummitTheme } from "@/theme"

export default function MessageRoute() {
  return <AuthenticatedScreen><MessageScreen /></AuthenticatedScreen>
}

function MessageScreen() {
  const theme = useSummitTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: messages } = useMailApi<MailMessage[]>("/mail/messages")
  const message = messages?.find((item) => item._id === id)
  const replyAddress = message?.direction === "incoming"
    ? message.fromAddress
    : message?.toAddresses.join(", ") ?? ""
  const marked = useRef(false)
  useEffect(() => {
    if (message && !message.isRead && !marked.current) {
      marked.current = true
      void apiFetch("/mail/read", { method: "POST", body: { id: message._id } })
    }
  }, [message])

  function confirmDelete() {
    if (!message) return
    Alert.alert("Delete message history?", "This removes the stored message and its attachment metadata. This cannot be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await apiFetch(`/mail/messages/${message._id}`, { method: "DELETE" }); router.back() } }])
  }

  return <AuthenticatedScreen><Screen><ScrollView contentContainerStyle={styles.content}>{!message ? <Text style={{ color: theme.muted }}>{messages ? "Message not found." : "Loading…"}</Text> : <><Text style={[styles.subject, { color: theme.text }]}>{message.subject || "(No subject)"}</Text><Card><Text style={[styles.from, { color: theme.text }]}>{message.direction === "incoming" ? message.fromName || message.fromAddress : "Paris Hindu Summit 2026"}</Text><Text style={[styles.meta, { color: theme.muted }]}>From: {message.fromAddress}</Text><Text style={[styles.meta, { color: theme.muted }]}>To: {message.toAddresses.join(", ")}</Text>{message.ccAddresses.length ? <Text style={[styles.meta, { color: theme.muted }]}>Cc: {message.ccAddresses.join(", ")}</Text> : null}<Text style={[styles.meta, { color: message.deliveryStatus === "failed" ? palette.danger : theme.muted }]}>Status: {message.deliveryStatus}</Text></Card>{message.deliveryStatus === "failed" && message.providerResponse ? <Card style={{ borderColor: palette.danger }}><Text style={[styles.label, { color: palette.danger }]}>DELIVERY FAILURE</Text><Text selectable style={[styles.failure, { color: theme.text }]}>{message.providerResponse}</Text></Card> : null}<Text selectable style={[styles.body, { color: theme.text }]}>{message.textBody || "This message has no plain-text body."}</Text>{message.attachments.length ? <Card><Text style={[styles.label, { color: palette.gold }]}>ATTACHMENTS</Text>{message.attachments.map((file) => <Text key={file.fileName} style={[styles.attachment, { color: theme.text }]}>{file.fileName} · {Math.ceil(file.byteSize / 1024)} KB</Text>)}</Card> : null}<View style={styles.buttons}><NativeButton label="Reply" onPress={() => router.push({ pathname: "/compose", params: { to: replyAddress, subject: message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`, inReplyTo: message.messageId, references: [message.references, message.messageId].filter(Boolean).join(" ") } })} /><NativeButton label="Delete history" variant="outlined" onPress={confirmDelete} /></View></>}</ScrollView></Screen></AuthenticatedScreen>
}

const styles = StyleSheet.create({ content: { padding: 18, paddingBottom: 44, gap: 16 }, subject: { fontSize: 28, lineHeight: 34, fontWeight: "800" }, from: { fontSize: 17, fontWeight: "800", marginBottom: 7 }, meta: { fontSize: 13, lineHeight: 20 }, body: { fontSize: 16, lineHeight: 25, paddingVertical: 8 }, label: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8 }, failure: { fontSize: 13, lineHeight: 20 }, attachment: { fontSize: 14, paddingVertical: 5 }, buttons: { gap: 8, marginTop: 6 } })
