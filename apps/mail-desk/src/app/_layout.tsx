import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { useColorScheme } from "react-native"

import { assertConfiguration } from "@/lib/config"
import { palette } from "@/theme"

assertConfiguration()

export default function RootLayout() {
  const dark = useColorScheme() === "dark"
  const base = dark ? DarkTheme : DefaultTheme
  const theme = { ...base, colors: { ...base.colors, primary: palette.gold, background: dark ? palette.navy : "#F4F0E8", card: dark ? palette.navySoft : "#FFFFFF" } }
  return (
    <KeyboardProvider>
      <ThemeProvider value={theme}>
        <Stack screenOptions={{ headerTintColor: palette.gold, headerBackButtonDisplayMode: "minimal" }}>
          <Stack.Screen name="index" options={{ title: "Mail Desk" }} />
          <Stack.Screen name="message/[id]" options={{ title: "Message" }} />
          <Stack.Screen name="compose" options={{ title: "New message", presentation: "modal" }} />
          <Stack.Screen name="contacts" options={{ title: "Contacts" }} />
        </Stack>
      </ThemeProvider>
    </KeyboardProvider>
  )
}
