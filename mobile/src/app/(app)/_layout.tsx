import { Stack } from "expo-router";
import { can } from "../../utils/domain";
import { useDemo } from "../../stores/demo";
export default function Private() {
  const role = useDemo((s) => s.user?.role);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="credential-detail" />
      <Stack.Screen name="tools" />
      <Stack.Screen name="manage/[resource]" />
      <Stack.Protected guard={can(role, "security")}>
        <Stack.Screen name="security/index" />
        <Stack.Screen name="security/events" />
      </Stack.Protected>
      <Stack.Protected guard={can(role, "hr")}>
        <Stack.Screen name="hr/index" />
        <Stack.Screen name="hr/attendance" />
      </Stack.Protected>
      <Stack.Protected guard={can(role, "admin")}>
        <Stack.Screen name="admin/index" />
      </Stack.Protected>
    </Stack>
  );
}
