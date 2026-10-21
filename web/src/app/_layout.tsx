import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UsersProvider } from '../state/UsersProvider';
import { SessionProvider, useSession } from '../state/SessionProvider';
import { colors } from '../theme';

export default function Layout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator accessibilityLabel="Cargando NexAccess" size="large" color={colors.primary} /><Text style={{ color: colors.muted }}>Preparando NexAccess…</Text>
    </View>;
  }
  return <SafeAreaProvider><SessionProvider><StatusBar style="dark" /><AuthenticatedRoutes /></SessionProvider></SafeAreaProvider>;
}

function AuthenticatedRoutes() {
  const { session } = useSession();
  return <UsersProvider key={session?.username ?? 'signed-out'}><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Protected guard={!session}><Stack.Screen name="login" /></Stack.Protected>
    <Stack.Protected guard={!!session}><Stack.Screen name="(private)" /><Stack.Screen name="+not-found" /></Stack.Protected>
  </Stack></UsersProvider>;
}
