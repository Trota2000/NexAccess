import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, pagePadding } from '../../components/Screen';
import { Button, Chip, Confirm, Empty, Field, Icon } from '../../components/ui';
import { EmployeeDraft, ROLES } from '../../domain/types';
import { validateDraft } from '../../domain/users';
import { useUsers } from '../../state/UsersProvider';
import { colors, ui } from '../../theme';

const blank: EmployeeDraft = { nombre: '', apellido: '', cedula: '', email: '', telefono: '', departamento: '', roles: ['Empleado'], activo: true };
export default function UserForm({ id }: { id?: string }) {
  const { users, save } = useUsers();
  const user = users.find(u => u.id === id);
  const [draft, setDraft] = useState<EmployeeDraft>(user ?? blank);
  const [errors, setErrors] = useState<ReturnType<typeof validateDraft>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [failure, setFailure] = useState('');
  const { width } = useWindowDimensions();
  function update<K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) { setDraft(d => ({ ...d, [key]: value })); setErrors(e => ({ ...e, [key]: undefined })); }
  function leave() { if (router.canGoBack()) router.back(); else router.replace('/'); }
  function cancel() { if (JSON.stringify(draft) !== JSON.stringify(user ?? blank)) setDiscard(true); else leave(); }
  function submit() {
    const validation = validateDraft(draft, users, id);
    setErrors(validation);
    if (Object.keys(validation).length) { setFailure('Revisá los campos señalados antes de guardar.'); return; }
    setFailure('');
    if (user?.activo && !draft.activo) setConfirm(true); else commit();
  }
  function commit() {
    setConfirm(false); setSubmitting(true);
    try { const result = save(draft, id); router.replace(`/usuarios/${result}`); }
    catch (error) { setFailure(error instanceof Error ? error.message : 'No se pudo guardar.'); setSubmitting(false); }
  }
  if (id && !user) return <Screen detail section="Empleado no encontrado"><Empty title="Este empleado no existe" description="Volvé al directorio para elegir otro registro." action={<Button title="Ver empleados" onPress={() => router.replace('/')} />} /></Screen>;
  return <Screen detail section={id ? 'Editar empleado' : 'Nuevo empleado'}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: pagePadding(width), gap: 22, maxWidth: 980, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 8 }}><Text style={[ui.label, { color: colors.primary, letterSpacing: 2, fontSize: 11 }]}>DIRECTORIO / {id ? user?.id : 'REGISTRO'}</Text><Text style={ui.title}>{id ? 'Editar empleado' : 'Una nueva persona'}</Text><Text style={ui.muted}>Completá la información y definí sus roles de acceso.</Text></View>
      <View style={ui.card}><View style={ui.row}><Icon name="person-outline" color={colors.primary} /><Text style={ui.heading}>Información personal</Text></View><Text style={ui.muted}>Los campos con * son obligatorios. El correo y el teléfono son opcionales.</Text>
        <View style={[ui.wrap, { alignItems: 'flex-start' }]}><Field label="Nombre *" value={draft.nombre} error={errors.nombre} onChangeText={v => update('nombre', v)} maxLength={100} autoCapitalize="words" placeholder="Ej. Camila" /><Field label="Apellido *" value={draft.apellido} error={errors.apellido} onChangeText={v => update('apellido', v)} maxLength={100} autoCapitalize="words" placeholder="Ej. Benítez" /></View>
        <View style={[ui.wrap, { alignItems: 'flex-start' }]}><Field label="Cédula / documento *" value={draft.cedula} error={errors.cedula} onChangeText={v => update('cedula', v)} autoCapitalize="characters" placeholder="Ej. 4.200.100" maxLength={25} /><Field label="Teléfono" value={draft.telefono} error={errors.telefono} onChangeText={v => update('telefono', v)} keyboardType="phone-pad" placeholder="Ej. 0981 555 010" maxLength={30} /></View>
        <View style={ui.wrap}><Field label="Correo electrónico" value={draft.email} error={errors.email} onChangeText={v => update('email', v)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="nombre@empresa.com" maxLength={150} /></View>
      </View>
      <View style={ui.card}><View style={ui.row}><Icon name="business-outline" color={colors.primary} /><Text style={ui.heading}>Organización y acceso</Text></View><View style={ui.wrap}><Field label="Departamento / sector *" value={draft.departamento} error={errors.departamento} onChangeText={v => update('departamento', v)} placeholder="Ej. Administración" maxLength={100} /></View>
        <Text style={ui.label}>Roles * · Podés seleccionar varios</Text><View style={ui.wrap}>{ROLES.map(role => <Chip key={role} title={role} selected={draft.roles.includes(role)} onPress={() => update('roles', draft.roles.includes(role) ? draft.roles.filter(r => r !== role) : [...draft.roles, role])} />)}</View>{errors.roles && <Text style={{ color: colors.danger, fontSize: 13 }}>{errors.roles}</Text>}
        <View style={[ui.row, { justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16 }]}><View style={{ flex: 1, gap: 4 }}><Text style={ui.text}>Empleado activo</Text><Text style={ui.muted}>Habilita la evaluación de permisos del empleado.</Text></View><Switch accessibilityLabel="Empleado activo" value={draft.activo} onValueChange={v => update('activo', v)} trackColor={{ false: '#CBD6D0', true: '#AACDBE' }} thumbColor={colors.primary} /></View>
      </View>
      <View style={[ui.row, { backgroundColor: colors.blue, padding: 16, borderRadius: 12 }]}><Icon name="information-circle-outline" /><Text style={[ui.muted, { flex: 1 }]}>Este registro representa un empleado. No crea una cuenta administrativa ni asigna credenciales automáticamente.</Text></View>
      {!!failure && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{failure}</Text>}
      <View style={[ui.wrap, { justifyContent: 'flex-end' }]}><Button title="Cancelar" variant="secondary" onPress={cancel} disabled={submitting} /><Button title={submitting ? 'Guardando…' : 'Guardar empleado'} icon="checkmark-outline" onPress={submit} disabled={submitting} /></View>
      <Text style={ui.muted}>Demostración local · Al recargar se restauran los datos de ejemplo.</Text>
    </ScrollView></KeyboardAvoidingView>
    <Confirm visible={confirm} title="¿Desactivar al empleado?" description="Se guardarán los cambios con el empleado inactivo. Sus credenciales quedarán visibles, pero sus permisos no habilitarán acceso en la demostración." action="Guardar y desactivar" onCancel={() => setConfirm(false)} onConfirm={commit} />
    <Confirm visible={discard} title="¿Descartar los cambios?" description="La información que editaste todavía no se ha guardado." action="Descartar" onCancel={() => setDiscard(false)} onConfirm={leave} />
  </Screen>;
}
