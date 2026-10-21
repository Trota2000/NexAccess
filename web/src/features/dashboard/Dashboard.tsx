import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import ModulePage, { StatCards } from '../../components/ModulePage';
import { Badge, Button } from '../../components/ui';
import { BarChart } from '../../components/BarChart';
import { useUsers } from '../../state/UsersProvider';
import { dateKey, groupEvents } from '../../domain/reports';
import { ui } from '../../theme';
import EventList from '../access/EventList';

export default function Dashboard() {
  const { users, credentials, records, alerts, events, settings, formatDate } = useUsers();
  const lastDay = events.length ? dateKey(events[0].date, settings.timezone) : '';
  const today = dateKey(new Date().toISOString(), settings.timezone);
  const selectedDay = events.filter(e => dateKey(e.date, settings.timezone) === today);
  return <ModulePage title="Dashboard" eyebrow="GENERAL / VISTA GENERAL" description={`Una mirada a las personas, espacios y actividad de ${settings.institution}.`} actions={<Button title="Ver historial" icon="time-outline" variant="secondary" onPress={() => router.push('/historial')} />}>
    <Text style={ui.muted}>Indicadores del día: {formatDate(today)} · Último día con datos ficticios: {lastDay ? formatDate(lastDay) : 'Sin eventos'}. Los gráficos muestran toda la muestra.</Text>
    <StatCards items={[{ label: 'Empleados registrados', value: users.length, detail: `${users.filter(u => u.activo).length} activos` }, { label: 'Credenciales activas', value: credentials.filter(c => c.activa).length }, { label: 'Accesos permitidos', value: selectedDay.filter(e => e.resultado === 'AUTORIZADO').length }, { label: 'Accesos denegados', value: selectedDay.filter(e => e.resultado === 'RECHAZADO').length }, { label: 'Áreas registradas', value: records.areas.length }, { label: 'Lectores conectados', value: `${records.devices.filter(d => d.fields.status === 'Conectado').length}/${records.devices.length}`, detail: `${records.devices.filter(d => d.fields.status !== 'Conectado').length} sin conexión activa` }]} />
    <View style={ui.wrap}><Button title="Nuevo empleado" icon="person-add-outline" onPress={() => router.push('/usuarios/nuevo')} /><Button title="Gestionar tarjetas" variant="secondary" onPress={() => router.push('/tarjetas')} /><Button title="Revisar alertas" variant="secondary" onPress={() => router.push('/alertas')} /></View>
    <View style={[ui.wrap, { alignItems: 'stretch' }]}><BarChart title="Accesos por día" data={groupEvents(events, 'Día', settings.timezone)} /><BarChart title="Actividad por área" data={records.areas.map(a => ({ label: a.fields.name, value: events.filter(e => e.areaId === a.id).length }))} onSelect={area => router.push({ pathname: '/reportes', params: { area } })} /></View>
    <View style={[ui.wrap, { alignItems: 'flex-start' }]}><View style={{ flexGrow: 2, flexBasis: 450, gap: 16 }}><Text style={ui.heading}>Actividad reciente</Text><EventList events={events.slice(0, 4)} /></View><View style={[ui.card, { flexGrow: 1, flexBasis: 260 }]}><Text style={ui.heading}>Alertas pendientes</Text>{alerts.filter(a => a.status !== 'Resuelta').slice(0, 3).map(a => <View key={a.id} style={{ gap: 6 }}><Badge active={false} label={a.priority} /><Text style={ui.text}>{a.title}</Text><Text style={ui.muted}>{formatDate(a.date, true)}</Text></View>)}{!alerts.some(a => a.status !== 'Resuelta') && <Text style={ui.muted}>No hay alertas pendientes.</Text>}<Button title="Ver todas las alertas" variant="secondary" onPress={() => router.push('/alertas')} /></View></View>
  </ModulePage>;
}
