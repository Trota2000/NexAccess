import { Tabs } from "expo-router";
import {
  House,
  CreditCard,
  Activity,
  Bell,
  UserRound,
} from "lucide-react-native";
import { useDemo } from "../../../stores/demo";
import { tokens } from "../../../theme";
export default function BottomTabBar() {
  const { data, user } = useDemo();
  const count = user
    ? data.notifications.filter(
        (n) =>
          (n.employeeId === user.employeeId || n.roles?.includes(user.role)) &&
          !n.readBy.includes(user.id),
      ).length
    : 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.primary,
        tabBarInactiveTintColor: tokens.color.muted,
        tabBarStyle: {
          backgroundColor: tokens.color.surface,
          borderTopColor: tokens.color.line,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="credential"
        options={{
          title: "Credencial",
          tabBarIcon: ({ color, size }) => (
            <CreditCard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Actividad",
          tabBarIcon: ({ color, size }) => (
            <Activity color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notificaciones",
          tabBarBadge: count || undefined,
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <UserRound color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
