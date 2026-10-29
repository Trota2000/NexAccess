import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { X, type LucideIcon } from "lucide-react-native";
import { Colors, useDesign, useReducedMotion } from "../api/Theme";

export const logo = require("../../assets/brand/nexaccess-logo.png");
export function Brand() {
  const { color } = useDesign(styles);
  return (
    <Image
      source={logo}
      accessibilityLabel="NexAccess"
      resizeMode="contain"
      style={{ width: 148, height: 48, tintColor: color.logoTint || undefined }}
    />
  );
}
export function Action({
  title,
  icon: Icon,
  onPress,
  secondary = false,
  destructive = false,
  disabled = false,
}: {
  title: string;
  icon?: LucideIcon;
  onPress: () => void;
  secondary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const { color, styles: s } = useDesign(styles);
  const ink = destructive
    ? color.error
    : secondary
      ? color.primary
      : color.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: destructive
            ? color.errorBg
            : secondary
              ? color.soft
              : color.primary,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {Icon && <Icon size={18} color={ink} />}
      <Text style={[s.buttonText, { color: ink }]}>{title}</Text>
    </Pressable>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  const { color, styles: s } = useDesign(styles);
  return (
    <View
      style={[
        s.notice,
        { backgroundColor: error ? color.errorBg : color.soft },
      ]}
    >
      <Text
        accessibilityRole={error ? "alert" : undefined}
        accessibilityLiveRegion="polite"
        style={[s.body, { color: error ? color.error : color.primary }]}
      >
        {children}
      </Text>
    </View>
  );
}
export function Loading({ label = "Cargando…" }: { label?: string }) {
  const { color, styles: s } = useDesign(styles);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={s.loading}
    >
      <ActivityIndicator color={color.primary} />
      <Text style={s.muted}>{label}</Text>
    </View>
  );
}
export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const { color, styles: s } = useDesign(styles);
  const reduced = useReducedMotion();
  return (
    <Modal
      transparent
      visible
      animationType={reduced ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View
          accessibilityViewIsModal
          role="dialog"
          accessibilityLabel={title}
          style={s.sheet}
        >
          <View style={s.sheetHeader}>
            <Text accessibilityRole="header" style={s.sectionTitle}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar ventana"
              onPress={onClose}
              style={s.iconButton}
            >
              <X size={20} color={color.ink} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={s.sheetBody}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function maskDocument(value: string) {
  return value.length > 3 ? `•••• ${value.slice(-3)}` : "••••";
}
export function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("es-PY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "America/Asuncion",
      })
    : "Sin vencimiento";
}
export function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}
export function styles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: {
      padding: 20,
      gap: 20,
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
      paddingBottom: 32,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderColor: c.border,
      backgroundColor: c.header,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
    },
    heading: { color: c.ink, fontSize: 28, fontWeight: "700", lineHeight: 36 },
    sectionTitle: {
      color: c.ink,
      fontSize: 18,
      fontWeight: "700",
      flexShrink: 1,
    },
    body: { color: c.ink, fontSize: 14, lineHeight: 22 },
    muted: { color: c.muted, fontSize: 13, lineHeight: 20 },
    eyebrow: {
      color: c.primary,
      fontSize: 11,
      letterSpacing: 1.6,
      fontWeight: "700",
    },
    label: { color: c.ink, fontSize: 13, fontWeight: "600", marginBottom: 8 },
    input: {
      color: c.ink,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.controlBorder,
      borderRadius: 12,
      minHeight: 48,
      paddingHorizontal: 14,
      fontSize: 16,
    },
    button: {
      minHeight: 44,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "600",
      flexShrink: 1,
      textAlign: "center",
    },
    iconButton: {
      minWidth: 44,
      minHeight: 44,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
      gap: 20,
    },
    divider: { height: 1, backgroundColor: c.border },
    notice: { padding: 14, borderRadius: 12 },
    loading: {
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    empty: {
      padding: 28,
      alignItems: "center",
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      backgroundColor: c.overlay,
    },
    sheet: {
      width: "100%",
      maxWidth: 480,
      maxHeight: "85%",
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 16,
      borderBottomWidth: 1,
      borderColor: c.border,
    },
    sheetBody: { padding: 20, gap: 16 },
  });
}
