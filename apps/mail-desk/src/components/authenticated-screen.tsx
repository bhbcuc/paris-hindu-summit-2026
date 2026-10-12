import type { PropsWithChildren } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"

import { SignIn } from "@/components/sign-in"
import { authClient } from "@/lib/auth-client"
import { palette } from "@/theme"

export function AuthenticatedScreen({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession()
  if (isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.gold} size="large" />
      </View>
    )
  }
  if (!session) return <SignIn />
  return <>{children}</>
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.navy } })
