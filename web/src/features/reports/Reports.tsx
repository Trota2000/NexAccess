import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ModulePage, { StatCards } from '../../components/ModulePage';
import { Button, Chips, Field } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { BarChart } from '../../components/BarChart';
import { useUsers } from '../../state/UsersProvider';
import { dateKey, eventRows, groupEvents } from '../../domain/reports';
import { validDate } from '../../domain/system';
import { exportCsv, exportPdf } from '../../utils/export';
import EventList from '../access/EventList';
import { colors, ui } from '../../theme';
import { eventTime } from '../../domain/history';

export default function Reports() {
  const { users, credentials, events, records, settings, auditAction } = useUsers();
  const params = useLocalSearchParams<{ area?: string }>();
  const [area, setArea] = useState(records.areas.find(a => a.fields.name === params.area)?.id ?? 'Todas');
  const [person, setPerson] = useState('Todos');
  const [result, setResult] = useState('Todos');
  const [group, setGroup] = useState('Día');
  const [from, setFrom] = useState(''); const [until, setUntil] = useState('');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const rangeError = (from && !validDate(from)) || (until && !validDate(until)) || (from && until && from > until) ? 'Ingresá un intervalo válido con formato AAAA-MM-DD.' : '';
  const filtered = rangeError ? [] : events.filter(e => {
    const day = dateKey(e.date, settings.timezone);
    return (area === 'Todas' || e.areaId === area) && (person === 'Todos' || e.employeeId === person) && (result === 'Todos' || e.resultado === result) && (!from || day >= from) && (!until || day <= until);
  });
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / settings.pageSize)));
  async function download(pdf: boolean) {
    setBusy(true); setMessage('');
    try { const rows = eventRows(filtered, users, credentials); if (pdf) await exportPdf(rows, `${settings.appName} · Reporte de accesos`); else await exportCsv(rows, 'nexaccess-accesos.csv'); setMessage(pdf && Platform.OS === 'web' ? 'Se abrió el diálogo de impresión. Elegí Guardar como PDF para generar el archivo.' : 'Archivo preparado para descargar o compartir.'); auditAction('Reporte preparado', 'Reportes', 'EXPORTACIÓN', `${filtered.length} eventos · ${pdf ? 'PDF / impresión' : 'CSV'}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo preparar el archivo.'); } finally { setBusy(false); }
  }
  function clear() { setArea('Todas'); setPerson('Todos'); setResult('Todos'); setFrom(''); setUntil(''); setPage(1); setMessage(''); }
  return <ModulePage title="Reportes" eyebrow="MONITOREO / ESTADÍSTICAS" description="Explorá la actividad y exportá los registros de la selección actual." actions={<View style={ui.wrap}><Button title={busy ? 'Preparando…' : 'Exportar CSV'} icon="download-outline" disabled={busy || !filtered.length || !!rangeError} onPress={() => { void download(false); }} /><Button title="Imprimir / PDF" icon="print-outline" variant="secondary" disabled={busy || !filtered.length || !!rangeError} onPress={() => { void download(true); }} /></View>}>
    <View style={ui.card}><View style={[ui.wrap, { alignItems: 'flex-start' }]}><SelectField label="Área" value={area} options={[{ value: 'Todas', label: 'Todas las áreas' }, ...records.areas.map(a => ({ value: a.id, label: a.fields.name }))]} onChange={v => { setArea(v); setPage(1); }} /><SelectField label="Empleado" value={person} options={[{ value: 'Todos', label: 'Todos los empleados' }, ...users.map(u => ({ value: u.id, label: `${u.nombre} ${u.apellido}` }))]} onChange={v => { setPerson(v); setPage(1); }} /></View><View style={ui.wrap}><Field label="Desde · AAAA-MM-DD" value={from} onChangeText={v => { setFrom(v); setPage(1); }} placeholder="2026-10-01" /><Field label="Hasta · AAAA-MM-DD" value={until} onChangeText={v => { setUntil(v); setPage(1); }} placeholder="2026-10-31" /></View><Chips options={['Todos', 'AUTORIZADO', 'RECHAZADO']} selected={result} onChange={v => { setResult(v); setPage(1); }} /><Button title="Limpiar filtros" variant="secondary" onPress={clear} />{!!rangeError && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{rangeError}</Text>}</View>
    {!!message && <View accessibilityLiveRegion="polite" style={[ui.card, { backgroundColor: colors.blue }]}><Text style={ui.text}>{message}</Text></View>}
    <StatCards items={[{ label: 'Accesos seleccionados', value: filtered.length }, { label: 'Permitidos', value: filtered.filter(e => e.resultado === 'AUTORIZADO').length }, { label: 'Denegados', value: filtered.filter(e => e.resultado === 'RECHAZADO').length }]} />
    <Chips options={['Día', 'Semana', 'Mes']} selected={group} onChange={setGroup} />
    <View style={[ui.wrap, { alignItems: 'stretch' }]}><BarChart title={`Accesos por ${group.toLowerCase()}`} data={groupEvents(filtered, group, settings.timezone)} /><BarChart title="Áreas con mayor actividad" data={records.areas.map(a => ({ label: a.fields.name, value: filtered.filter(e => e.areaId === a.id).length })).filter(a => a.value).sort((a, b) => b.value - a.value)} onSelect={name => { setArea(records.areas.find(a => a.fields.name === name)?.id ?? 'Todas'); setPage(1); }} /></View>
    <BarChart title="Empleados con más registros" data={users.map(u => ({ label: `${u.nombre} ${u.apellido}`, value: filtered.filter(e => e.employeeId === u.id).length })).filter(u => u.value).sort((a, b) => b.value - a.value).slice(0, 5)} />
    <Text style={ui.heading}>Registros del reporte</Text><EventList events={filtered.slice((current - 1) * settings.pageSize, current * settings.pageSize)} /><View style={[ui.wrap, { justifyContent: 'space-between' }]}><Text style={ui.muted}>Página {current} · {filtered.length} eventos · Zona: {settings.timezone}</Text><View style={ui.row}><Button title="Anterior" variant="secondary" disabled={current === 1} onPress={() => setPage(current - 1)} /><Button title="Siguiente" variant="secondary" disabled={current * settings.pageSize >= filtered.length} onPress={() => setPage(current + 1)} /></View></View>
    <View style={[ui.wrap,{alignItems:'stretch'}]}><BarChart title="Actividad por lector" data={records.devices.map(d=>({label:d.fields.name,value:filtered.filter(e=>e.deviceId===d.id).length})).filter(d=>d.value)}/><BarChart title="Franjas horarias con actividad" data={Array.from({length:24},(_,h)=>({label:String(h).padStart(2,'0')+':00',value:filtered.filter(e=>Number(eventTime(e.date,settings.timezone).slice(0,2))===h).length})).filter(h=>h.value)}/></View>
  </ModulePage>;
}
