import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ModulePage, { StatCards } from '../../components/ModulePage';
import { Badge, Button, Chips, Confirm, Empty, Field, Icon } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { cardState, EntityKind, ManagedRecord, validateRecord } from '../../domain/system';
import { useUsers } from '../../state/UsersProvider';
import { normalize } from '../../domain/users';
import { colors, ui } from '../../theme';
import { defaultDraft, editorFields, labels } from './schema';
import EventList from '../access/EventList';
import PermissionMatrix from './PermissionMatrix';

export default function EntityManager({ kind }: { kind: EntityKind }) {
  const store = useUsers();
  const { records, users, permissions, events, saveRecord, formatDate, settings } = store;
  const spec = labels[kind];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; fields: Record<string, string>; action: string; fromEditor: boolean } | null>(null);
  const [discard, setDiscard] = useState(false);
  const rows = records[kind];
  const state = (r: ManagedRecord) => kind === 'cards' ? cardState(r, new Date(), settings.timezone) : kind === 'permissions' && r.fields.status === 'Activo' && !permissions.find(p => p.id === r.id)?.activa ? 'Suspendido' : r.fields.status;
  const isActive = (r: ManagedRecord) => ['Activa', 'Activo', 'Conectado'].includes(state(r));
  const employeeName = (id: string) => { const u = users.find(p => p.id === id); return u ? `${u.nombre} ${u.apellido}` : 'Sin asignar'; };
  const areaName = (id: string) => records.areas.find(a => a.id === id)?.fields.name ?? 'Sin área';
  const title = (row: ManagedRecord) => kind === 'cards' ? `•••• •••• ${row.fields.uid.slice(-4)}` : kind === 'permissions' ? (row.fields.subject === 'Usuario' ? employeeName(row.fields.employeeId) : row.fields.role) : row.fields.name;
  const subtitle = (row: ManagedRecord) => kind === 'cards' ? `${employeeName(row.fields.employeeId)} · ${row.fields.type === 'FISICA' ? 'Física' : 'Digital'}` : kind === 'areas' ? `${row.fields.building} · Piso ${row.fields.floor || '—'} · ${row.fields.security}` : kind === 'devices' ? `${areaName(row.fields.areaId)} · ${row.fields.door}` : `${areaName(row.fields.areaId)} · ${row.fields.days} · ${row.fields.start} – ${row.fields.end}`;
  const filtered = rows.filter(r => normalize(`${r.id} ${title(r)} ${subtitle(r)} ${Object.entries(r.fields).filter(([key]) => key !== 'uid').map(([, value]) => value).join(' ')} ${kind === 'cards' ? r.fields.uid : ''}`).includes(normalize(search)) && (filter === 'Todos' || state(r) === filter));
  const pages = Math.max(1, Math.ceil(filtered.length / settings.pageSize));
  const current = Math.min(page, pages);
  const selected = rows.find(r => r.id === details);
  function open(row?: ManagedRecord) { setEditingId(row?.id); setDraft(row ? { ...row.fields } : defaultDraft(kind, store)); setErrors({}); setEditor(true); }
  function commit(fields: Record<string, string>, id?: string) { const result = saveRecord(kind, fields, id); setErrors(result); if (!Object.keys(result).length) { setEditor(false); setPending(null); } else setEditor(true); }
  function submit() {
    const validation = validateRecord(kind, draft, records, users, editingId, settings.timezone);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    const before = rows.find(r => r.id === editingId);
    if (before && before.fields.status !== draft.status && !['Activo', 'Activa', 'Conectado'].includes(draft.status)) { setEditor(false); setPending({ id: before.id, fields: draft, action: `Cambiar estado a ${draft.status}`, fromEditor: true }); } else commit(draft, editingId);
  }
  function requestChange(row: ManagedRecord, fields: Record<string, string>, action: string) { setPending({ id: row.id, fields: { ...row.fields, ...fields }, action, fromEditor: false }); }
  const statuses = ['Todos', ...new Set(rows.map(state))];
  const closeEditor = () => { const initial = rows.find(r => r.id === editingId)?.fields ?? defaultDraft(kind, store); if (JSON.stringify(initial) !== JSON.stringify(draft)) setDiscard(true); else setEditor(false); };
  return <ModulePage title={spec.title} eyebrow="ADMINISTRACIÓN" description={spec.description} actions={<Button title={`Registrar ${spec.singular}`} icon="add-outline" onPress={() => open()} />}>
    <StatCards items={[{ label: 'Registros', value: rows.length }, { label: kind === 'devices' ? 'Conectados' : 'Habilitados', value: rows.filter(isActive).length }, { label: 'Resultados', value: filtered.length }]} />
    <View style={ui.card}><View style={ui.wrap}><Field label={`Buscar en ${spec.title.toLowerCase()}`} value={search} onChangeText={v => { setSearch(v); setPage(1); }} placeholder="Nombre, identificador o ubicación…" /></View><Chips options={statuses} selected={filter} onChange={v => { setFilter(v); setPage(1); }} /></View>
    {filtered.slice((current - 1) * settings.pageSize, current * settings.pageSize).map(row => <View key={row.id} style={ui.card}>
      <View style={[ui.wrap, { justifyContent: 'space-between' }]}><View style={[ui.row, { flexShrink: 1 }]}><Icon name={kind === 'cards' ? 'card-outline' : kind === 'areas' ? 'business-outline' : kind === 'devices' ? 'hardware-chip-outline' : 'shield-checkmark-outline'} color={colors.primary} size={25} /><View style={{ gap: 4, flexShrink: 1 }}><Text style={ui.heading}>{title(row)}</Text><Text style={ui.muted}>{row.id}{row.fields.code ? ` · ${row.fields.code}` : ''}</Text></View></View><Badge active={isActive(row)} label={state(row)} /></View>
      <Text style={ui.muted}>{subtitle(row)}</Text>
      <View style={ui.wrap}><Button title={`Ver detalle ${row.id}`} variant="secondary" icon="eye-outline" onPress={() => setDetails(row.id)} /><Button title={`Editar ${row.id}`} variant="secondary" icon="create-outline" onPress={() => open(row)} />
        {kind === 'cards' && <>{row.fields.status !== 'Bloqueada' && row.fields.status !== 'Revocada' && <Button title={`Bloquear ${row.id}`} variant="danger" onPress={() => requestChange(row, { status: 'Bloqueada' }, 'Bloquear credencial')} />}{!!row.fields.employeeId && row.fields.status !== 'Revocada' && <Button title={`Desvincular ${row.id}`} variant="secondary" onPress={() => requestChange(row, { employeeId: '', status: 'Inactiva' }, 'Desvincular credencial')} />}</>}
        {kind === 'areas' && <Button title={`${row.fields.status === 'Activa' ? 'Desactivar' : 'Activar'} ${row.id}`} variant="secondary" onPress={() => requestChange(row, { status: row.fields.status === 'Activa' ? 'Inactiva' : 'Activa' }, 'Cambiar estado del área')} />}
        {kind === 'permissions' && row.fields.status === 'Activo' && <Button title={`Revocar ${row.id}`} variant="danger" onPress={() => requestChange(row, { status: 'Revocado' }, 'Revocar permiso')} />}
      </View>
    </View>)}
    {!filtered.length && <View style={ui.card}><Empty title="No hay registros para mostrar" description="Revisá los filtros o registrá un nuevo elemento." action={<Button title="Limpiar filtros" variant="secondary" onPress={() => { setSearch(''); setFilter('Todos'); setPage(1); }} />} /></View>}
    <View style={[ui.wrap, { justifyContent: 'space-between' }]}><Text style={ui.muted}>Página {current} de {pages} · {filtered.length} registros</Text><View style={ui.row}><Button title="Anterior" variant="secondary" disabled={current === 1} onPress={() => setPage(current - 1)} /><Button title="Siguiente" variant="secondary" disabled={current === pages} onPress={() => setPage(current + 1)} /></View></View>
    {kind === 'permissions' && <PermissionMatrix />}
    <Modal visible={editor} animationType="slide" onRequestClose={closeEditor}><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 20, width: '100%', maxWidth: 850, alignSelf: 'center' }}><Text style={ui.title}>{editingId ? `Editar ${spec.singular}` : `Registrar ${spec.singular}`}</Text><Text style={ui.muted}>Los campos con * son obligatorios. Las acciones se simulan durante esta sesión.</Text><View style={[ui.card, ui.wrap, { alignItems: 'flex-start', gap: 20 }]}>{editorFields(kind, store, draft).map(field => field.options ? <SelectField key={field.key} label={field.label} value={draft[field.key] ?? ''} options={field.options} error={errors[field.key]} onChange={value => { setDraft(d => ({ ...d, [field.key]: value })); setErrors(e => ({ ...e, [field.key]: '' })); }} /> : <Field key={field.key} label={field.label} value={draft[field.key] ?? ''} error={errors[field.key]} multiline={field.multiline} maxLength={field.multiline ? 500 : 150} autoCapitalize={field.key === 'uid' || field.key === 'code' ? 'characters' : 'sentences'} onChangeText={value => { setDraft(d => ({ ...d, [field.key]: value })); setErrors(e => ({ ...e, [field.key]: '' })); }} />)}</View>{!!errors.form && <Text style={{ color: colors.danger }}>{errors.form}</Text>}{Object.values(errors).some(Boolean) && <Text accessibilityRole="alert" style={{ color: colors.danger }}>Revisá los campos señalados antes de guardar.</Text>}<View style={[ui.wrap, { justifyContent: 'flex-end' }]}><Button title="Cancelar" variant="secondary" onPress={closeEditor} /><Button title="Guardar registro" icon="checkmark-outline" onPress={submit} /></View></ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setDetails(null)}><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScrollView contentContainerStyle={{ padding: 24, gap: 20, width: '100%', maxWidth: 900, alignSelf: 'center' }}>{selected && <><View style={[ui.wrap, { justifyContent: 'space-between' }]}><Text style={ui.title}>Detalle · {selected.id}</Text><Button title="Cerrar detalle" variant="secondary" onPress={() => setDetails(null)} /></View><View style={ui.card}><Text style={ui.heading}>{title(selected)}</Text><Badge active={isActive(selected)} label={state(selected)} />{editorFields(kind, store, selected.fields).map(field => <View key={field.key} style={{ gap: 4 }}><Text style={ui.label}>{field.label.replace(' *', '')}</Text><Text selectable style={ui.text}>{field.key === 'uid' ? title(selected) : field.options?.find(o => o.value === selected.fields[field.key])?.label ?? (selected.fields[field.key] || 'No informado')}</Text></View>)}{kind === 'devices' && <Text style={ui.muted}>Última comunicación: {selected.fields.lastSeen ? formatDate(selected.fields.lastSeen, true) : 'Sin comunicación registrada'}</Text>}</View>
      {kind === 'areas' && <View style={ui.card}><Text style={ui.heading}>Lectores asociados</Text><Text style={ui.text}>{records.devices.filter(d => d.fields.areaId === selected.id).map(d => d.fields.name).join(' · ') || 'Sin lectores asociados'}</Text><Text style={ui.heading}>Usuarios con permiso vigente</Text><Text style={ui.muted}>{users.filter(u => u.activo && permissions.some(p => p.area === selected.fields.name && p.activa && (p.employeeId ? p.employeeId === u.id : u.roles.includes(p.role)))).map(u => `${u.nombre} ${u.apellido}`).join(' · ') || 'Sin usuarios autorizados'}</Text></View>}
      {kind !== 'permissions' && <View style={{ gap: 12 }}><Text style={ui.heading}>Historial relacionado</Text><EventList events={events.filter(e => kind === 'cards' ? e.credentialId === selected.id : kind === 'areas' ? e.areaId === selected.id : e.deviceId === selected.id)} /></View>}
    </>}</ScrollView></SafeAreaView></Modal>
    <Confirm visible={!!pending} title={pending?.action ?? 'Confirmar cambio'} description="El cambio actualizará este registro y sus referencias en los demás módulos de la demostración. El historial se conservará." action="Confirmar cambio" onCancel={() => { if (pending?.fromEditor) setEditor(true); setPending(null); }} onConfirm={() => { if (pending) commit(pending.fields, pending.id); }} />
    <Confirm visible={discard} title="¿Descartar los cambios?" description="La información del formulario todavía no se ha guardado." action="Descartar" onCancel={() => setDiscard(false)} onConfirm={() => { setDiscard(false); setEditor(false); }} />
  </ModulePage>;
}
