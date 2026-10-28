// Operator API catalog. Routes from the user's OpenAPI; roles/body keys verified
// against sof2702/NexAccess@81511f3 because the manual schemas are incomplete.
type Role = "ADMIN" | "SEGURIDAD" | "RRHH";
export interface Operation {
  id: string;
  method: string;
  path: string;
  roles: Role[];
  security: "public" | "bearer" | "device";
  bodyKeys?: string[];
}
const all: Role[] = ["ADMIN", "SEGURIDAD", "RRHH"];
const security: Role[] = ["ADMIN", "SEGURIDAD"];
const hr: Role[] = ["ADMIN", "RRHH"];
const admin: Role[] = ["ADMIN"];
const rows: Operation[] = [];
function add(
  id: string,
  method: string,
  path: string,
  roles: Role[],
  bodyKeys?: string[],
  auth: Operation["security"] = "bearer",
) {
  rows.push({ id, method, path, roles, bodyKeys, security: auth });
}
add("health", "GET", "/health", all, undefined, "public");
add("login", "POST", "/auth/login", all, ["username", "password"], "public");
add("me", "GET", "/auth/me", all);
// Empresa API v1: one organization per installation.
add("empresa.get", "GET", "/empresa", all);
add("empresa.save", "PUT", "/empresa", admin, [
  "razonSocial",
  "nombreFantasia",
  "ruc",
  "direccion",
  "telefono",
  "email",
]);
add("empresa.logo.upload", "POST", "/empresa/logo", admin);
add("empresa.logo.get", "GET", "/empresa/logo", all);
add("empresa.logo.delete", "DELETE", "/empresa/logo", admin);
const employeeFields = [
  "documentNumber",
  "firstName",
  "lastName",
  "email",
  "phone",
];
const areaFields = ["code", "name", "description", "isRestricted", "isActive"];
const roleFields = ["code", "name", "description", "isActive"];
const permissionFields = [
  "roleId",
  "areaId",
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
];
const deviceFields = ["name", "type", "areaId", "description"];
for (const [key, read, write, fields] of [
  ["employees", all, hr, employeeFields],
  ["areas", all, security, areaFields],
  ["roles", all, security, roleFields],
  ["access-permissions", security, security, permissionFields],
  ["devices", security, security, deviceFields],
] as [string, Role[], Role[], string[]][]) {
  add(`${key}.list`, "GET", `/${key}`, read);
  add(`${key}.get`, "GET", `/${key}/{id}`, read);
  add(
    `${key}.create`,
    "POST",
    `/${key}`,
    write,
    key === "devices" ? ["code", ...fields] : fields,
  );
  add(`${key}.update`, "PUT", `/${key}/{id}`, write, fields);
  if (["employees", "devices", "access-permissions"].includes(key))
    add(`${key}.status`, "PATCH", `/${key}/{id}/status`, write, ["isActive"]);
}
add("employees.roles", "GET", "/employees/{id}/roles", all);
add("employees.assignRole", "POST", "/employees/{id}/roles/{roleId}", security);
add(
  "employees.removeRole",
  "DELETE",
  "/employees/{id}/roles/{roleId}",
  security,
);
add("credentials.list", "GET", "/credentials", security);
add("credentials.get", "GET", "/credentials/{id}", security);
add("credentials.create", "POST", "/credentials", security, [
  "employeeId",
  "codigo_credencial",
  "type",
  "name",
  "expiresAt",
]);
add("credentials.status", "PATCH", "/credentials/{id}/status", security, [
  "isActive",
]);
add("credentials.revoke", "POST", "/credentials/{id}/revoke", security, [
  "reason",
]);
add("devices.rotateKey", "POST", "/devices/{id}/rotate-key", security);
add("devices.events", "GET", "/devices/{id}/events", security);
add("enrollments.create", "POST", "/enrollments", security, [
  "employeeId",
  "deviceId",
  "credentialType",
  "credentialName",
  "expiresInMinutes",
]);
add("enrollments.get", "GET", "/enrollments/{id}", security);
add("enrollments.cancel", "POST", "/enrollments/{id}/cancel", security);
add("access-events.list", "GET", "/access-events", security);
add("access-events.export", "GET", "/access-events/export", security);
add("attendance.list", "GET", "/attendance", hr);
add("attendance.create", "POST", "/attendance", hr, [
  "employeeId",
  "type",
  "occurredAt",
  "note",
]);
add("attendance.report", "GET", "/attendance/report", hr);
add("attendance.export", "GET", "/attendance/export", hr);
add("users.list", "GET", "/users", admin);
add("users.create", "POST", "/users", admin, [
  "username",
  "password",
  "role",
  "employeeId",
]);
add("users.status", "PATCH", "/users/{id}/status", admin, ["isActive"]);
add("users.password", "PUT", "/users/{id}/password", admin, ["newPassword"]);
add("audit.list", "GET", "/audit", admin);
// Documented for coverage, intentionally unavailable to the Bearer UI.
add(
  "device.commands",
  "GET",
  "/devices/{codigo}/commands",
  [],
  undefined,
  "device",
);
add(
  "device.card",
  "POST",
  "/enrollments/{id}/card",
  [],
  ["codigo_credencial"],
  "device",
);
add("device.verify", "POST", "/access/verify", [], undefined, "device");
export const operations: readonly Operation[] = rows;
export function resolveOperation(
  path: string,
  method: string,
): Operation | undefined {
  return operations.find(
    (op) =>
      op.method === method &&
      new RegExp(
        "^" +
          op.path
            .replace(/\{codigo\}/g, "[A-Za-z0-9_-]+")
            .replace(/\{(?:id|roleId)\}/g, "[0-9]+") +
          "$",
      ).test(path),
  );
}
