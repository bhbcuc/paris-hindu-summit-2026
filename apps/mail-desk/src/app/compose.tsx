import * as DocumentPicker from "expo-document-picker"
import { File } from "expo-file-system"
import { router, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Alert, StyleSheet, Switch, Text, TextInput, View } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"

import { AuthenticatedScreen } from "@/components/authenticated-screen"
import { NativeButton } from "@/components/native-button"
import { Card, Screen } from "@/components/screen"
import { sendMail, type OutboundAttachment } from "@/lib/mail-api"
import { palette, useSummitTheme } from "@/theme"

const inputTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"]

export default function ComposeScreen() {
  const theme = useSummitTheme()
  const params = useLocalSearchParams<{ to?: string; subject?: string; inReplyTo?: string; references?: string }>()
  const [to, setTo] = useState(params.to ?? "")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState(params.subject ?? "")
  const [body, setBody] = useState("")
  const [showCopies, setShowCopies] = useState(false)
  const [bulk, setBulk] = useState(false)
  const [consent, setConsent] = useState(false)
  const [attachments, setAttachments] = useState<OutboundAttachment[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const fieldStyle = [styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]
  async function addAttachments() {
    const picked = await DocumentPicker.getDocumentAsync({ type: inputTypes, multiple: true, copyToCacheDirectory: true })
    if (picked.canceled) return
    const next: OutboundAttachment[] = []
    for (const asset of picked.assets.slice(0, 5 - attachments.length)) {
      const contentBase64 = await new File(asset.uri).base64()
      next.push({ fileName: asset.name, mimeType: asset.mimeType || "application/octet-stream", byteSize: asset.size ?? Math.ceil(contentBase64.length * 0.75), contentBase64 })
    }
    if ([...attachments, ...next].reduce((sum, item) => sum + item.byteSize, 0) > 3_000_000) return Alert.alert("Attachments too large", "Attachments must total 3 MB or less.")
    setAttachments((current) => [...current, ...next])
  }
  async function submit() {
    setBusy(true); setError("")
    try {
      const result = await sendMail({ to, cc, bcc, subject, text: body, mode: bulk ? "bulk" : "single", consentConfirmed: consent, inReplyTo: params.inReplyTo, references: params.references, attachments })
      const count = result.recipientCount ?? 1
      Alert.alert("Message queued", `Queued for ${count} recipient${count === 1 ? "" : "s"}. Delivery status will appear in Mail Desk.`, [{ text: "Done", onPress: () => router.back() }])
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The message could not be sent.") }
    finally { setBusy(false) }
  }

  return <AuthenticatedScreen><Screen><KeyboardAwareScrollView bottomOffset={62} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text style={[styles.heading, { color: theme.text }]}>Write with purpose.</Text><Text style={[styles.subheading, { color: theme.muted }]}>Sending as Paris Hindu Summit 2026 &lt;info@parishindusummit.org&gt;</Text>
    <View style={styles.mode}><Text style={[styles.label, { color: theme.text }]}>Bulk campaign</Text><Switch value={bulk} onValueChange={(value) => { setBulk(value); if (value) { setCc(""); setBcc("") } }} trackColor={{ true: palette.gold }} /></View>
    <TextInput value={to} onChangeText={setTo} placeholder={bulk ? "Recipients (comma separated)" : "To"} placeholderTextColor={theme.muted} autoCapitalize="none" keyboardType="email-address" style={fieldStyle} />
    {!bulk ? <><NativeButton compact variant="text" label={showCopies ? "Hide Cc / Bcc" : "Add Cc / Bcc"} onPress={() => setShowCopies(!showCopies)} />{showCopies ? <><TextInput value={cc} onChangeText={setCc} placeholder="Cc" placeholderTextColor={theme.muted} autoCapitalize="none" style={fieldStyle} /><TextInput value={bcc} onChangeText={setBcc} placeholder="Bcc" placeholderTextColor={theme.muted} autoCapitalize="none" style={fieldStyle} /></> : null}</> : null}
    <TextInput value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor={theme.muted} style={fieldStyle} /><TextInput value={body} onChangeText={setBody} placeholder="Message" placeholderTextColor={theme.muted} multiline textAlignVertical="top" style={[fieldStyle, styles.body]} />
    <NativeButton variant="outlined" label="Add PDF, document or image" onPress={addAttachments} disabled={attachments.length >= 5} />
    {attachments.length ? <Card><Text style={[styles.smallTitle, { color: palette.gold }]}>ATTACHMENTS</Text>{attachments.map((item, index) => <View key={`${item.fileName}-${index}`} style={styles.file}><Text numberOfLines={1} style={[styles.fileName, { color: theme.text }]}>{item.fileName} · {Math.ceil(item.byteSize / 1024)} KB</Text><Text onPress={() => setAttachments((items) => items.filter((_, i) => i !== index))} style={{ color: palette.danger }}>Remove</Text></View>)}</Card> : null}
    {bulk ? <PressableConsent checked={consent} onChange={setConsent} textColor={theme.text} mutedColor={theme.muted} /> : null}
    {error ? <Card style={{ borderColor: palette.danger }}><Text style={{ color: palette.danger, lineHeight: 21 }}>{error}</Text></Card> : null}
    <NativeButton label={busy ? "Sending…" : bulk ? "Send private campaign" : "Send message"} onPress={submit} disabled={busy || !to.trim() || !subject.trim() || !body.trim() || (bulk && !consent)} />
  </KeyboardAwareScrollView></Screen></AuthenticatedScreen>
}

function PressableConsent({ checked, onChange, textColor, mutedColor }: { checked: boolean; onChange: (value: boolean) => void; textColor: string; mutedColor: string }) {
  return <Card><View style={styles.mode}><View style={{ flex: 1 }}><Text style={[styles.label, { color: textColor }]}>Recipient consent confirmed</Text><Text style={{ color: mutedColor, fontSize: 12, lineHeight: 18 }}>Every recipient asked to receive this campaign.</Text></View><Switch value={checked} onValueChange={onChange} trackColor={{ true: palette.gold }} /></View></Card>
}

const styles = StyleSheet.create({ content: { padding: 18, paddingBottom: 48, gap: 12 }, heading: { fontSize: 28, fontWeight: "800" }, subheading: { fontSize: 13, lineHeight: 19, marginBottom: 5 }, mode: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, label: { fontSize: 15, fontWeight: "700" }, input: { minHeight: 50, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, fontSize: 15 }, body: { minHeight: 190, paddingTop: 14 }, smallTitle: { fontSize: 10, letterSpacing: 1.4, fontWeight: "800", marginBottom: 8 }, file: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, gap: 12 }, fileName: { flex: 1, fontSize: 13 } })
