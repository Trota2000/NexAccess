import React, { useState } from "react";
import { Tabs } from "expo-router";
import { Pressable, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { CreditCard, History, LogOut } from "lucide-react-native";
import { useDesign } from "../api/Theme";
import { PersonalThemeButton } from "./Login";
import { usePersonal } from "./SessionProvider";
import { Action, Brand, message, Notice, Sheet, styles } from "./ui";

export default function PersonalLayout() {
  const { client } = usePersonal();
  const insets = useSafeAreaInsets();
  const { color, styles: s } = useDesign(styles);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <SafeAreaView style={s.root} edges={["top", "left", "right"]}>
      <View style={s.header}>
        <Brand />
        <View style={s.row}>
          <PersonalThemeButton />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesi�n"
            onPress={() => {
              setError("");
              setConfirm(true);
            }}
            style={s.iconButton}
          >
            <LogOut size={20} color={color.muted} />
          </Pressable>
        </View>
      </View>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: color.bg },
          tabBarActiveTintColor: color.primary,
          tabBarInactiveTintColor: color.muted,
          tabBarStyle: {
            backgroundColor: color.card,
            borderTopColor: color.border,
            paddingTop: 6,
            height: 64 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Mi tarjeta",
            tabBarIcon: ({ color, size }) => (
              <CreditCard size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "Historial",
            tabBarIcon: ({ color, size }) => (
              <History size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      {confirm && (
        <Sheet
          title="Cerrar sesi�n"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <Text style={s.body}>
            Tu tarjeta dejar� de funcionar desde este tel�fono hasta que vuelvas
            a iniciar sesi�n.
          </Text>
          {!!error && <Notice error>{error}</Notice>}
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Action
                title="Cancelar"
                secondary
                disabled={busy}
                onPress={() => setConfirm(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Action
                title={busy ? "Cerrando�" : "Cerrar sesi�n"}
                destructive
                icon={LogOut}
                disabled={busy}
                onPress={() => {
                  setBusy(true);
                  void client.logout().catch((e) => {
                    setError(message(e));
                    setBusy(false);
                  });
                }}
              />
            </View>
          </View>
        </Sheet>
      )}
    </SafeAreaView>
  );
}
