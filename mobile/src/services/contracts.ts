import {
  AccessEvent,
  AccessPermission,
  AttendanceRecord,
  AuthUser,
  Credential,
  Employee,
} from "../types";

/** Frontera para la futura integración. No contiene llamadas HTTP ni endpoints inventados. */
export interface NexAccessGateway {
  listEmployees(): Promise<Employee[]>;
  listCredentials(): Promise<Credential[]>;
  listAccessEvents(query: {
    from?: string;
    to?: string;
    employeeId?: string;
  }): Promise<AccessEvent[]>;
  listAttendance(query: {
    from?: string;
    to?: string;
    employeeId?: string;
  }): Promise<AttendanceRecord[]>;
  createManualAttendance(
    record: Omit<AttendanceRecord, "id" | "source">,
  ): Promise<AttendanceRecord>;
  saveAccessPermission(permission: AccessPermission): Promise<AccessPermission>;
}

/** La sesión demo nunca debe reutilizarse como credencial de una API real. */
export interface SessionGateway {
  login(username: string, password: string): Promise<AuthUser>;
  logout(): Promise<void>;
}

/** Presentación de identificadores: nunca guardar aquí UID completos ni tokens. */
export const maskIdentifier = (value: string) => `••••${value.slice(-4)}`;
