import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useDemo } from "../stores/demo";
import { LoadingState } from "../components/ui";
export default function Layout() {
  const user = useDemo((s) => s.user);
  const ready = useDemo((s) => s.hydrated);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!ready ? (
        <LoadingState />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="login" />
            <Stack.Screen name="demo" />
          </Stack.Protected>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
      )}
    </SafeAreaProvider>
  );
}
