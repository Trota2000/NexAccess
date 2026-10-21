import { credentials, permissions } from './mock';
import { AlertRecord, AuditRecord, Records } from '../domain/system';

export const initialRecords: Records = {
  cards: credentials.map(c => ({ id: c.id, fields: { uid: `DEMO-${c.maskedUid.slice(-4)}`, employeeId: c.employeeId, type: c.tipo, emitted: c.emitted, expires: c.expires, status: c.activa ? 'Activa' : 'Inactiva' } })),
  areas: ['Recepción', 'Administración', 'Datacenter', 'Recursos Humanos', 'Tesorería'].map((name, i) => ({ id: `AR-${i + 1}`, fields: { name, code: `AREA-0${i + 1}`, description: ['Acceso principal y atención', 'Oficinas administrativas', 'Infraestructura de tecnología', 'Gestión de personal', 'Operaciones financieras'][i], building: i === 2 ? 'Bloque B' : 'Bloque A', floor: String(i % 3), location: `Sector ${i + 1}`, security: i > 1 ? 'Alta' : 'Estándar', schedule: '07:00 – 20:00', status: 'Activa' } })),
  devices: ['Recepción', 'Administración', 'Datacenter'].map((name, i) => ({ id: `LE-${i + 1}`, fields: { name: `Lector 0${i + 1}`, code: `NFC-00${i + 1}`, areaId: `AR-${i + 1}`, door: `Puerta ${name}`, type: i === 0 ? 'MIXTO' : 'ACCESO', status: i === 2 ? 'Desconectado' : 'Conectado', lastSeen: '2026-10-14T10:45:00-03:00', description: 'Lector NFC de demostración' } })),
  permissions: permissions.map((p, i) => ({ id: `PE-${i + 1}`, fields: { subject: 'Rol', employeeId: '', role: p.role, areaId: `AR-${['Recepción', 'Administración', 'Datacenter', 'Recursos Humanos', 'Tesorería'].indexOf(p.area) + 1}`, days: p.days, start: p.schedule.split(' – ')[0], end: p.schedule.split(' – ')[1], validFrom: '2026-09-01', validUntil: '', status: 'Activo' } })),
};
export const initialAlerts: AlertRecord[] = [
  { id: 'AL-001', title: 'Lector sin conexión', description: 'El lector de Datacenter dejó de enviar señales de estado. Revisar conectividad.', areaId: 'AR-3', deviceId: 'LE-3', priority: 'Alta', status: 'Nueva', date: '2026-10-14T10:50:00-03:00' },
  { id: 'AL-002', title: 'Intentos de acceso denegados', description: 'Se detectaron intentos repetidos de ingreso a un área restringida.', areaId: 'AR-3', deviceId: 'LE-3', priority: 'Media', status: 'En revisión', date: '2026-10-14T09:42:00-03:00' },
  { id: 'AL-003', title: 'Credencial inactiva presentada', description: 'Se presentó una credencial que no está habilitada.', areaId: 'AR-1', deviceId: 'LE-1', priority: 'Alta', status: 'Nueva', date: '2026-10-13T16:20:00-03:00' },
  { id: 'AL-004', title: 'Permiso actualizado', description: 'Se revisaron las autorizaciones del rol RRHH.', areaId: 'AR-4', deviceId: '', priority: 'Informativa', status: 'Resuelta', date: '2026-10-13T14:00:00-03:00' },
];
export const initialAudit: AuditRecord[] = [
  { id: 'AU-001', admin: 'Administrador Demo', action: 'Usuario creado', module: 'Usuarios', record: 'EMP-012', description: 'Alta del empleado Bruno Ortiz.', date: '2026-10-13T09:00:00-03:00', result: 'Correcto' },
  { id: 'AU-002', admin: 'Administrador Demo', action: 'Permiso revisado', module: 'Permisos', record: 'PE-2', description: 'Revisión del horario de Recursos Humanos.', date: '2026-10-13T14:00:00-03:00', result: 'Correcto' },
].reverse();
