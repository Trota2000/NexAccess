import { ApiClient, ApiError, id, Row, SystemRole } from "./client";
import { pageOf, resource } from "./resources";
export const createLabels: Record<string, string> = {
  employees: "Crear empleado",
  credentials: "Registrar credencial",
  areas: "Crear área",
  roles: "Crear rol físico",
  devices: "Registrar lector",
  "access-permissions": "Crear permiso",
  attendance: "Agregar marcación manual",
  users: "Crear cuenta",
  enrollments: "Iniciar enrolamiento",
};
export interface RelatedFlow {
  title: string;
  key: string;
  query?: Row;
  seed?: Row;
  label?: string;
  deviceScope?: number;
  report?: boolean;
}
export function relatedFlows(
  key: string,
  row: Row,
  role: SystemRole,
): RelatedFlow[] {
  const security = ["ADMIN", "SEGURIDAD"].includes(role),
    hr = ["ADMIN", "RRHH"].includes(role);
  const label = String(row.fullName ?? row.name ?? row.code ?? `ID ${row.id}`);
  const flows: RelatedFlow[] = [];
  if (key === "employees") {
    if (security)
      flows.push(
        {
          title: "Ver credenciales del empleado",
          key: "credentials",
          query: { employeeId: id(row.id) },
          label,
        },
        {
          title: "Ver accesos del empleado",
          key: "access-events",
          query: { employeeId: id(row.id) },
          label,
        },
        {
          title: "Enrolar tarjeta para este empleado",
          key: "enrollments",
          seed: { employeeId: id(row.id) },
          label,
        },
      );
    if (hr)
      flows.push({
        title: "Ver asistencia del empleado",
        key: "attendance",
        query: { employeeId: id(row.id) },
        label,
      });
    if (role === "ADMIN")
      flows.push({
        title: "Crear cuenta para este empleado",
        key: "users",
        seed: { employeeId: id(row.id) },
        label,
      });
  }
  if (key === "roles" && security)
    flows.push({
      title: "Ver permisos de este rol",
      key: "access-permissions",
      query: { roleId: id(row.id) },
      label,
    });
  if (key === "areas" && security)
    flows.push(
      {
        title: "Ver lectores del área",
        key: "devices",
        query: { areaId: id(row.id) },
        label,
      },
      {
        title: "Ver permisos del área",
        key: "access-permissions",
        query: { areaId: id(row.id) },
        label,
      },
      {
        title: "Ver accesos del área",
        key: "access-events",
        query: { areaId: id(row.id) },
        label,
      },
    );
  if (key === "devices" && security)
    flows.push(
      {
        title: "Ver eventos de este dispositivo",
        key: "access-events",
        query: { deviceId: id(row.id) },
        deviceScope: id(row.id),
        label,
      },
      {
        title: "Enrolar tarjeta en este lector",
        key: "enrollments",
        seed: { deviceId: id(row.id) },
        label,
      },
    );
  return flows;
}
export function writeReceipt(key: string, result: unknown): Row {
  const raw = result as Row;
  const row = (key === "devices" && raw?.device ? raw.device : raw) as Row;
  if (!row || typeof row !== "object")
    throw new ApiError(
      "El servidor respondió, pero no se pudo identificar el registro guardado. Actualizá y verificá antes de repetir.",
      0,
      "WRITE_RECEIPT_INVALID",
    );
  try {
    id(row.id);
  } catch {
    throw new ApiError(
      "El servidor respondió sin un ID válido. Actualizá y verificá antes de repetir.",
      0,
      "WRITE_RECEIPT_INVALID",
    );
  }
  const allowed = [
    "id",
    "maskedCode",
    ...resource(key).columns,
    ...resource(key).fields.map((f) => f.key),
    "revokedAt",
    "createdAt",
    "updatedAt",
    "issuedAt",
    "completedAt",
  ];
  return Object.fromEntries(
    Object.entries(row).filter(
      ([k]) =>
        allowed.includes(k) && !/password|deviceKey|accessToken/i.test(k),
    ),
  );
}
export function formErrorMap(
  errors: Record<string, string[]>,
  key: string,
): Record<string, string> {
  const fields = resource(key).fields;
  const result: Record<string, string> = {};
  for (const [raw, messages] of Object.entries(errors)) {
    const normalized = raw.replace(/^\$\./, "").toLowerCase();
    const field = fields.find(
      (f) =>
        f.key.toLowerCase() === normalized ||
        (normalized === "credentialcode" && f.key === "codigo_credencial"),
    );
    if (field)
      result[field.key] = (
        Array.isArray(messages) ? messages : [String(messages)]
      ).join(" ");
  }
  return result;
}
export interface Metric {
  label: string;
  key: string;
  query: Row;
  value?: number;
  error?: string;
  hint?: string;
}
export async function loadMetrics(
  client: ApiClient,
  role: SystemRole,
  now = new Date(),
  selectedRange?: Row,
): Promise<Metric[]> {
  const range = selectedRange ?? {
    from: new Date(now.getTime() - 86400000).toISOString(),
    to: now.toISOString(),
  };
  const specs: Omit<Metric, "value" | "error">[] = [
    { label: "Empleados activos", key: "employees", query: { isActive: true } },
    { label: "Áreas activas", key: "areas", query: { isActive: true } },
    ...(role === "ADMIN" || role === "SEGURIDAD"
      ? [
          {
            label: "Accesos autorizados · 24 h",
            key: "access-events",
            query: { ...range, result: "AUTORIZADO" },
          },
          {
            label: "Accesos rechazados · 24 h",
            key: "access-events",
            query: { ...range, result: "RECHAZADO" },
          },
          {
            label: "Lectores habilitados",
            key: "devices",
            query: { isActive: true },
            hint: "La actividad administrativa no confirma conectividad.",
          },
          {
            label: "Permisos habilitados",
            key: "access-permissions",
            query: { isActive: true },
          },
        ]
      : []),
    ...(role === "ADMIN" || role === "RRHH"
      ? [{ label: "Marcaciones · 24 h", key: "attendance", query: range }]
      : []),
  ];
  return Promise.all(
    specs.map(async (metric) => {
      if (selectedRange) metric.label = metric.label.replace("24 h", "período");
      try {
        const r = resource(metric.key);
        const page = pageOf(
          await client.request(`/${metric.key}`, {
            query: { ...metric.query, page: 1, pageSize: 1 },
          }),
          r,
        );
        return { ...metric, value: page.totalItems };
      } catch (e) {
        return {
          ...metric,
          error: e instanceof Error ? e.message : "No disponible",
        };
      }
    }),
  );
}
