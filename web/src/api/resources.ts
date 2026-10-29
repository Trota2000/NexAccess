import {
  ApiClient,
  ApiError,
  id,
  instant,
  Page,
  Row,
  SystemRole,
} from "./client";
export interface Field {
  key: string;
  label: string;
  type?: "text" | "id" | "boolean" | "datetime" | "time" | "password";
  required?: boolean;
  max?: number;
  min?: number;
  pattern?: string;
  choices?: string[];
  reference?: string;
  default?: string | boolean;
  createOnly?: boolean;
  format?: "document" | "phone" | "email" | "personName" | "taxId";
  hint?: string;
}
export interface Resource {
  key: string;
  title: string;
  read: SystemRole[];
  write: SystemRole[];
  paged?: boolean;
  create?: boolean;
  edit?: boolean;
  status?: boolean;
  fields: Field[];
  filters: Field[];
  columns: string[];
  description: string;
  export?: boolean;
}
const all: SystemRole[] = ["ADMIN", "SEGURIDAD", "RRHH"];
const security: SystemRole[] = ["ADMIN", "SEGURIDAD"];
const hr: SystemRole[] = ["ADMIN", "RRHH"];
const admin: SystemRole[] = ["ADMIN"];
const active: Field = {
  key: "isActive",
  label: "Activo",
  type: "boolean",
  default: true,
};
const code: Field = {
  key: "code",
  label: "Código",
  required: true,
  pattern: "^[A-Za-z0-9_-]{2,50}$",
  max: 50,
};
const name: Field = { key: "name", label: "Nombre", required: true, max: 100 };
const description: Field = {
  key: "description",
  label: "Descripción",
  max: 255,
};
const employee: Field = {
  key: "employeeId",
  label: "Empleado",
  type: "id",
  reference: "employees",
  required: true,
};
const area: Field = {
  key: "areaId",
  label: "Área",
  type: "id",
  reference: "areas",
  required: true,
};
const role: Field = {
  key: "roleId",
  label: "Rol de acceso físico",
  type: "id",
  reference: "roles",
  required: true,
};
const device: Field = {
  key: "deviceId",
  label: "Dispositivo",
  type: "id",
  reference: "devices",
  required: true,
};
const dateFilters: Field[] = [
  { key: "from", label: "Desde", type: "datetime" },
  { key: "to", label: "Hasta", type: "datetime" },
];
const activeFilter: Field = {
  key: "isActive",
  label: "Estado",
  choices: ["true", "false"],
};
const search: Field = { key: "search", label: "Buscar", max: 100 };
const optional = (field: Field): Field => ({ ...field, required: false });
export const permissionFields: Field[] = [
  role,
  area,
  { key: "startTime", label: "Hora inicial (HH:mm)", type: "time" },
  { key: "endTime", label: "Hora final (HH:mm)", type: "time" },
  ...[
    ["monday", "Lunes"],
    ["tuesday", "Martes"],
    ["wednesday", "Miércoles"],
    ["thursday", "Jueves"],
    ["friday", "Viernes"],
    ["saturday", "Sábado"],
    ["sunday", "Domingo"],
  ].map(
    ([key, label], i): Field => ({
      key,
      label,
      type: "boolean",
      default: i < 5,
    }),
  ),
  active,
];
export const resources: Resource[] = [
  {
    key: "employees",
    title: "Empleados",
    read: all,
    write: hr,
    paged: true,
    create: true,
    edit: true,
    status: true,
    description:
      "Personas con acceso físico. Sus roles físicos se administran por separado de las cuentas de inicio de sesión.",
    fields: [
      {
        key: "documentNumber",
        label: "Documento",
        required: true,
        min: 3,
        max: 20,
        format: "document",
        hint: "Solo números, entre 3 y 20 dígitos. Ej.: 1234567.",
      },
      {
        key: "firstName",
        label: "Nombres",
        required: true,
        max: 100,
        format: "personName",
      },
      {
        key: "lastName",
        label: "Apellidos",
        required: true,
        max: 100,
        format: "personName",
      },
      {
        key: "email",
        label: "Correo",
        max: 150,
        format: "email",
        hint: "Ej.: nombre@gmail.com o nombre@ficticio.net.",
      },
      {
        key: "phone",
        label: "Teléfono",
        max: 30,
        format: "phone",
        hint: "Entre 6 y 15 dígitos; admite + inicial, espacios, guiones y paréntesis.",
      },
    ],
    filters: [search, activeFilter],
    columns: [
      "fullName",
      "documentNumber",
      "email",
      "phone",
      "isActive",
      "roles",
    ],
  },
  {
    key: "credentials",
    title: "Credenciales RFID/NFC",
    read: security,
    write: security,
    paged: true,
    create: true,
    status: true,
    description:
      "El servidor determina ACTIVA, INACTIVA, VENCIDA o REVOCADA. La revocación es definitiva; el código y el titular no se editan.",
    fields: [
      employee,
      {
        key: "codigo_credencial",
        label: "Código de credencial",
        required: true,
        max: 200,
      },
      {
        key: "type",
        label: "Tipo",
        required: true,
        choices: ["FISICA", "DIGITAL"],
        default: "FISICA",
      },
      optional(name),
      {
        key: "expiresAt",
        label: "Vencimiento con zona (opcional)",
        type: "datetime",
      },
    ],
    filters: [optional(employee), activeFilter],
    columns: [
      "employeeName",
      "codigo_credencial",
      "name",
      "type",
      "status",
      "expiresAt",
      "revocationReason",
    ],
  },
  {
    key: "areas",
    title: "Áreas y salas",
    read: all,
    write: security,
    paged: true,
    create: true,
    edit: true,
    description:
      "La restricción y la actividad son propiedades distintas del área.",
    fields: [
      code,
      name,
      description,
      {
        key: "isRestricted",
        label: "Área restringida",
        type: "boolean",
        default: true,
      },
      active,
    ],
    filters: [search, activeFilter],
    columns: ["code", "name", "description", "isRestricted", "isActive"],
  },
  {
    key: "roles",
    title: "Roles de acceso físico",
    read: all,
    write: security,
    create: true,
    edit: true,
    description:
      "Estos roles habilitan áreas y horarios. No conceden privilegios administrativos.",
    fields: [
      { ...code, pattern: "^[A-Za-z0-9_]{2,50}$" },
      name,
      description,
      active,
    ],
    filters: [activeFilter],
    columns: ["code", "name", "description", "isActive"],
  },
  {
    key: "devices",
    title: "Lectores y dispositivos",
    read: security,
    write: security,
    paged: true,
    create: true,
    edit: true,
    status: true,
    description:
      "Activo no significa conectado. Última conexión informa el último contacto recibido; no se inventa un estado online.",
    fields: [
      { ...code, createOnly: true },
      name,
      {
        key: "type",
        label: "Función",
        required: true,
        choices: ["ACCESO", "MARCACION", "MIXTO"],
      },
      optional(area),
      description,
    ],
    filters: [
      activeFilter,
      optional(area),
      {
        key: "type",
        label: "Función",
        choices: ["ACCESO", "MARCACION", "MIXTO"],
      },
    ],
    columns: [
      "code",
      "name",
      "type",
      "areaName",
      "isActive",
      "lastConnectionAt",
      "keyRotatedAt",
    ],
  },
  {
    key: "access-permissions",
    title: "Permisos de acceso",
    read: security,
    write: security,
    paged: true,
    create: true,
    edit: true,
    status: true,
    description:
      "Un permiso por rol físico y área. Horarios en la zona configurada en el servidor (America/Asuncion por defecto); un fin anterior al inicio cruza medianoche. Ambas horas vacías: sin restricción horaria.",
    fields: permissionFields,
    filters: [optional(role), optional(area), activeFilter],
    columns: [
      "roleCode",
      "areaCode",
      "startTime",
      "endTime",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
      "isActive",
    ],
  },
  {
    key: "access-events",
    title: "Historial de accesos",
    read: security,
    write: [],
    paged: true,
    export: true,
    description:
      "Eventos autorizados o rechazados por el servidor. La lista y la exportación usan los mismos filtros.",
    fields: [],
    filters: [
      ...dateFilters,
      optional(employee),
      optional(device),
      optional(area),
      {
        key: "result",
        label: "Resultado",
        choices: ["AUTORIZADO", "RECHAZADO"],
      },
    ],
    columns: [
      "occurredAt",
      "employeeName",
      "deviceCode",
      "areaName",
      "result",
      "reason",
      "maskedCredential",
    ],
  },
  {
    key: "attendance",
    title: "Asistencia",
    read: hr,
    write: hr,
    paged: true,
    create: true,
    export: true,
    description:
      "Agregar una marcación manual no modifica ni borra registros anteriores. El motivo es obligatorio y el servidor valida duplicados. Los reportes diarios requieren un rango de fechas.",
    fields: [
      employee,
      {
        key: "type",
        label: "Tipo",
        required: true,
        choices: ["ENTRADA", "SALIDA"],
      },
      {
        key: "occurredAt",
        label: "Fecha y hora",
        type: "datetime",
        required: true,
      },
      { key: "note", label: "Motivo", required: true, min: 3, max: 255 },
    ],
    filters: [
      ...dateFilters,
      optional(employee),
      { key: "type", label: "Tipo", choices: ["ENTRADA", "SALIDA"] },
      { key: "source", label: "Origen", choices: ["DISPOSITIVO", "MANUAL"] },
    ],
    columns: [
      "employeeName",
      "type",
      "occurredAt",
      "source",
      "deviceCode",
      "note",
    ],
  },
  {
    key: "users",
    title: "Cuentas de operadores",
    read: admin,
    write: admin,
    create: true,
    status: true,
    description:
      "Solo ADMIN crea cuentas. No existe registro público. El rol del sistema se toma de la API, sin selector para elevar privilegios.",
    fields: [
      {
        key: "username",
        label: "Usuario",
        required: true,
        min: 3,
        max: 100,
        pattern: "^[A-Za-z0-9._-]{3,100}$",
      },
      {
        key: "password",
        label: "Contraseña inicial",
        type: "password",
        required: true,
        min: 10,
        max: 200,
      },
      {
        key: "role",
        label: "Perfil del sistema",
        required: true,
        choices: ["ADMIN", "SEGURIDAD", "RRHH", "EMPLEADO"],
      },
      optional(employee),
      {
        key: "webAccessEnabled",
        label: "Acceso al panel web",
        type: "boolean",
        default: true,
      },
      {
        key: "mobileAccessEnabled",
        label: "Acceso a la app NFC",
        type: "boolean",
        default: false,
      },
    ],
    filters: [],
    columns: [
      "username",
      "role",
      "employeeId",
      "webAccessEnabled",
      "mobileAccessEnabled",
      "isActive",
      "lastLoginAt",
    ],
  },
  {
    key: "audit",
    title: "Auditoría",
    read: admin,
    write: [],
    paged: true,
    description:
      "Solo lectura. Se muestran exclusivamente las acciones registradas por el backend.",
    fields: [],
    filters: [
      ...dateFilters,
      { key: "userId", label: "ID de cuenta", type: "id" },
      { key: "entity", label: "Entidad", max: 60 },
      { key: "action", label: "Acción", max: 60 },
    ],
    columns: [
      "occurredAt",
      "userId",
      "deviceId",
      "action",
      "entity",
      "entityId",
      "detail",
      "ipAddress",
    ],
  },
  {
    key: "enrollments",
    title: "Enrolamiento de tarjetas",
    read: security,
    write: security,
    create: true,
    description:
      "Iniciá el enrolamiento, acercá la tarjeta al lector y consultá su estado por ID. La API no ofrece una lista general de enrolamientos.",
    fields: [
      employee,
      device,
      {
        key: "credentialType",
        label: "Tipo de credencial",
        choices: ["FISICA", "DIGITAL"],
        default: "FISICA",
      },
      { key: "credentialName", label: "Nombre de credencial", max: 100 },
      {
        key: "expiresInMinutes",
        label: "Duración en minutos (1 a 1440)",
        type: "id",
        max: 1440,
      },
    ],
    filters: [
      { key: "id", label: "ID de enrolamiento", type: "id", required: true },
    ],
    columns: [
      "employeeName",
      "deviceCode",
      "credentialType",
      "credentialName",
      "status",
      "expiresAt",
      "credentialId",
      "completedAt",
    ],
  },
];
export function resource(key: string): Resource {
  const r = resources.find((r) => r.key === key);
  if (!r) throw new ApiError("Módulo desconocido.", 400);
  return r;
}
export function authorize(role: SystemRole, r: Resource, write = false) {
  if (!(write ? r.write : r.read).includes(role))
    throw new ApiError(
      "Tu perfil no permite esta operación.",
      403,
      "FORBIDDEN",
    );
}
export function accountAccessBody(
  draft: Row,
  role: unknown,
  employeeId: unknown,
): Row {
  const web = draft.webAccessEnabled,
    mobile = draft.mobileAccessEnabled;
  if (typeof web !== "boolean" || typeof mobile !== "boolean")
    throw new ApiError("Indicá los dos canales de acceso.", 400);
  if (!web && !mobile)
    throw new ApiError(
      "Debe quedar habilitado al menos un canal. Para bloquear la cuenta, usá Desactivar.",
      400,
    );
  if (role === "EMPLEADO" && web)
    throw new ApiError("El perfil EMPLEADO solo puede usar la app NFC.", 400);
  if (["ADMIN", "SEGURIDAD", "RRHH"].includes(String(role)) && !web)
    throw new ApiError(
      "El backend actual requiere acceso web para perfiles administrativos. No permite cambiar el perfil de una cuenta existente.",
      400,
    );
  if (!["ADMIN", "SEGURIDAD", "RRHH", "EMPLEADO"].includes(String(role)))
    throw new ApiError("Seleccioná un perfil válido.", 400);
  if (
    mobile &&
    (employeeId === null || employeeId === undefined || employeeId === "")
  )
    throw new ApiError(
      "La app NFC requiere un empleado vinculado a la cuenta.",
      400,
      "VALIDATION_ERROR",
      { employeeId: ["Vinculá un empleado antes de habilitar la app NFC."] },
    );
  if (mobile) id(employeeId);
  return { webAccessEnabled: web, mobileAccessEnabled: mobile };
}
export function inputError(field: Field, value: string): string {
  if (
    (field.type === "id" || field.format === "document") &&
    !/^[0-9]*$/.test(value)
  )
    return "Solo se permiten números, sin letras ni separadores.";
  if (field.format === "phone" && !/^\+?[0-9 ()-]*$/.test(value))
    return "Usá números; se admiten + al inicio, espacios, guiones y paréntesis.";
  if (field.format === "taxId" && !/^[0-9]*-?[0-9]*$/.test(value))
    return "Usá números y, si corresponde, un guion para el dígito verificador.";
  if (field.format === "personName" && !/^[\p{L}\p{M} .’'-]*$/u.test(value))
    return "Usá letras; se admiten tildes, espacios, puntos, apóstrofes y guiones.";
  return "";
}
export function fieldError(field: Field, raw: unknown): string {
  if (field.type === "boolean") return "";
  const value =
    field.type === "password" ? String(raw ?? "") : String(raw ?? "").trim();
  if (!value) return field.required ? "Campo obligatorio." : "";
  const characters = inputError(field, value);
  if (characters) return characters;
  try {
    if (field.type === "id") {
      const number = id(value);
      return field.max && number > field.max
        ? `Valor máximo: ${field.max}.`
        : "";
    }
    if (field.type === "datetime") {
      instant(value);
      return "";
    }
    if (field.type === "time")
      return /^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(value)
        ? ""
        : "Usá una hora válida en formato HH:mm.";
  } catch {
    return field.type === "id"
      ? "Ingresá un número entero positivo válido."
      : "Ingresá una fecha válida con zona horaria.";
  }
  if (field.min && value.length < field.min)
    return `Mínimo ${field.min} caracteres.`;
  if (field.max && value.length > field.max)
    return `Máximo ${field.max} caracteres.`;
  if (field.pattern && !new RegExp(field.pattern).test(value))
    return "El valor no cumple el formato requerido.";
  if (field.choices && !field.choices.includes(value))
    return "Seleccioná una opción válida.";
  if (field.format === "email" || field.key === "email") {
    const parts = value.split("@");
    const local = parts[0];
    const labels = (parts[1] ?? "").split(".");
    if (
      parts.length !== 2 ||
      local.length > 64 ||
      !/^[A-Za-z0-9!#$%&'*+/=?^_\x60{|}~.-]+$/.test(local) ||
      local.startsWith(".") ||
      local.endsWith(".") ||
      local.includes("..") ||
      labels.length < 2 ||
      labels.some(
        (label) =>
          !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label),
      ) ||
      !/^(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{2,59})$/.test(labels.at(-1)!)
    )
      return "Ingresá un correo completo, por ejemplo nombre@gmail.com o nombre@ficticio.net.";
  }
  if (field.format === "phone") {
    const compact = value.replace(/[ ()-]/g, "");
    let depth = 0;
    for (const char of value) {
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (depth < 0 || depth > 1) return "Revisá los paréntesis del teléfono.";
    }
    if (
      depth ||
      !/^\+?[0-9]{6,15}$/.test(compact) ||
      !/^\+?[0-9(].*[0-9]$/.test(value) ||
      /\(\s*\)/.test(value)
    )
      return "Ingresá un teléfono de 6 a 15 dígitos, con formato válido.";
  }
  if (field.format === "taxId" && !/^[0-9]+(?:-[0-9])?$/.test(value))
    return "Ingresá el RUC con números y, si corresponde, guion y un dígito verificador.";
  if (field.format === "personName" && !/\p{L}/u.test(value))
    return "Ingresá un nombre con letras.";
  return "";
}
export function bodyFor(
  fields: readonly Field[],
  draft: Row,
  edit = false,
): Row {
  const body: Row = {};
  for (const f of fields.filter((f) => !edit || !f.createOnly)) {
    const raw =
      draft[f.key] === undefined &&
      ["webAccessEnabled", "mobileAccessEnabled"].includes(f.key)
        ? f.default
        : draft[f.key];
    if (f.type === "boolean") {
      body[f.key] = raw === true;
      continue;
    }
    const value =
      f.type === "password" ? String(raw ?? "") : String(raw ?? "").trim();
    const invalid = fieldError(f, raw);
    if (invalid)
      throw new ApiError(`${f.label}: ${invalid}`, 400, "VALIDATION_ERROR", {
        [f.key]: [invalid],
      });
    if (!value) {
      body[f.key] = null;
      continue;
    }
    if (f.type === "id") {
      body[f.key] = id(value);
    } else if (f.type === "datetime") body[f.key] = instant(value);
    else if (f.type === "time") {
      body[f.key] = `${value.slice(0, 5)}:00`;
    } else body[f.key] = value;
  }
  if ("webAccessEnabled" in body && "role" in body)
    accountAccessBody(body, body.role, body.employeeId);
  if ("monday" in body) {
    if (
      ![
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].some((k) => body[k])
    )
      throw new ApiError("Seleccioná al menos un día.", 400);
    if ((body.startTime === null) !== (body.endTime === null))
      throw new ApiError("Completá ambas horas o dejá ambas vacías.", 400);
    if (body.startTime && body.startTime === body.endTime)
      throw new ApiError("Las horas deben ser distintas.", 400);
  }
  if (
    body.occurredAt &&
    Date.parse(String(body.occurredAt)) > Date.now() + 5 * 60 * 1000
  )
    throw new ApiError(
      "La marcación supera la tolerancia de cinco minutos del servidor.",
      400,
    );
  return body;
}
export function queryFor(r: Resource, draft: Row, page = 1): Row {
  const query: Row = r.paged ? { page, pageSize: 20 } : {};
  for (const f of r.filters) {
    const value = String(draft[f.key] ?? "").trim();
    if (!value) continue;
    if (f.type === "id") query[f.key] = id(value);
    else if (f.type === "datetime") query[f.key] = instant(value);
    else {
      if (f.choices && !f.choices.includes(value))
        throw new ApiError(`Filtro inválido: ${f.label}.`, 400);
      if (f.max && value.length > f.max)
        throw new ApiError(`Filtro demasiado largo: ${f.label}.`, 400);
      query[f.key] = value;
    }
  }
  if (query.from && query.to && String(query.from) > String(query.to))
    throw new ApiError("El inicio debe ser anterior al fin.", 400);
  return query;
}
export function pageOf(value: unknown, r: Resource, report = false): Page {
  if (!r.paged || report) {
    if (!Array.isArray(value))
      throw new ApiError(
        "Se esperaba una lista de la API.",
        0,
        "CONTRACT_ERROR",
      );
    return {
      items: value,
      page: 1,
      pageSize: value.length,
      totalItems: value.length,
      totalPages: value.length ? 1 : 0,
    };
  }
  const p = value as Page;
  if (
    !p ||
    !Array.isArray(p.items) ||
    !Number.isInteger(p.page) ||
    !Number.isInteger(p.pageSize) ||
    !Number.isInteger(p.totalItems) ||
    !Number.isInteger(p.totalPages) ||
    p.page < 1 ||
    p.pageSize < 1 ||
    p.totalItems < 0 ||
    p.totalPages < 0
  )
    throw new ApiError(
      "La paginación recibida no cumple el contrato.",
      0,
      "CONTRACT_ERROR",
    );
  return p;
}
// The current backend silently takes at most 50,000 rows for reports/CSV.
// A count preflight prevents known truncation, but is not an atomic snapshot.
export async function checkReportSize(
  client: ApiClient,
  r: Resource,
  query: Row,
) {
  const count = pageOf(
    await client.request(`/${r.key}`, {
      query: { ...query, page: 1, pageSize: 1 },
    }),
    r,
  );
  if (count.totalItems > 50000)
    throw new ApiError(
      "El rango contiene más de 50.000 registros. Reducí el rango para evitar un reporte incompleto.",
      400,
      "REPORT_TOO_LARGE",
    );
}
export const labels: Record<string, string> = {
  id: "ID",
  fullName: "Nombre completo",
  documentNumber: "Documento",
  firstName: "Nombres",
  lastName: "Apellidos",
  email: "Correo",
  phone: "Teléfono",
  isActive: "Activo",
  roles: "Roles físicos",
  employeeName: "Empleado",
  codigo_credencial: "Código",
  name: "Nombre",
  type: "Tipo",
  status: "Estado",
  expiresAt: "Vencimiento",
  revokedAt: "Revocación",
  revocationReason: "Motivo de revocación",
  issuedAt: "Emisión",
  code: "Código",
  description: "Descripción",
  isRestricted: "Restringida",
  areaName: "Área",
  areaCode: "Área",
  roleCode: "Rol físico",
  lastConnectionAt: "Último contacto",
  keyRotatedAt: "Rotación de clave",
  startTime: "Hora inicial",
  endTime: "Hora final",
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
  occurredAt: "Fecha y hora",
  result: "Resultado",
  reason: "Motivo",
  maskedCredential: "Credencial",
  deviceCode: "Dispositivo",
  source: "Origen",
  note: "Observación",
  username: "Usuario",
  role: "Perfil del sistema",
  webAccessEnabled: "Acceso web",
  mobileAccessEnabled: "App NFC",
  maskedCode: "Código enmascarado",
  employeeId: "ID de empleado",
  userId: "ID de cuenta",
  deviceId: "ID de dispositivo",
  lastLoginAt: "Último inicio",
  action: "Acción",
  entity: "Entidad",
  entityId: "ID de entidad",
  detail: "Detalle",
  ipAddress: "Dirección IP",
  credentialType: "Tipo de credencial",
  credentialName: "Credencial",
  credentialId: "ID de credencial",
  completedAt: "Completado",
  date: "Día (zona del servidor)",
  firstEntry: "Primera entrada",
  lastExit: "Última salida",
  totalMarks: "Marcaciones",
  incomplete: "Incompleta",
};
export function display(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (key === "codigo_credencial") return `••••${String(value).slice(-4)}`;
  if (Array.isArray(value))
    return (
      value
        .map((v) =>
          typeof v === "object" && v
            ? String(v.name ?? v.code ?? v.id)
            : String(v),
        )
        .join(", ") || "Sin roles"
    );
  if (typeof value === "object") return "—";
  // Show an explicit UTC offset; never silently reinterpret timestamps.
  if (
    /At$|^firstEntry$|^lastExit$/.test(key) &&
    typeof value === "string" &&
    /T/.test(value)
  ) {
    const normalized = /(Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`;
    return (
      new Date(normalized).toLocaleString("es-PY", {
        timeZone: "America/Asuncion",
      }) + " (Asunción)"
    );
  }
  return String(value);
}
