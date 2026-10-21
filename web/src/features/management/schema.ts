import { CARD_STATES, DEVICE_STATES, EntityKind } from '../../domain/system';
import { ROLES } from '../../domain/types';
import { useUsers } from '../../state/UsersProvider';
import { Option } from '../../components/SelectField';
import { dateKey } from '../../domain/reports';

export type EditorField = { key: string; label: string; options?: Option[]; multiline?: boolean };
export const labels: Record<EntityKind, { title: string; singular: string; description: string }> = {
  cards: { title: 'Tarjetas RFID/NFC', singular: 'tarjeta', description: 'Credenciales de empleados. Bloqueada y Extraviada son estados de la demo; la API usa actividad, vencimiento y revocación.' },
  areas: { title: 'Áreas y salas', singular: 'área', description: 'Organizá los espacios, sus ubicaciones y niveles de seguridad.' },
  devices: { title: 'Lectores y dispositivos', singular: 'lector', description: 'Consultá el estado y la ubicación de los lectores de demostración.' },
  permissions: { title: 'Permisos de acceso', singular: 'permiso', description: 'Roles de acceso físico y horarios. Los permisos individuales y con vigencia son propuestas de la demo, pendientes de contrato API.' },
};
const opts = (items: readonly string[]) => items.map(value => ({ value, label: value }));
export function editorFields(kind: EntityKind, store: ReturnType<typeof useUsers>, draft: Record<string, string>): EditorField[] {
  const areaOptions = store.records.areas.map(a => ({ value: a.id, label: `${a.fields.name}${a.fields.status === 'Inactiva' ? ' · Inactiva' : ''}` }));
  const userOptions = [{ value: '', label: 'Sin asignar' }, ...store.users.map(u => ({ value: u.id, label: `${u.nombre} ${u.apellido} · ${u.id}${!u.activo ? ' · Inactivo' : ''}` }))];
  if (kind === 'cards') return [
    { key: 'uid', label: 'Identificador RFID/NFC *' }, { key: 'employeeId', label: 'Empleado asignado', options: userOptions },
    { key: 'type', label: 'Tipo *', options: [{ value: 'FISICA', label: 'Física' }, { value: 'DIGITAL', label: 'Digital' }] },
    { key: 'emitted', label: 'Fecha de emisión * · AAAA-MM-DD' }, { key: 'expires', label: 'Vencimiento · AAAA-MM-DD' }, { key: 'status', label: 'Estado *', options: opts(CARD_STATES) },
  ];
  if (kind === 'areas') return [
    { key: 'name', label: 'Nombre *' }, { key: 'code', label: 'Código *' }, { key: 'description', label: 'Descripción', multiline: true },
    { key: 'building', label: 'Edificio / bloque *' }, { key: 'floor', label: 'Piso' }, { key: 'location', label: 'Ubicación' },
    { key: 'security', label: 'Nivel de seguridad *', options: opts(['Estándar', 'Restringida', 'Alta']) }, { key: 'schedule', label: 'Horario de funcionamiento' }, { key: 'status', label: 'Estado *', options: opts(['Activa', 'Inactiva']) },
  ];
  if (kind === 'devices') return [
    { key: 'name', label: 'Nombre *' }, { key: 'code', label: 'Código *' }, { key: 'areaId', label: 'Área asignada *', options: areaOptions },
    { key: 'door', label: 'Puerta *' }, { key: 'type', label: 'Tipo de dispositivo *', options: opts(['ACCESO', 'MARCACION', 'MIXTO']) },
    { key: 'status', label: 'Estado de conexión *', options: opts(DEVICE_STATES) }, { key: 'description', label: 'Descripción', multiline: true },
  ];
  return [
    { key: 'subject', label: 'Destinatario *', options: [{value:'Rol',label:'Rol de acceso físico'},{value:'Usuario',label:'Empleado (propuesta)'}] },
    ...(draft.subject === 'Usuario' ? [{ key: 'employeeId', label: 'Empleado *', options: userOptions.filter(o => !!o.value) }] : [{ key: 'role', label: 'Rol físico *', options: opts(ROLES) }]),
    { key: 'areaId', label: 'Área autorizada *', options: areaOptions }, { key: 'days', label: 'Días permitidos *', options: opts(['Lunes a viernes', 'Todos los días', 'Sábado y domingo']) },
    { key: 'start', label: 'Hora de inicio * · HH:MM' }, { key: 'end', label: 'Hora final * · HH:MM' },
    { key: 'validFrom', label: 'Inicio de vigencia · AAAA-MM-DD' }, { key: 'validUntil', label: 'Vencimiento · AAAA-MM-DD' }, { key: 'status', label: 'Estado *', options: opts(['Activo', 'Revocado']) },
  ];
}
export function defaultDraft(kind: EntityKind, store: ReturnType<typeof useUsers>): Record<string, string> {
  const today = dateKey(new Date().toISOString(), store.settings.timezone);
  if (kind === 'cards') return { uid: '', employeeId: '', type: 'FISICA', emitted: today, expires: '', status: 'Inactiva' };
  if (kind === 'areas') return { name: '', code: '', description: '', building: '', floor: '', location: '', security: 'Estándar', schedule: '07:00 – 18:00', status: 'Activa' };
  if (kind === 'devices') return { name: '', code: '', areaId: store.records.areas[0]?.id ?? '', door: '', type: 'ACCESO', status: 'Desconectado', description: '', lastSeen: '' };
  return { subject: 'Rol', role: 'Empleado', employeeId: '', areaId: store.records.areas[0]?.id ?? '', days: 'Lunes a viernes', start: '07:00', end: '18:00', validFrom: today, validUntil: '', status: 'Activo' };
}
