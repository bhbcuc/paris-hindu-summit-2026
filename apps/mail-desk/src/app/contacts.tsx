import { router } from "expo-router"
import { useMemo, useState } from "react"
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput } from "react-native"

import { AuthenticatedScreen } from "@/components/authenticated-screen"
import { NativeButton } from "@/components/native-button"
import { Card, Screen } from "@/components/screen"
import { apiFetch, useMailApi, type MailContact } from "@/lib/api"
import { palette, useSummitTheme } from "@/theme"

export default function ContactsRoute() {
  return <AuthenticatedScreen><ContactsScreen /></AuthenticatedScreen>
}

function ContactsScreen() {
  const theme = useSummitTheme()
  const { data: contacts, refresh } = useMailApi<MailContact[]>("/mail/contacts")
  const [query, setQuery] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [organization, setOrganization] = useState("")
  const [error, setError] = useState("")
  const filtered = useMemo(() => (contacts ?? []).filter((item) => `${item.name} ${item.email} ${item.organization}`.toLowerCase().includes(query.toLowerCase())), [contacts, query])
  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]
  async function add() {
    if (name.trim().length < 2) { setError("Enter a contact name with at least 2 characters."); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid contact email."); return }
    try { setError(""); await apiFetch("/mail/contacts/save", { method: "POST", body: { name, email, organization, notes: "" } }); setName(""); setEmail(""); setOrganization(""); refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save contact.") }
  }
  function deleteContact(id: string, address: string) { Alert.alert("Delete contact?", address, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void apiFetch("/mail/contacts/delete", { method: "POST", body: { id } }).then(refresh) }]) }
  return <AuthenticatedScreen><Screen><FlatList data={filtered} keyExtractor={(item) => item._id} contentContainerStyle={styles.content} ListHeaderComponent={<><Text style={[styles.heading, { color: theme.text }]}>Address book</Text><Card style={styles.form}><TextInput placeholder="Name" placeholderTextColor={theme.muted} value={name} onChangeText={setName} style={inputStyle} /><TextInput placeholder="Email" placeholderTextColor={theme.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={inputStyle} /><TextInput placeholder="Organization (optional)" placeholderTextColor={theme.muted} value={organization} onChangeText={setOrganization} style={inputStyle} />{error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}<NativeButton label="Save contact" onPress={add} disabled={!email.trim()} /></Card><TextInput placeholder="Search contacts" placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} style={inputStyle} /></>} renderItem={({ item }) => <Card style={styles.contact}><Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: "/compose", params: { to: item.email } })}><Text style={[styles.name, { color: theme.text }]}>{item.name || item.email}</Text><Text style={{ color: theme.muted }}>{item.email}</Text>{item.organization ? <Text style={[styles.org, { color: theme.muted }]}>{item.organization}</Text> : null}</Pressable><Text onPress={() => deleteContact(item._id, item.email)} style={{ color: palette.danger }}>Delete</Text></Card>} ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>No saved contacts.</Text>} /></Screen></AuthenticatedScreen>
}

const styles = StyleSheet.create({ content: { padding: 18, paddingBottom: 48, gap: 10 }, heading: { fontSize: 30, fontWeight: "800", marginBottom: 8 }, form: { gap: 10, marginBottom: 14 }, input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, fontSize: 15 }, contact: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 12 }, name: { fontWeight: "800", fontSize: 16, marginBottom: 4 }, org: { fontSize: 12, marginTop: 4 }, empty: { textAlign: "center", padding: 36 } })
