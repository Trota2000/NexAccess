import { AccessEvent, AccessPermission, Credential, Employee, Role } from '../domain/types';

const people: [string, string, string, Role[], boolean][] = [
  ['Camila', 'Benítez', 'Administración', ['Empleado'], true],
  ['Mateo', 'González', 'Seguridad', ['Seguridad'], true],
  ['Lucía', 'Fernández', 'Recursos Humanos', ['Empleado', 'RRHH'], true],
  ['Diego', 'Ramírez', 'Tecnología', ['Administrador'], true],
  ['Valentina', 'López', 'Tesorería', ['Empleado'], false],
  ['Santiago', 'Martínez', 'Administración', ['Empleado'], true],
  ['Sofía', 'Rojas', 'Tecnología', ['Empleado'], true],
  ['Julio', 'Bernal', 'Tecnología', ['Empleado', 'Administrador'], true],
  ['Ana', 'Duarte', 'Recursos Humanos', ['RRHH'], false],
  ['Nicolás', 'Vera', 'Seguridad', ['Seguridad'], true],
  ['Elena', 'Acosta', 'Tesorería', ['Empleado'], true],
  ['Bruno', 'Ortiz', 'Administración', ['Empleado'], true],
];
export const employees: Employee[] = people.map(([nombre, apellido, departamento, roles, activo], i) => ({
  id: `EMP-${String(i + 1).padStart(3, '0')}`, nombre, apellido, departamento, roles, activo,
  cedula: String(4200100 + i * 271), email: `persona${i + 1}@nexaccess.example`, telefono: `0981 555 ${String(i + 10).padStart(3, '0')}`,
  createdAt: `2026-09-${String(i + 2).padStart(2, '0')}T12:00:00Z`,
}));
export const credentials: Credential[] = employees.flatMap((p, i) => i === 5 || i === 8 ? [] : [
  { id: `CR-${i + 1}`, employeeId: p.id, maskedUid: `•••• •••• ${String(1034 + i)}`, tipo: 'FISICA' as const, activa: i !== 4, emitted: '2026-09-15', expires: '2027-09-15' },
  ...(i === 2 || i === 3 ? [{ id: `CD-${i + 1}`, employeeId: p.id, maskedUid: `•••• •••• ${String(8020 + i)}`, tipo: 'DIGITAL' as const, activa: true, emitted: '2026-09-20', expires: '2027-09-20' }] : []),
]);
export const events: AccessEvent[] = Array.from({ length: 20 }, (_, i): AccessEvent => {
  const credential = credentials[i % credentials.length];
  const rejected = i % 5 === 2;
  return { id: `EV-${String(i + 1).padStart(4, '0')}`, employeeId: credential.employeeId, credentialId: credential.id,
    date: `2026-10-${i < 12 ? '14' : '13'}T${String(11 - i % 4).padStart(2, '0')}:${String(50 - i % 10 * 4).padStart(2, '0')}:00-03:00`,
    area: ['Recepción', 'Administración', 'Datacenter'][i % 3], areaId: `AR-${i % 3 + 1}`, deviceId: `LE-${i % 3 + 1}`, lector: `Lector 0${i % 3 + 1}`,
    resultado: rejected ? 'RECHAZADO' : 'AUTORIZADO', motivo: rejected ? 'Área no autorizada para el rol' : 'Permiso válido',
  };
}).sort((a, b) => b.date.localeCompare(a.date));
export const permissions: AccessPermission[] = [
  { role: 'Empleado', area: 'Recepción', days: 'Lunes a viernes', schedule: '07:00 – 18:00' },
  { role: 'RRHH', area: 'Recursos Humanos', days: 'Lunes a viernes', schedule: '07:00 – 18:00' },
  { role: 'Seguridad', area: 'Recepción', days: 'Todos los días', schedule: '00:00 – 23:59' },
  { role: 'Seguridad', area: 'Administración', days: 'Todos los días', schedule: '00:00 – 23:59' },
  { role: 'Administrador', area: 'Datacenter', days: 'Lunes a viernes', schedule: '07:00 – 20:00' },
  { role: 'Administrador', area: 'Administración', days: 'Lunes a viernes', schedule: '07:00 – 20:00' },
];
