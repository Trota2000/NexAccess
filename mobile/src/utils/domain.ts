import { isValid, parseISO, format } from "date-fns";
import { AttendanceRecord, Credential, SystemRole } from "../types";
export const reasonLabels: Record<string,string> = {AUTHORIZED:'Permiso válido',NO_PERMISSION:'Sin permiso para esta área',OUTSIDE_SCHEDULE:'Fuera del horario permitido',CREDENTIAL_REVOKED:'Credencial revocada',EMPLOYEE_INACTIVE:'Empleado inactivo'};
export const can = (
  role: SystemRole | undefined,
  scope: "security" | "hr" | "admin",
) =>
  role === "ADMIN" ||
  (scope === "security" && role === "SEGURIDAD") ||
  (scope === "hr" && role === "RRHH");
export function credentialStatus(c: Credential, now = new Date()) {
  return c.revokedAt
    ? "REVOCADA"
    : c.expiresAt && parseISO(c.expiresAt) <= now
      ? "VENCIDA"
      : c.active
        ? "ACTIVA"
        : "INACTIVA";
}
export const dateTime = (value: string) =>
  isValid(parseISO(value))
    ? format(parseISO(value), "dd/MM/yyyy · HH:mm")
    : "Sin fecha";
export const dateKey = (value: string) => format(parseISO(value), "yyyy-MM-dd");
export function manualError(
  employeeId: string,
  at: string,
  note: string,
  records: AttendanceRecord[],
  now = new Date(),
) {
  if (!employeeId || !note.trim())
    return "Seleccioná un empleado e indicá un motivo.";
  const instant = parseISO(at);
  if (!isValid(instant)) return "Ingresá una fecha y hora válidas.";
  if (instant > now) return "No se permiten marcaciones futuras.";
  if (
    records.some(
      (r) =>
        r.employeeId === employeeId &&
        Math.abs(+parseISO(r.at) - +instant) < 60000,
    )
  )
    return "Ya hay una marcación de este empleado a menos de 60 segundos.";
  return undefined;
}
