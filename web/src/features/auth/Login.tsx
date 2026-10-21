import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Icon } from '../../components/ui';
import { colors, ui } from '../../theme';
import { DEMO_ACCOUNT, validateLogin } from '../../domain/auth';
import { useSession } from '../../state/SessionProvider';

export default function Login() {
  const { signIn } = useSession();
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validateLogin>>({ username: undefined, password: undefined });
  const [failure, setFailure] = useState('');
  const passwordRef = useRef<TextInput>(null);
  function submit() {
    const validation = validateLogin(username, password);
    setErrors(validation);
    setFailure('');
    if (validation.username || validation.password) return;
    if (!signIn(username, password)) setFailure('Usuario o contraseña incorrectos. Intentá nuevamente.');
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: desktop ? 48 : 24, justifyContent: 'center' }}>
        <View style={{ flexDirection: desktop ? 'row' : 'column', width: '100%', maxWidth: 1050, alignSelf: 'center', gap: desktop ? 80 : 30, alignItems: desktop ? 'center' : 'stretch' }}>
          <View style={{ flex: desktop ? 1 : undefined, gap: 22 }}>
            <View style={ui.row}><Icon name="layers-outline" size={30} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '700', fontSize: 26, letterSpacing: -0.6 }}>NexAccess</Text></View>
            {desktop && <View style={{ gap: 18, paddingTop: 35 }}>
              <Text style={{ fontSize: 42, lineHeight: 49, color: colors.text, fontWeight: '600', letterSpacing: -1 }}>Personas conectadas.{ '\n' }Espacios seguros.</Text>
              <Text style={[ui.muted, { fontSize: 17, lineHeight: 27, maxWidth: 360 }]}>Un lugar para gestionar empleados, consultar credenciales y acompañar la actividad de tus espacios.</Text>
              <View style={[ui.row, { padding: 20, borderRadius: 16, backgroundColor: colors.primarySoft, marginTop: 14 }]}><Icon name="shield-checkmark-outline" size={28} color={colors.primary} /><Text style={[ui.text, { flex: 1, fontSize: 14 }]}>Acceso para personal autorizado de administración.</Text></View>
            </View>}
          </View>
          <View style={{ flex: desktop ? 1 : undefined, width: '100%', maxWidth: desktop ? 440 : 520, alignSelf: 'center', gap: 18 }}>
            <View style={[ui.card, { padding: desktop ? 32 : 24, gap: 22 }]}>
              <View style={{ gap: 8 }}><Text style={[ui.label, { fontSize: 11, letterSpacing: 2, color: colors.primary }]}>BIENVENIDO A NEXACCESS</Text><Text style={[ui.title, { fontSize: 28 }]}>Iniciar sesión</Text><Text style={ui.muted}>Ingresá con tu cuenta para continuar.</Text></View>
              <View style={{ gap: 8 }}><Text style={ui.label}>Usuario</Text><TextInput accessibilityLabel="Usuario" value={username} onChangeText={v => { setUsername(v); setFailure(''); setErrors(e => ({ ...e, username: undefined })); }} placeholder="Tu usuario" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} style={[ui.input, !!errors.username && { borderColor: colors.danger }]} />{!!errors.username && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13 }}>{errors.username}</Text>}</View>
              <View style={{ gap: 8 }}><Text style={ui.label}>Contraseña</Text><View style={[ui.row, ui.input, { paddingVertical: 0, paddingRight: 5 }, !!errors.password && { borderColor: colors.danger }]}>
                <TextInput ref={passwordRef} accessibilityLabel="Contraseña" value={password} onChangeText={v => { setPassword(v); setFailure(''); setErrors(e => ({ ...e, password: undefined })); }} placeholder="Tu contraseña" placeholderTextColor={colors.muted} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} style={{ flex: 1, minWidth: 0, minHeight: 48, color: colors.text, fontSize: 15 }} />
                <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setVisible(v => !v)} style={({ pressed }) => ({ padding: 12, opacity: pressed ? 0.6 : 1 })}><Icon name={visible ? 'eye-off-outline' : 'eye-outline'} color={colors.primary} /></Pressable>
              </View>{!!errors.password && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13 }}>{errors.password}</Text>}</View>
              {!!failure && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ padding: 12, borderRadius: 10, backgroundColor: colors.dangerSoft }}><Text style={{ color: colors.danger, fontSize: 14, lineHeight: 21 }}>{failure}</Text></View>}
              <Button title="Iniciar sesión" icon="log-in-outline" onPress={submit} />
              <Text style={[ui.muted, { fontSize: 12, textAlign: 'center' }]}>Si necesitás una cuenta, contactá a tu administrador.</Text>
            </View>
            <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.blue, gap: 7 }}><View style={ui.row}><Icon name="information-circle-outline" size={18} /><Text style={[ui.label, { color: colors.text }]}>Acceso de demostración</Text></View><Text selectable style={[ui.muted, { fontSize: 13 }]}>Usuario: {DEMO_ACCOUNT.username}{'\n'}Contraseña: {DEMO_ACCOUNT.password}</Text><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Sesión local con datos ficticios. La autenticación real se conectará con la API del proyecto.</Text></View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
