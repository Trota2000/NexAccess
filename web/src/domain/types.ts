export const ROLES = ['Empleado', 'Seguridad', 'RRHH', 'Administrador'] as const;
export type SystemRole = 'ADMIN' | 'SEGURIDAD' | 'RRHH';
export type AccessRole = typeof ROLES[number];
// Compatibility alias: all existing employee roles are physical-access roles.
export type Role = AccessRole;
export type Employee = {
  id: string; nombre: string; apellido: string; cedula: string; email: string; telefono: string;
  departamento: string; roles: Role[]; activo: boolean; createdAt: string;
};
export type EmployeeDraft = Omit<Employee, 'id' | 'createdAt'>;
export type Credential = { id: string; employeeId: string; maskedUid: string; tipo: 'FISICA' | 'DIGITAL'; activa: boolean; estado?: string; emitted: string; expires: string };
export type AccessEvent = { id: string; employeeId: string; credentialId: string; date: string; area: string; areaId?: string; deviceId?: string; lector: string; resultado: 'AUTORIZADO' | 'RECHAZADO'; motivo: string };
export type AccessPermission = { id?: string; role: Role; employeeId?: string; area: string; days: string; schedule: string; activa?: boolean };
