import React, { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ModulePage, { StatCards } from '../../components/ModulePage';
import { Badge, Button, Chips, Empty, Field } from '../../components/ui';
import { useUsers } from '../../state/UsersProvider';
import { normalize } from '../../domain/users';
import { ALERT_STATES } from '../../domain/system';
import { ui } from '../../theme';

export default function Alerts() {
  const { alerts, records, setAlertStatus, formatDate } = useUsers();
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('Todas'); const [priority, setPriority] = useState('Todas');
  const [selectedId, setSelectedId] = useState<string | null>(null); const [nextStatus, setNextStatus] = useState('Nueva');
  const selected = alerts.find(a => a.id === selectedId);
  const filtered = alerts.filter(a => normalize(`${a.id} ${a.title} ${a.description}`).includes(normalize(search)) && (status === 'Todas' || a.status === status) && (priority === 'Todas' || a.priority === priority));
  return <ModulePage title="Alertas" eyebrow="MONITOREO / NOTIFICACIONES" description="Revisá incidentes y acompañá su resolución en la demostración.">
    <StatCards items={ALERT_STATES.map(s => ({ label: s, value: alerts.filter(a => a.status === s).length }))} />
    <View style={ui.card}><View style={ui.wrap}><Field label="Buscar alertas" value={search} onChangeText={setSearch} placeholder="Tipo, descripción o identificador…" /></View><Text style={ui.label}>Estado</Text><Chips options={['Todas', ...ALERT_STATES]} selected={status} onChange={setStatus} /><Text style={ui.label}>Prioridad</Text><Chips options={['Todas', 'Informativa', 'Baja', 'Media', 'Alta', 'Crítica']} selected={priority} onChange={setPriority} /></View>
    {filtered.map(a => <View key={a.id} style={ui.card}><View style={[ui.wrap, { justifyContent: 'space-between' }]}><Text style={ui.heading}>{a.title}</Text><Badge active={a.status === 'Resuelta'} label={`${a.priority} · ${a.status}`} /></View><Text style={ui.muted}>{a.description}</Text><Text style={ui.muted}>{a.id} · {formatDate(a.date, true)} · {records.areas.find(r => r.id === a.areaId)?.fields.name ?? 'Sistema'}</Text><View style={{ alignSelf: 'flex-start' }}><Button title={`Revisar ${a.id}`} variant="secondary" onPress={() => { setSelectedId(a.id); setNextStatus(a.status); }} /></View></View>)}
    {!filtered.length && <Empty title="Sin alertas para esta selección" description="No hay incidentes que coincidan con los filtros." action={<Button title="Limpiar filtros" variant="secondary" onPress={() => { setSearch(''); setStatus('Todas'); setPriority('Todas'); }} />} />}
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelectedId(null)}><SafeAreaView style={{ flex: 1 }}><ScrollView contentContainerStyle={{ padding: 24, gap: 20, maxWidth: 700, width: '100%', alignSelf: 'center' }}>{selected && <><Text style={ui.title}>{selected.title}</Text><Badge active={selected.status === 'Resuelta'} label={selected.priority} /><Text style={ui.text}>{selected.description}</Text><Text style={ui.muted}>{selected.id} · {formatDate(selected.date, true)}</Text><Text style={ui.text}>Área: {records.areas.find(r => r.id === selected.areaId)?.fields.name ?? 'Sistema'}</Text><Text style={ui.text}>Dispositivo: {records.devices.find(r => r.id === selected.deviceId)?.fields.name ?? 'No corresponde'}</Text><View style={ui.card}><Text style={ui.heading}>Seguimiento</Text><Chips options={ALERT_STATES} selected={nextStatus} onChange={setNextStatus} /><View style={ui.wrap}><Button title="Cerrar detalle" variant="secondary" onPress={() => setSelectedId(null)} /><Button title="Guardar estado" disabled={nextStatus === selected.status} onPress={() => { setAlertStatus(selected.id, nextStatus); setSelectedId(null); }} /></View></View></>}</ScrollView></SafeAreaView></Modal>
  </ModulePage>;
}
