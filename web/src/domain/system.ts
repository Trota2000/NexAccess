import { Employee, Credential, AccessPermission } from './types';
import { normalize } from './users';
import { dateKey } from './reports';

export type EntityKind = 'cards' | 'areas' | 'devices' | 'permissions';
export type ManagedRecord = { id: string; fields: Record<string, string> };
export type Records = Record<EntityKind, ManagedRecord[]>;
export type AlertRecord = { id: string; title: string; description: string; areaId: string; deviceId: string; priority: string; status: string; date: string };
export type AuditRecord = { id: string; admin: string; action: string; module: string; record: string; description: string; date: string; result: string };
export type Settings = { appName: string; institution: string; timezone: string; pageSize: number; notifications: boolean };
export const CARD_STATES = ['Activa', 'Inactiva', 'Bloqueada', 'Extraviada', 'Vencida', 'Revocada'];
export const DEVICE_STATES = ['Conectado', 'Desconectado', 'Error', 'Mantenimiento'];
export const ALERT_STATES = ['Nueva', 'En revisión', 'Resuelta'];
export const defaultSettings: Settings = { appName: 'NexAccess', institution: 'Institución de demostración', timezone: 'America/Asuncion', pageSize: 8, notifications: true };
export function nextId(prefix: string, rows: { id: string }[]) {
  return `${prefix}-${String(Math.max(0, ...rows.map(r => Number(r.id.split('-').at(-1)) || 0)) + 1).padStart(3, '0')}`;
}
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export function cardState(row: ManagedRecord, now = new Date(), timezone = 'America/Asuncion') {
  const status = row.fields.status;
  if ((status === 'Activa' || status === 'Inactiva') && row.fields.expires && row.fields.expires < dateKey(now.toISOString(), timezone)) return 'Vencida';
  return status;
}
export function materializeCredentials(rows: ManagedRecord[], timezone = 'America/Asuncion'): Credential[] {
  return rows.map(r => ({ id: r.id, employeeId: r.fields.employeeId, maskedUid: `•••• •••• ${r.fields.uid.slice(-4)}`, tipo: r.fields.type as Credential['tipo'], activa: cardState(r, new Date(), timezone) === 'Activa', estado: cardState(r, new Date(), timezone), emitted: r.fields.emitted, expires: r.fields.expires }));
}
export function materializePermissions(records: Records, timezone = 'America/Asuncion'): AccessPermission[] {
  const today = dateKey(new Date().toISOString(), timezone);
  return records.permissions.map(r => ({ id: r.id, role: r.fields.role as AccessPermission['role'], employeeId: r.fields.employeeId,
    area: records.areas.find(a => a.id === r.fields.areaId)?.fields.name ?? 'Área no disponible',
    days: r.fields.days, schedule: `${r.fields.start} – ${r.fields.end}`,
    activa: r.fields.status === 'Activo' && records.areas.some(a => a.id === r.fields.areaId && a.fields.status === 'Activa') && (!r.fields.validFrom || r.fields.validFrom <= today) && (!r.fields.validUntil || r.fields.validUntil >= today),
  }));
}
export function validateRecord(kind: EntityKind, f: Record<string, string>, records: Records, users: Employee[], id?: string, timezone = 'America/Asuncion') {
  const e: Record<string, string> = {};
  const required = (key: string, label: string) => { if (!f[key]?.trim()) e[key] = `${label} es obligatorio.`; };
  const unique = (key: string) => { if (records[kind].some(r => r.id !== id && normalize(r.fields[key] ?? '') === normalize(f[key] ?? ''))) e[key] = 'Este valor ya está registrado.'; };
  const known = (key: string, values: string[]) => { if (!values.includes(f[key])) e[key] = 'Seleccioná una opción válida.'; };
  const areaExists = () => { if (!records.areas.some(r => r.id === f.areaId)) e.areaId = 'Seleccioná un área existente.'; };
  if (kind === 'cards') {
    required('uid', 'El identificador'); unique('uid');
    if (f.uid && !/^[a-z\d:_-]{4,150}$/i.test(f.uid)) e.uid = 'Usá 4 a 150 letras, números, guiones o dos puntos.';
    if (f.employeeId && !users.some(u => u.id === f.employeeId)) e.employeeId = 'Seleccioná un usuario existente.';
    known('status', CARD_STATES); known('type', ['FISICA', 'DIGITAL']);
    const previous = records.cards.find(r => r.id === id);
    if (previous?.fields.status === 'Revocada') {
      if (f.status !== 'Revocada') e.status = 'Una credencial revocada no puede reactivarse ni cambiar de estado.';
      if (f.employeeId !== previous.fields.employeeId) e.employeeId = 'Una credencial revocada conserva su empleado y su historial.';
      if (f.uid !== previous.fields.uid) e.uid = 'Una credencial revocada no puede cambiar de identificador.';
    }
    if (!validDate(f.emitted ?? '')) e.emitted = 'Usá una fecha válida: AAAA-MM-DD.';
    if (f.expires && (!validDate(f.expires) || f.expires < f.emitted)) e.expires = 'El vencimiento debe ser posterior o igual a la emisión.';
    if (f.status === 'Activa' && !f.employeeId) e.employeeId = 'Asigná un usuario para activar la credencial.';
    if (f.status === 'Activa' && f.expires && f.expires < dateKey(new Date().toISOString(), timezone)) e.expires = 'Una credencial vencida no puede activarse.';
  } else if (kind === 'areas') {
    required('name', 'El nombre'); required('code', 'El código'); unique('code'); unique('name'); required('building', 'El edificio');
    known('security', ['Estándar', 'Restringida', 'Alta']); known('status', ['Activa', 'Inactiva']);
  } else if (kind === 'devices') {
    required('name', 'El nombre'); required('code', 'El código'); unique('code'); required('door', 'La puerta'); areaExists();
    known('type', ['ACCESO', 'MARCACION', 'MIXTO']); known('status', DEVICE_STATES);
  } else {
    areaExists(); known('days', ['Lunes a viernes', 'Todos los días', 'Sábado y domingo']); known('status', ['Activo', 'Revocado']);
    if (f.subject === 'Usuario') { if (!users.some(u => u.id === f.employeeId)) e.employeeId = 'Seleccioná un usuario.'; }
    else if (f.subject === 'Rol') known('role', ['Empleado', 'Seguridad', 'RRHH', 'Administrador']); else e.subject = 'Seleccioná Rol o Usuario.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.start ?? '')) e.start = 'Usá una hora válida: HH:MM.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.end ?? '') || f.end <= f.start) e.end = 'La hora final debe ser posterior a la inicial.';
    if (f.validFrom && !validDate(f.validFrom)) e.validFrom = 'Usá AAAA-MM-DD.';
    if (f.validUntil && (!validDate(f.validUntil) || (f.validFrom && f.validUntil < f.validFrom))) e.validUntil = 'Revisá el intervalo de vigencia.';
    if (records.permissions.some(r => r.id !== id && r.fields.subject === f.subject && r.fields.areaId === f.areaId && (f.subject === 'Rol' ? r.fields.role === f.role : r.fields.employeeId === f.employeeId) && r.fields.status === 'Activo' && f.status === 'Activo')) e.areaId = 'Ya existe un permiso activo para este destinatario y área.';
  }
  Object.entries(f).forEach(([key, value]) => { if (value.length > (key === 'description' ? 500 : 150)) e[key] = 'El texto es demasiado largo.'; });
  return e;
}
