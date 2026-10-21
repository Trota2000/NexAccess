import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import ModulePage from '../../components/ModulePage';
import { Button, Chips, Field } from '../../components/ui';
import { useUsers } from '../../state/UsersProvider';
import { defaultSettings } from '../../domain/system';
import { colors, ui } from '../../theme';

export default function Settings() {
  const { settings, saveSettings } = useUsers();
  const [draft, setDraft] = useState(settings); const [error, setError] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  return <ModulePage title="Configuración" eyebrow="SISTEMA / PREFERENCIAS" description="Personalizá las opciones de la demostración durante esta sesión.">
    <View style={ui.card}><Text style={ui.heading}>Configuración general</Text><View style={ui.wrap}><Field label="Nombre del sistema *" value={draft.appName} maxLength={40} onChangeText={appName => setDraft(d => ({ ...d, appName }))} /><Field label="Institución *" value={draft.institution} maxLength={100} onChangeText={institution => setDraft(d => ({ ...d, institution }))} /></View><Text style={ui.label}>Zona horaria para las fechas y los reportes</Text><Chips options={['America/Asuncion', 'America/Argentina/Buenos_Aires', 'UTC']} selected={draft.timezone} onChange={timezone => setDraft(d => ({ ...d, timezone }))} /></View>
    <View style={ui.card}><Text style={ui.heading}>Preferencias de interfaz</Text><Text style={ui.muted}>Tema claro suave · Paleta centralizada de salvia, azul y lavanda.</Text><Text style={ui.label}>Registros por página</Text><Chips options={['6', '8', '12', '20']} selected={String(draft.pageSize)} onChange={pageSize => setDraft(d => ({ ...d, pageSize: Number(pageSize) }))} /><Text style={ui.muted}>Se aplica a usuarios, tarjetas, áreas, lectores, permisos, historial, reportes y auditoría.</Text></View>
    <View style={ui.card}><Text style={ui.heading}>Notificaciones</Text><View style={[ui.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1, gap: 5 }}><Text style={ui.text}>Indicador de alertas nuevas</Text><Text style={ui.muted}>Mostrar el contador en la campana del panel. Las alertas siguen disponibles al ocultarlo.</Text></View><Switch accessibilityLabel="Indicador de alertas nuevas" value={draft.notifications} onValueChange={notifications => setDraft(d => ({ ...d, notifications }))} trackColor={{ false: colors.line, true: '#AACDBE' }} thumbColor={colors.primary} /></View></View>
    <View style={ui.card}><Text style={ui.heading}>Roles administrativos del proyecto</Text>{[['Administrador', 'Gestión general de los módulos.'], ['Seguridad', 'Consulta de accesos, credenciales e incidentes.'], ['RRHH', 'Gestión de personal y consulta de asistencia.']].map(([role, description]) => <View key={role} style={{ gap: 4 }}><Text style={ui.text}>{role}</Text><Text style={ui.muted}>{description}</Text></View>)}<Text style={ui.muted}>Referencia de diseño. Esta demostración usa una sola cuenta administrativa; la autorización real se implementará con el backend.</Text></View>
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}<View style={[ui.wrap, { justifyContent: 'flex-end' }]}><Button title="Restablecer formulario" variant="secondary" onPress={() => { setDraft(defaultSettings); setError(''); }} /><Button title="Guardar configuración" disabled={!dirty} onPress={() => setError(saveSettings(draft))} /></View>
  </ModulePage>;
}
