import React, { PropsWithChildren, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ChevronRight, X, ShieldCheck } from "lucide-react-native";
import { router } from "expo-router";
import { s, tokens } from "../theme";
const c = tokens.color;
export function AppHeader({
  title,
  back,
  action,
}: {
  title: string;
  back?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={[
        s.row,
        { padding: 20, borderBottomWidth: 1, borderColor: c.line },
      ]}
    >
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={{ padding: 8 }}
        >
          <ArrowLeft color={c.ink} />
        </Pressable>
      )}
      <Text accessibilityRole="header" style={[s.h, { flex: 1 }]}>
        {title}
      </Text>
      {action}
    </View>
  );
}
export function ScreenContainer({
  title,
  children,
  back,
  action,
}: PropsWithChildren<{
  title: string;
  back?: boolean;
  action?: React.ReactNode;
}>) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.page}>
      <AppHeader title={title} back={back} action={action} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function PrimaryButton({
  title,
  onPress,
  secondary,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        padding: 13,
        paddingHorizontal: 17,
        borderRadius: 13,
        backgroundColor: secondary ? c.soft : c.primary,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : pressed ? 0.72 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={c.surface} />
      ) : (
        <Text
          style={{
            color: secondary ? c.primary : c.surface,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function FormInput({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        style={s.input}
        {...props}
      />
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
export const SearchInput = ({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (v: string) => void;
}) => (
  <FormInput
    label="Buscar"
    value={value}
    onChangeText={onChangeText}
    placeholder="Escribí para buscar…"
  />
);
export function StatusBadge({ value }: { value: string }) {
  const bad = /RECHAZ|REVOC|INACT|VENC|SIN CONEX/.test(value);
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 8,
        paddingHorizontal: 9,
        paddingVertical: 5,
        backgroundColor: bad ? c.warning : c.soft,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: bad ? c.danger : c.primary,
        }}
      >
        {value.replaceAll("_", " ")}
      </Text>
    </View>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={s.card}>{children}</View>;
}
export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={[s.card, { flex: 1, minWidth: 130, backgroundColor: c.blue }]}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.title, { fontSize: 25 }]}>{value}</Text>
    </View>
  );
}
export function EmptyState({
  message = "No hay registros para estos filtros.",
}: {
  message?: string;
}) {
  return (
    <Card>
      <ShieldCheck color={c.primary} />
      <Text style={s.h}>Todo en orden</Text>
      <Text style={s.muted}>{message}</Text>
    </Card>
  );
}
export const LoadingState = () => (
  <SafeAreaView
    style={[
      s.page,
      { alignItems: "center", justifyContent: "center", gap: 16 },
    ]}
  >
    <ActivityIndicator size="large" color={c.primary} />
    <Text style={s.text}>Preparando NexAccess…</Text>
  </SafeAreaView>
);
export const ErrorState = ({ message }: { message: string }) => (
  <Text accessibilityRole="alert" style={s.error}>
    {message}
  </Text>
);
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.wrap}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === o.value }}
            onPress={() => onChange(o.value)}
            style={{
              minHeight: 44,
              padding: 11,
              borderRadius: 12,
              backgroundColor: value === o.value ? c.primary : c.surface,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            <Text
              style={{
                color: value === o.value ? c.surface : c.ink,
                fontSize: 13,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Sheet({
  title,
  visible,
  onClose,
  children,
}: PropsWithChildren<{
  title: string;
  visible: boolean;
  onClose: () => void;
}>) {
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "#263F4366",
          justifyContent: "flex-end",
        }}
      >
        <SafeAreaView
          style={{
            maxHeight: "90%",
            backgroundColor: c.background,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
          }}
        >
          <View style={[s.row, { padding: 20 }]}>
            <Text style={[s.h, { flex: 1 }]}>{title}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={{ padding: 10 }}
            >
              <X color={c.ink} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export const FilterSheet = Sheet;
export function ConfirmDialog({
  title,
  visible,
  onCancel,
  onConfirm,
  description,
}: {
  title: string;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  description: string;
}) {
  return (
    <Sheet title={title} visible={visible} onClose={onCancel}>
      <Text style={s.text}>{description}</Text>
      <PrimaryButton title="Confirmar" onPress={onConfirm} />
      <PrimaryButton title="Cancelar" secondary onPress={onCancel} />
    </Sheet>
  );
}
export function DateRangePicker({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <FormInput
        label="Desde (AAAA-MM-DD)"
        value={from}
        onChangeText={onFrom}
        placeholder="2026-10-01"
        maxLength={10}
      />
      <FormInput
        label="Hasta (AAAA-MM-DD)"
        value={to}
        onChangeText={onTo}
        placeholder="2026-10-31"
        maxLength={10}
      />
    </View>
  );
}
export function NavRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[s.card, s.row]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.h}>{title}</Text>
        {subtitle && <Text style={s.muted}>{subtitle}</Text>}
      </View>
      <ChevronRight color={c.primary} />
    </Pressable>
  );
}
export function Detail({
  title,
  lines,
  children,
}: PropsWithChildren<{ title: string; lines: [string, string][] }>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <NavRow
        title={title}
        subtitle={lines[0]?.[1]}
        onPress={() => setOpen(true)}
      />
      <Sheet title={title} visible={open} onClose={() => setOpen(false)}>
        {lines.map(([k, v]) => (
          <View key={k} style={{ gap: 3 }}>
            <Text style={s.label}>{k}</Text>
            <Text style={s.text}>{v}</Text>
          </View>
        ))}
        {children}
      </Sheet>
    </>
  );
}
