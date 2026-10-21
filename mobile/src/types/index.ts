export type SystemRole = "EMPLEADO" | "SEGURIDAD" | "RRHH" | "ADMIN";
export interface AuthUser {
  id: string;
  username: string;
  employeeId: string;
  role: SystemRole;
  active: boolean;
}
export interface Employee {
  id: string;
  name: string;
  document: string;
  email: string;
  phone?: string;
  department?: string;
  active: boolean;
  accessRoleIds: string[];
}
export interface AccessRole {
  id: string;
  code: string;
  name: string;
  active: boolean;
}
export interface Credential {
  id: string;
  employeeId: string;
  type: "FISICA" | "DIGITAL";
  name: string;
  active: boolean;
  expiresAt?: string;
  revokedAt?: string;
  maskedCode: string;
}
export interface Area {
  id: string;
  code: string;
  name: string;
  restricted: boolean;
  active: boolean;
  description: string;
}
export interface Device {
  id: string;
  code: string;
  name: string;
  areaId: string;
  type: "ACCESO" | "MARCACION" | "MIXTO";
  active: boolean;
  lastSeen: string;
}
export interface AccessPermission {
  id: string;
  accessRoleId: string;
  areaId: string;
  days: number[];
  start: string;
  end: string;
  active: boolean;
}
export interface AccessEvent {
  id: string;
  employeeId: string;
  credentialId: string;
  areaId: string;
  deviceId: string;
  at: string;
  type: string;
  result: "AUTORIZADO" | "RECHAZADO";
  reason: string;
}
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  at: string;
  type: "ENTRADA" | "SALIDA";
  deviceId?: string;
  source: "DISPOSITIVO" | "MANUAL";
  note?: string;
}
export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  resource: string;
  result: string;
  detail: string;
}
export interface AppNotification {
  id: string;
  employeeId?: string;
  roles?: SystemRole[];
  title: string;
  description: string;
  at: string;
  type: "CREDENCIAL" | "ACCESO" | "PERMISO" | "AVISO" | "DISPOSITIVO";
  readBy: string[];
}
export interface DemoData {
  employees: Employee[];
  users: AuthUser[];
  accessRoles: AccessRole[];
  credentials: Credential[];
  areas: Area[];
  devices: Device[];
  permissions: AccessPermission[];
  events: AccessEvent[];
  attendance: AttendanceRecord[];
  notifications: AppNotification[];
  audit: AuditEvent[];
}
