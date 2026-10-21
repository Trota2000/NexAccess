import React, { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ModulePage from '../../components/ModulePage';
import { Badge, Button, Chips, Empty, Field } from '../../components/ui';
import { useUsers } from '../../state/UsersProvider';
import { normalize } from '../../domain/users';
import { dateKey } from '../../domain/reports';
import { validDate } from '../../domain/system';
import { colors, ui } from '../../theme';
import { SelectField } from '../../components/SelectField';

export default function Audit() {
  const { audit, formatDate, settings } = useUsers();
  const [search, setSearch] = useState(''); const [module, setModule] = useState('Todos'); const [date, setDate] = useState(''); const [page, setPage] = useState(1);
  const [actor,setActor]=useState('Todos'); const [action,setAction]=useState('Todas');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dateError = !!date && !validDate(date);
  const filtered = dateError ? [] : audit.filter(a => (actor === 'Todos' || a.admin === actor) && (action === 'Todas' || a.action === action) && (module === 'Todos' || a.module === module) && normalize(`${a.admin} ${a.action} ${a.record} ${a.description}`).includes(normalize(search)) && (!date || dateKey(a.date, settings.timezone) === date));
  const selected = audit.find(a => a.id === selectedId);
  const pages = Math.max(1, Math.ceil(filtered.length / settings.pageSize)); const current = Math.min(page, pages);
  return <ModulePage title="Auditoría" eyebrow="MONITOREO / TRAZABILIDAD" description="Consultá los cambios administrativos. Estos registros son de solo lectura.">
    <View style={[ui.card, { backgroundColor: colors.blue }]}><Text style={ui.text}>Las altas, ediciones, cambios de estado y exportaciones de esta sesión se incorporan automáticamente.</Text></View>
    <View style={ui.card}><View style={ui.wrap}><Field label="Buscar en auditoría" value={search} onChangeText={v => { setSearch(v); setPage(1); }} placeholder="Administrador, acción o registro…" /><Field label="Fecha · AAAA-MM-DD" value={date} onChangeText={v => { setDate(v); setPage(1); }} placeholder="Todas las fechas" error={dateError ? 'Ingresá una fecha válida.' : undefined} /></View><View style={ui.wrap}><SelectField label="Administrador responsable" value={actor} options={[{value:'Todos',label:'Todos'},...Array.from(new Set(audit.map(a=>a.admin))).map(value=>({value,label:value}))]} onChange={v=>{setActor(v);setPage(1);}}/><SelectField label="Acción" value={action} options={[{value:'Todas',label:'Todas'},...Array.from(new Set(audit.map(a=>a.action))).map(value=>({value,label:value}))]} onChange={v=>{setAction(v);setPage(1);}}/></View><Chips options={['Todos', ...new Set(audit.map(a => a.module))]} selected={module} onChange={v => { setModule(v); setPage(1); }} /><Button title="Limpiar filtros" variant="secondary" onPress={() => { setSearch('');setActor('Todos');setAction('Todas'); setModule('Todos'); setDate(''); setPage(1); }} /></View>
    {filtered.slice((current - 1) * settings.pageSize, current * settings.pageSize).map(a => <View key={a.id} style={ui.card}><View style={[ui.wrap, { justifyContent: 'space-between' }]}><Text style={ui.heading}>{a.action}</Text><Badge active label={a.result} /></View><Text style={ui.text}>{a.description}</Text><Text style={ui.muted}>{a.admin} · {a.module} · {a.record}</Text><Text style={ui.muted}>{formatDate(a.date, true)}</Text><View style={{ alignSelf: 'flex-start' }}><Button title={`Ver auditoría ${a.id}`} variant="secondary" onPress={() => setSelectedId(a.id)} /></View></View>)}
    {!filtered.length && <Empty title="No hay eventos para esta selección" description="Las acciones del sistema aparecerán aquí; también podés ajustar los filtros." />}
    <View style={[ui.wrap, { justifyContent: 'space-between' }]}><Text style={ui.muted}>Página {current} de {pages} · {filtered.length} eventos</Text><View style={ui.row}><Button title="Anterior" variant="secondary" disabled={current === 1} onPress={() => setPage(current - 1)} /><Button title="Siguiente" variant="secondary" disabled={current === pages} onPress={() => setPage(current + 1)} /></View></View>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelectedId(null)}><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScrollView contentContainerStyle={{ padding: 24, gap: 18, maxWidth: 700, width: '100%', alignSelf: 'center' }}>{selected && <><Text style={ui.title}>Detalle de auditoría</Text><View style={ui.card}>{Object.entries({ ID: selected.id, Administrador: selected.admin, Acción: selected.action, Módulo: selected.module, Registro: selected.record, Fecha: formatDate(selected.date, true), Descripción: selected.description, Resultado: selected.result }).map(([label, value]) => <View key={label} style={{ gap: 4 }}><Text style={ui.label}>{label}</Text><Text style={ui.text}>{value}</Text></View>)}</View><Button title="Cerrar detalle" onPress={() => setSelectedId(null)} /></>}</ScrollView></SafeAreaView></Modal>
  </ModulePage>;
}
