import { Link, router } from "expo-router"
import { useMemo, useState } from "react"
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native"

import { AuthenticatedScreen } from "@/components/authenticated-screen"
import { NativeButton } from "@/components/native-button"
import { Card, Screen } from "@/components/screen"
import { useMailApi, type MailAllowance, type MailMessage } from "@/lib/api"
import { authClient } from "@/lib/auth-client"
import { palette, useSummitTheme } from "@/theme"

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(value)
}

export default function InboxRoute() {
  return <AuthenticatedScreen><InboxScreen /></AuthenticatedScreen>
}

function InboxScreen() {
  const theme = useSummitTheme()
  const { data: messages, refresh: refreshMessages } = useMailApi<MailMessage[]>("/mail/messages")
  const { data: allowance, refresh: refreshAllowance } = useMailApi<MailAllowance>("/mail/allowance")
  const [search, setSearch] = useState("")
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return messages ?? []
    return (messages ?? []).filter((mail) => `${mail.fromName} ${mail.fromAddress} ${mail.toAddresses.join(" ")} ${mail.subject} ${mail.textBody}`.toLowerCase().includes(query))
  }, [messages, search])
  const unread = (messages ?? []).filter((mail) => !mail.isRead).length

  return (
    <AuthenticatedScreen>
      <Screen>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={messages === undefined} tintColor={palette.gold} onRefresh={() => { refreshMessages(); refreshAllowance() }} />}
          ListHeaderComponent={<>
            <View style={styles.brandRow}><View><Text style={[styles.kicker, { color: palette.gold }]}>SUMMIT CORRESPONDENCE</Text><Text style={[styles.heading, { color: theme.text }]}>Inbox</Text></View><View style={styles.actions}><Link href="/contacts" asChild><Pressable><Text style={{ color: palette.gold, fontWeight: "700" }}>Contacts</Text></Pressable></Link><Pressable onPress={() => authClient.signOut()}><Text style={{ color: theme.muted }}>Sign out</Text></Pressable></View></View>
            <Card style={styles.stats}><View><Text style={[styles.statValue, { color: theme.text }]}>{unread}</Text><Text style={[styles.statLabel, { color: theme.muted }]}>Unread</Text></View><View style={styles.divider} /><View><Text style={[styles.statValue, { color: theme.text }]}>{allowance?.remaining ?? "—"}</Text><Text style={[styles.statLabel, { color: theme.muted }]}>of {allowance?.limit ?? 300} left today</Text></View><View style={styles.compose}><NativeButton compact label="Compose" onPress={() => router.push("/compose")} /></View></Card>
            <TextInput placeholder="Search sender, subject or message" placeholderTextColor={theme.muted} value={search} onChangeText={setSearch} style={[styles.search, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]} />
          </>}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>{messages === undefined ? "Loading mail…" : "No messages found."}</Text>}
          renderItem={({ item }) => {
            const peer = item.direction === "incoming" ? item.fromName || item.fromAddress : `To: ${item.toAddresses.join(", ")}`
            return <Pressable onPress={() => router.push({ pathname: "/message/[id]", params: { id: item._id } })}><Card style={[styles.mail, !item.isRead && { borderLeftColor: palette.gold, borderLeftWidth: 4 }]}><View style={styles.mailTop}><Text numberOfLines={1} style={[styles.peer, { color: theme.text }, !item.isRead && styles.bold]}>{peer}</Text><Text style={[styles.date, { color: theme.muted }]}>{formatDate(item.createdAt)}</Text></View><Text numberOfLines={1} style={[styles.subject, { color: theme.text }, !item.isRead && styles.bold]}>{item.subject || "(No subject)"}</Text><Text numberOfLines={2} style={[styles.preview, { color: theme.muted }]}>{item.textBody || "HTML message"}</Text><View style={styles.badges}><Text style={[styles.badge, { backgroundColor: item.direction === "incoming" ? "#245A4B" : "#3F4F69" }]}>{item.direction}</Text><Text style={[styles.status, { color: item.deliveryStatus === "failed" ? palette.danger : theme.muted }]}>{item.deliveryStatus}</Text>{item.attachments.length ? <Text style={[styles.status, { color: theme.muted }]}>{item.attachments.length} attachment{item.attachments.length === 1 ? "" : "s"}</Text> : null}</View></Card></Pressable>
          }}
        />
      </Screen>
    </AuthenticatedScreen>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 42, gap: 10 }, brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 10 }, actions: { alignItems: "flex-end", gap: 10 }, kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.6 }, heading: { fontSize: 34, fontWeight: "800" },
  stats: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 16 }, statValue: { fontSize: 23, fontWeight: "800" }, statLabel: { fontSize: 12 }, divider: { width: 1, height: 34, backgroundColor: "#455265" }, compose: { flex: 1, alignItems: "flex-end" },
  search: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, minHeight: 48, fontSize: 15, marginBottom: 4 }, mail: { marginTop: 10 }, mailTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, peer: { flex: 1, fontSize: 15 }, date: { fontSize: 11 }, subject: { fontSize: 16, marginTop: 7 }, preview: { fontSize: 13, lineHeight: 19, marginTop: 5 }, bold: { fontWeight: "800" }, badges: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 11 }, badge: { color: "white", overflow: "hidden", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, textTransform: "uppercase", fontWeight: "800" }, status: { fontSize: 11, textTransform: "capitalize" }, empty: { textAlign: "center", padding: 48 },
})
