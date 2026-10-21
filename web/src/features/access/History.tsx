import React, { useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Screen, pagePadding } from '../../components/Screen';
import { Button, Chips, Empty, Field } from '../../components/ui';
import { SelectField } from '../../components/SelectField';
import { useUsers } from '../../state/UsersProvider';
import { emptyHistoryFilters, filterAccessEvents, historyFilterError, HistoryFilters } from '../../domain/history';
import { eventRows } from '../../domain/reports';
import { exportCsv } from '../../utils/export';
import EventList from './EventList';
import { colors, ui } from '../../theme';

export default function History() {
  const { width } = useWindowDimensions();
  const { users, credentials, events, records, settings, auditAction } = useUsers();
  const [filters, setFilters] = useState(emptyHistoryFilters);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const error = historyFilterError(filters);
  const filtered = filterAccessEvents(events, users, credentials, filters, settings.timezone);
  const pages = Math.max(1, Math.ceil(filtered.length / settings.pageSize));
  const current = Math.min(page, pages);
  function change(key: keyof HistoryFilters, value: string) { setFilters(f => ({ ...f, [key]: value })); setPage(1); setMessage(''); }
  function reset() { setFilters(emptyHistoryFilters); setPage(1); setMessage(''); }
  async function download() {
    setBusy(true); setMessage('');
    try {
      await exportCsv(eventRows(filtered, users, credentials), 'nexaccess-historial.csv');
      auditAction('Historial exportado', 'Historial', 'EXPORTACIÓN', String(filtered.length) + ' eventos de la selección actual.');
      setMessage('CSV preparado con todos los registros filtrados, no solo la página visible.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo preparar el CSV.'); }
    finally { setBusy(false); }
  }
  return <Screen section="Historial de accesos"><ScrollView contentContainerStyle={{ padding: pagePadding(width), maxWidth: 1200, width: '100%', alignSelf: 'center', gap: 22, paddingBottom: 40 }}>
    <View style={{ gap: 8 }}><Text style={[ui.label, { color: colors.primary, letterSpacing: 2, fontSize: 11 }]}>ACTIVIDAD / CONSULTA</Text><Text style={ui.title}>Historial de accesos</Text><Text style={ui.muted}>Eventos de acceso físico de los empleados. No son marcaciones de asistencia.</Text></View>
    <View style={ui.card}>
      <View style={ui.wrap}><Field label="Buscar accesos" value={filters.search} onChangeText={v => change('search', v)} placeholder="Empleado, evento, ID de credencial o terminación enmascarada…" /></View>
      <View style={ui.wrap}><SelectField label="Área" value={filters.area} options={[{value:'Todas',label:'Todas las áreas'}, ...records.areas.map(a => ({value:a.id,label:a.fields.name}))]} onChange={v => change('area',v)} /><SelectField label="Lector" value={filters.device} options={[{value:'Todos',label:'Todos los lectores'}, ...records.devices.map(d => ({value:d.id,label:d.fields.name}))]} onChange={v => change('device',v)} /></View>
      <View style={ui.wrap}><Field label="Desde · AAAA-MM-DD" value={filters.from} onChangeText={v => change('from',v)} placeholder="2026-10-01" /><Field label="Hasta · AAAA-MM-DD" value={filters.until} onChangeText={v => change('until',v)} placeholder="2026-10-31" /></View>
      <View style={ui.wrap}><Field label="Hora desde · HH:MM" value={filters.timeFrom} onChangeText={v => change('timeFrom',v)} placeholder="00:00" /><Field label="Hora hasta · HH:MM" value={filters.timeUntil} onChangeText={v => change('timeUntil',v)} placeholder="23:59" /></View>
      <Text style={ui.label}>Resultado</Text><Chips options={['Todos','AUTORIZADO','RECHAZADO']} selected={filters.result} onChange={v => change('result',v)} />
      <Text style={ui.label}>Orden cronológico</Text><Chips options={['Recientes','Antiguos']} selected={filters.order} onChange={v => change('order',v)} />
      {!!error && <Text accessibilityRole="alert" style={{color:colors.danger}}>{error}</Text>}
      <View style={ui.wrap}><Button title="Limpiar filtros" variant="secondary" onPress={reset} /><Button title={busy ? 'Preparando CSV…' : 'Exportar selección CSV'} icon="download-outline" disabled={busy || !!error || !filtered.length} onPress={() => { void download(); }} /></View>
      <Text style={ui.muted}>{filtered.length} eventos de demostración · Fechas y horas en {settings.timezone}</Text>
    </View>
    {!!message && <View accessibilityLiveRegion="polite" style={ui.card}><Text style={ui.text}>{message}</Text></View>}
    {filtered.length ? <EventList events={filtered.slice((current - 1) * settings.pageSize, current * settings.pageSize)} /> : <View style={ui.card}><Empty title="No encontramos accesos" description={error || 'Revisá la búsqueda y los filtros.'} action={<Button title="Limpiar filtros" variant="secondary" onPress={reset} />} /></View>}
    <View style={[ui.wrap, { justifyContent: 'space-between' }]}><Text style={ui.muted}>Página {current} de {pages}</Text><View style={ui.row}><Button title="Anterior" variant="secondary" disabled={current === 1} onPress={() => setPage(current - 1)} /><Button title="Siguiente" variant="secondary" disabled={current === pages} onPress={() => setPage(current + 1)} /></View></View>
    <Text style={ui.muted}>Solo lectura. Los eventos conservan sus datos históricos; el estado actual del lector no demuestra su estado al ocurrir el acceso. La API distingue AUTORIZADO y RECHAZADO, sin inferir entrada o salida laboral.</Text>
  </ScrollView></Screen>;
}
