import { ThemeToggle } from "../api/Theme";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Href, router, usePathname } from "expo-router";
import { Avatar, Confirm, Icon, IconName } from "./ui";
import { colors, ui } from "../theme";
import { useUsers } from "../state/UsersProvider";
import { useSession } from "../state/SessionProvider";
import { modules } from "../navigation/modules";

export function Screen({
  children,
  section = "Empleados",
  detail = false,
}: React.PropsWithChildren<{ section?: string; detail?: boolean }>) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const [collapsed, setCollapsed] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { session, signOut } = useSession();
  const { notice, dismiss, settings, alerts } = useUsers();
  const path = usePathname();
  const unread = alerts.filter((a) => a.status === "Nueva").length;
  const active = (target: string) =>
    target === "/"
      ? path === "/" || path.startsWith("/usuarios")
      : path === target || path.startsWith(target + "/");
  const navigate = (target: string) => {
    setMenuOpen(false);
    router.replace(target as Href);
  };
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }
  const nav = (label: string, icon: IconName, target: string) => (
    <Pressable
      {...(collapsed ? { title: label } : {})}
      testID={`nx-nav-demo-${target}`}
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active(target) }}
      aria-selected={active(target)}
      aria-current={active(target) ? "page" : undefined}
      onPress={() => navigate(target)}
      style={({ pressed }) => [
        styles.navItem,
        {
          backgroundColor: active(target) ? "var(--nx-active)" : "transparent",
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon
        name={icon}
        color={active(target) ? "var(--nx-activeText)" : colors.muted}
      />
      {(!desktop || !collapsed) && (
        <Text
          style={{
            fontSize: 13,
            flex: 1,
            fontWeight: active(target) ? "600" : "400",
            color: active(target) ? "var(--nx-activeText)" : colors.muted,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
  const menu = (
    <>
      {modules.map((item, i) => (
        <React.Fragment key={item.path}>
          {(i === 0 || modules[i - 1].group !== item.group) &&
            (!desktop || !collapsed) && (
              <Text
                style={[
                  ui.label,
                  {
                    fontSize: 10,
                    letterSpacing: 1.8,
                    marginTop: i ? 18 : 4,
                    marginBottom: 10,
                  },
                ]}
              >
                {item.group}
              </Text>
            )}
          {nav(item.label, item.icon, item.path)}
        </React.Fragment>
      ))}
    </>
  );
  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.safe}
    >
      <View style={{ flex: 1, flexDirection: "row" }}>
        {desktop && (
          <View style={[styles.sidebar, { width: collapsed ? 86 : 250 }]}>
            <View style={[ui.row, { marginBottom: 24 }]}>
              <Icon name="layers-outline" size={26} color={colors.primary} />
              {!collapsed && (
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontSize: 22,
                    color: colors.text,
                    fontWeight: "700",
                    letterSpacing: -0.5,
                  }}
                >
                  {settings.appName}
                </Text>
              )}
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {menu}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={collapsed ? "Expandir menú" : "Contraer menú"}
              onPress={() => setCollapsed(!collapsed)}
              style={{ minHeight: 48, justifyContent: "center", marginTop: 18 }}
            >
              <Icon
                name={
                  collapsed ? "chevron-forward-outline" : "chevron-back-outline"
                }
              />
            </Pressable>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={[styles.topbar, { paddingHorizontal: desktop ? 36 : 20 }]}
          >
            <View style={[ui.row, { flex: 1, minWidth: 0 }]}>
              {detail ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver"
                  onPress={goBack}
                  style={{ padding: 10 }}
                >
                  <Icon name="arrow-back-outline" />
                </Pressable>
              ) : (
                !desktop && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir menú"
                    onPress={() => setMenuOpen(true)}
                    style={{ padding: 8 }}
                  >
                    <Icon name="menu-outline" />
                  </Pressable>
                )
              )}
              {desktop ? (
                <Text numberOfLines={1} style={[ui.muted, { flexShrink: 1 }]}>
                  Panel <Text style={{ color: "var(--nx-muted)" }}> / </Text>
                  <Text style={{ color: colors.text }}>{section}</Text>
                </Text>
              ) : (
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {detail ? section : settings.appName}
                </Text>
              )}
            </View>
            <View style={ui.row}>
              <ThemeToggle />
              {desktop && (
                <>
                  <Avatar
                    name={session?.displayName ?? "Admin Demo"}
                    index={2}
                  />
                  <View>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      {session?.displayName}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      {settings.institution}
                    </Text>
                  </View>
                </>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver alertas${settings.notifications ? `, ${unread} nuevas` : ""}`}
                onPress={() => navigate("/alertas")}
                style={{
                  minWidth: 40,
                  minHeight: 44,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Icon name="notifications-outline" color={colors.primary} />
                {settings.notifications && unread > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      borderRadius: 10,
                      backgroundColor: colors.peach,
                      paddingHorizontal: 5,
                    }}
                  >
                    <Text style={{ color: colors.danger, fontSize: 10 }}>
                      {unread}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
                onPress={() => setConfirmLogout(true)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 44,
                  minHeight: 44,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: colors.sidebar,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon name="log-out-outline" color={colors.primary} />
                {desktop && (
                  <Text style={{ fontSize: 13, color: colors.primary }}>
                    Salir
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
          {!!notice && (
            <View
              accessibilityLiveRegion="polite"
              style={{
                backgroundColor: colors.primarySoft,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icon name="checkmark-circle-outline" color={colors.primary} />
              <Text style={[ui.text, { flex: 1, fontSize: 14 }]}>{notice}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar mensaje"
                onPress={dismiss}
                style={{ padding: 8 }}
              >
                <Icon name="close-outline" />
              </Pressable>
            </View>
          )}
          <View style={{ flex: 1 }}>{children}</View>
          {!desktop && !detail && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                backgroundColor: colors.sidebar,
                padding: 5,
                borderTopWidth: 1,
                borderTopColor: colors.line,
              }}
            >
              {[
                {
                  label: "Dashboard",
                  icon: "grid-outline",
                  target: "/dashboard",
                },
                { label: "Empleados", icon: "people-outline", target: "/" },
                {
                  label: "Accesos",
                  icon: "time-outline",
                  target: "/historial",
                },
                { label: "Más", icon: "menu-outline", target: "menu" },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityLabel={
                    item.label === "Más" ? "Más módulos" : item.label
                  }
                  onPress={() =>
                    item.target === "menu"
                      ? setMenuOpen(true)
                      : navigate(item.target)
                  }
                  style={{
                    gap: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 52,
                    flex: 1,
                    borderRadius: 10,
                    backgroundColor: active(item.target)
                      ? colors.primarySoft
                      : "transparent",
                  }}
                >
                  <Icon
                    name={item.icon as IconName}
                    color={active(item.target) ? colors.primary : colors.muted}
                  />
                  <Text style={{ fontSize: 11, color: colors.text }}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
      <Confirm
        visible={confirmLogout}
        title="¿Cerrar sesión?"
        description="Vas a volver al inicio de sesión. Los cambios de esta demostración se descartarán al salir."
        action="Cerrar sesión"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          signOut();
        }}
      />
      <Modal
        visible={menuOpen}
        animationType="slide"
        onRequestClose={() => setMenuOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.sidebar }}>
          <View
            style={[ui.row, { padding: 20, justifyContent: "space-between" }]}
          >
            <Text style={ui.heading}>{settings.appName}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar menú"
              onPress={() => setMenuOpen(false)}
              style={{ padding: 10 }}
            >
              <Icon name="close-outline" />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}
          >
            {menu}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
export const pagePadding = (width: number) => (width >= 1000 ? 36 : 20);
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  sidebar: {
    backgroundColor: colors.sidebar,
    paddingHorizontal: 20,
    paddingTop: 32,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    minHeight: 48,
    borderRadius: 12,
    marginBottom: 6,
  },
  topbar: {
    minHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
