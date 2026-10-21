import { Employee, EmployeeDraft, Role, ROLES } from './types';

export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const documentKey = (value: string) => value.replace(/[.\s-]/g, '').toLowerCase();
export function cleanDraft(draft: EmployeeDraft): EmployeeDraft {
  return { ...draft, nombre: draft.nombre.trim(), apellido: draft.apellido.trim(), cedula: documentKey(draft.cedula),
    email: draft.email.trim().toLowerCase(), telefono: draft.telefono.trim(), departamento: draft.departamento.trim() };
}
export function validateDraft(draft: EmployeeDraft, users: Employee[], editingId?: string) {
  const d = cleanDraft(draft);
  const errors: Partial<Record<keyof EmployeeDraft, string>> = {};
  if (d.nombre.length < 2 || d.nombre.length > 100) errors.nombre = 'Ingresá un nombre de 2 a 100 caracteres.';
  if (d.apellido.length < 2 || d.apellido.length > 100) errors.apellido = 'Ingresá un apellido de 2 a 100 caracteres.';
  if (!/^[a-z0-9]{3,20}$/i.test(d.cedula)) errors.cedula = 'Ingresá un documento de 3 a 20 letras o números.';
  if (users.some(u => u.id !== editingId && documentKey(u.cedula) === d.cedula)) errors.cedula = 'Este documento ya está registrado.';
  if (d.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) || d.email.length > 150)) errors.email = 'Ingresá un correo válido (hasta 150 caracteres).';
  if (d.email && users.some(u => u.id !== editingId && u.email.toLowerCase() === d.email)) errors.email = 'Este correo ya está registrado.';
  if (d.telefono && (!/^[+\d\s()-]{6,30}$/.test(d.telefono))) errors.telefono = 'Revisá el teléfono (6 a 30 caracteres).';
  if (!d.departamento || d.departamento.length > 100) errors.departamento = 'Ingresá el departamento (hasta 100 caracteres).';
  if (!d.roles.length) errors.roles = 'Seleccioná al menos un rol.';
  else if (d.roles.some(role => !ROLES.includes(role)) || new Set(d.roles).size !== d.roles.length) errors.roles = 'Seleccioná roles de acceso válidos, sin duplicados.';
  return errors;
}
export function filterUsers(users: Employee[], search: string, role: Role | 'Todos', status: string) {
  const q = normalize(search);
  return users.filter(u => (!q || normalize(`${u.nombre} ${u.apellido} ${u.cedula} ${u.email} ${u.id}`).includes(q)) &&
    (role === 'Todos' || u.roles.includes(role)) && (status === 'Todos' || u.activo === (status === 'Activos')));
}
export const dateLabel = (date: string, withTime = false, timezone = 'America/Asuncion') => !date || Number.isNaN(Date.parse(date)) ? 'Sin fecha' : new Intl.DateTimeFormat('es-PY', {
  timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
}).format(new Date(date.length === 10 ? `${date}T12:00:00Z` : date));
