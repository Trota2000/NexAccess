import { useMemo, useState } from 'react';
import { Employee } from '../domain/types';
import { initialAlerts, initialAudit, initialRecords } from '../data/system';
import { defaultSettings, EntityKind, ManagedRecord, materializeCredentials, materializePermissions, nextId, Settings, validateRecord } from '../domain/system';
import { dateLabel } from '../domain/users';
import { useSession } from './SessionProvider';

const names: Record<EntityKind, string> = { cards: 'Tarjetas', areas: 'Áreas', devices: 'Dispositivos', permissions: 'Permisos' };
export function useSystemState(users: Employee[], notify: (message: string) => void) {
  const { session } = useSession();
  const [records, setRecords] = useState(initialRecords);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [audit, setAudit] = useState(initialAudit);
  const [settings, setSettings] = useState(defaultSettings);
  const credentials = useMemo(() => materializeCredentials(records.cards, settings.timezone), [records.cards, settings.timezone]);
  const permissions = useMemo(() => materializePermissions(records, settings.timezone), [records, settings.timezone]);
  function auditAction(action: string, module: string, record: string, description: string) {
    setAudit(current => [{ id: nextId('AU', current), admin: session?.displayName ?? 'Administrador Demo', action, module, record, description, date: new Date().toISOString(), result: 'Correcto' }, ...current]);
  }
  function saveRecord(kind: EntityKind, fields: Record<string, string>, id?: string) {
    const clean = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()]));
    if (kind === 'permissions') { if (clean.subject === 'Rol') clean.employeeId = ''; else clean.role = ''; }
    const errors = validateRecord(kind, clean, records, users, id, settings.timezone);
    if (Object.keys(errors).length) return errors;
    if (id && !records[kind].some(r => r.id === id)) return { form: 'El registro ya no está disponible.' };
    const resultId = id ?? nextId({ cards: 'CR', areas: 'AR', devices: 'LE', permissions: 'PE' }[kind], records[kind]);
    const row: ManagedRecord = { id: resultId, fields: clean };
    setRecords(current => ({ ...current, [kind]: id ? current[kind].map(r => r.id === id ? row : r) : [row, ...current[kind]] }));
    auditAction(id ? 'Registro actualizado' : 'Registro creado', names[kind], resultId, `${names[kind]}: ${id ? 'actualización' : 'alta'} de ${clean.name ?? clean.code ?? resultId}.`);
    notify(id ? 'Cambios guardados en la demostración.' : 'Registro creado correctamente.');
    return {};
  }
  function setAlertStatus(id: string, status: string) {
    if (!['Nueva', 'En revisión', 'Resuelta'].includes(status) || !alerts.some(a => a.id === id)) return;
    setAlerts(current => current.map(a => a.id === id ? { ...a, status } : a));
    auditAction('Estado de alerta actualizado', 'Alertas', id, `La alerta pasó a ${status}.`);
    notify(`Alerta marcada como ${status.toLowerCase()}.`);
  }
  function saveSettings(value: Settings) {
    if (!value.appName.trim() || !value.institution.trim() || value.appName.length > 40 || value.institution.length > 100) return 'Revisá el nombre del sistema y la institución.';
    if (![6, 8, 12, 20].includes(value.pageSize) || !['America/Asuncion', 'America/Argentina/Buenos_Aires', 'UTC'].includes(value.timezone)) return 'Seleccioná preferencias válidas.';
    setSettings({ ...value, appName: value.appName.trim(), institution: value.institution.trim() });
    auditAction('Configuración actualizada', 'Configuración', 'SISTEMA', 'Se actualizaron las preferencias locales.');
    notify('Configuración guardada para esta sesión.');
    return '';
  }
  return { records, credentials, permissions, alerts, audit, settings, saveRecord, setAlertStatus, saveSettings, auditAction,
    formatDate: (value: string, withTime = false) => dateLabel(value, withTime, settings.timezone),
  };
}
