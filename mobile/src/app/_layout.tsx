import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, usePersonal } from "../personal/SessionProvider";
import { useDesign, useTheme } from "../api/Theme";
import { Loading, styles } from "../personal/ui";
import { View } from "react-native";
function Routes() {
  const { ready, user, preferencesReady } = usePersonal();
  const { mode } = useTheme();
  const { styles: s } = useDesign(styles);
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      {!ready || !preferencesReady ? (
        <View style={[s.root, { justifyContent: "center" }]}>
          <Loading label="Preparando tu acceso�" />
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="login" />
          </Stack.Protected>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(personal)" />
          </Stack.Protected>
          <Stack.Protected guard={false}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="demo" />
          </Stack.Protected>
        </Stack>
      )}
    </>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Routes />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
