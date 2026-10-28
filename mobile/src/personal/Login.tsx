import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff, LogIn, Moon, Sun } from "lucide-react-native";
import { useDesign, useTheme } from "../api/Theme";
import BusyOverlay from "../api/BusyOverlay";
import { usePersonal } from "./SessionProvider";
import { Action, Brand, message, Notice, styles } from "./ui";

export function PersonalThemeButton() {
  const { mode, color } = useTheme();
  const { saveTheme } = usePersonal();
  const [error, setError] = useState("");
  const Icon = mode === "light" ? Moon : Sun;
  const label = mode === "light" ? "Activar modo oscuro" : "Activar modo claro";
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        {...(Platform.OS === "web" ? { title: label } : {})}
        onPress={() => {
          void saveTheme(mode === "light" ? "dark" : "light").catch(() =>
            setError("No se pudo guardar el tema."),
          );
        }}
        style={{
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          backgroundColor: color.soft,
        }}
      >
        <Icon size={20} color={color.primary} />
      </Pressable>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: color.error }}>
          {error}
        </Text>
      )}
    </View>
  );
}
export default function PersonalLogin() {
  const { client, notice } = usePersonal();
  const { color, styles: s } = useDesign(styles);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await client.login(username, password);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
      setPassword("");
    }
  }
  return (
    <SafeAreaView style={s.root}>
      <View style={{ alignSelf: "flex-end", padding: 16 }}>
        <PersonalThemeButton />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.content,
            { flexGrow: 1, justifyContent: "center" },
          ]}
        >
          <View style={[s.card, { padding: 28, gap: 24 }]}>
            <Brand />
            <View style={{ gap: 8 }}>
              <Text style={s.eyebrow}>TU ACCESO PERSONAL</Text>
              <Text accessibilityRole="header" style={s.heading}>
                Bienvenido a NexAccess
              </Text>
            </View>
            <View>
              <Text style={s.label}>Usuario</Text>
              <TextInput
                accessibilityLabel="Usuario"
                value={username}
                onChangeText={setUsername}
                style={s.input}
                placeholder="Tu usuario de empleado"
                placeholderTextColor={color.muted}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                maxLength={100}
              />
            </View>
            <View>
              <Text style={s.label}>Contrase�a</Text>
              <View style={{ justifyContent: "center" }}>
                <TextInput
                  accessibilityLabel="Contrase�a"
                  value={password}
                  onChangeText={setPassword}
                  style={[s.input, { paddingRight: 56 }]}
                  secureTextEntry={!visible}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  maxLength={200}
                  onSubmitEditing={() => void login()}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    visible ? "Ocultar contrase�a" : "Mostrar contrase�a"
                  }
                  onPress={() => setVisible(!visible)}
                  style={[s.iconButton, { position: "absolute", right: 4 }]}
                >
                  {visible ? (
                    <EyeOff size={20} color={color.muted} />
                  ) : (
                    <Eye size={20} color={color.muted} />
                  )}
                </Pressable>
              </View>
            </View>
            {!!(error || notice) && (
              <Notice error={!!error}>{error || notice}</Notice>
            )}
            <Action
              title={busy ? "Iniciando sesi�n�" : "Iniciar sesi�n"}
              icon={LogIn}
              onPress={() => void login()}
              disabled={busy}
            />
            <Text style={s.muted}>
              Tu sesi�n queda guardada en este tel�fono. Si necesit�s una
              cuenta, contact� al administrador.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <BusyOverlay active={busy} />
    </SafeAreaView>
  );
}
