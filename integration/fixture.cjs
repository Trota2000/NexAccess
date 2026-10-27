// Synthetic local fixture for UI smoke tests. NOT a backend implementation.
// Binds only to loopback. No real people, device keys or production credentials.
const http = require("node:http");
const now = "2026-10-26T12:00:00Z";
const users = ["ADMIN", "SEGURIDAD", "RRHH"].map((role, i) => ({
  id: i + 1,
  username: `fixture.${role.toLowerCase()}`,
  role,
  isActive: true,
  employeeId: null,
}));
const data = {
  employees: Array.from({ length: 21 }, (_, i) => ({
    id: 12 + i,
    documentNumber: `TEST${1000 + i}`,
    firstName: i === 0 ? "Ana" : "Persona",
    lastName: i === 0 ? "Vera" : `Prueba ${i + 1}`,
    fullName: i === 0 ? "Ana Vera" : `Persona Prueba ${i + 1}`,
    email: null,
    phone: null,
    isActive: true,
    roles: [],
    createdAt: now,
    updatedAt: now,
  })),
  roles: [
    {
      id: 7,
      code: "PLANTA",
      name: "Personal de planta",
      description: "Rol físico de prueba",
      isActive: true,
      createdAt: now,
    },
  ],
  areas: [
    {
      id: 2,
      code: "PLANTA_A",
      name: "Planta A",
      description: "Área ficticia",
      isRestricted: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  devices: [
    {
      id: 4,
      code: "READER_4",
      name: "Portón de prueba",
      type: "ACCESO",
      areaId: 2,
      areaName: "Planta A",
      description: null,
      isActive: true,
      lastConnectionAt: null,
      keyRotatedAt: now,
      createdAt: now,
    },
  ],
  credentials: [
    {
      id: 5,
      employeeId: 12,
      employeeName: "Ana Vera",
      codigo_credencial: "04AABBCC",
      type: "FISICA",
      name: "Tarjeta de prueba",
      isActive: true,
      status: "ACTIVA",
      issuedAt: now,
      expiresAt: null,
      revokedAt: null,
      revocationReason: null,
    },
  ],
  "access-permissions": [
    {
      id: 6,
      roleId: 7,
      roleCode: "PLANTA",
      areaId: 2,
      areaCode: "PLANTA_A",
      startTime: "08:00:00",
      endTime: "17:00:00",
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
      isActive: true,
      createdAt: now,
    },
  ],
  "access-events": [
    {
      id: 8,
      employeeId: 12,
      employeeName: "Ana Vera",
      occurredAt: now,
      result: "RECHAZADO",
      reason: "NO_PERMISSION",
      credentialId: 5,
      maskedCredential: "****BBCC",
      deviceId: 4,
      deviceCode: "READER_4",
      areaId: 2,
      areaName: "Planta A",
    },
  ],
  attendance: [
    {
      id: 9,
      employeeId: 12,
      employeeName: "Ana Vera",
      type: "ENTRADA",
      occurredAt: now,
      source: "MANUAL",
      deviceId: null,
      deviceCode: null,
      note: "Dato ficticio",
    },
  ],
  audit: [
    {
      id: 10,
      occurredAt: now,
      userId: 1,
      deviceId: null,
      action: "CREATE",
      entity: "empleado",
      entityId: 12,
      detail: "Dato ficticio",
      ipAddress: "127.0.0.1",
    },
  ],
  users,
  enrollments: [],
};
const requests = [];
const server = http.createServer(async (req, res) => {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  const send = (body, status = 200) => {
    res.statusCode = status;
    setTimeout(
      () => res.end(status === 204 ? "" : JSON.stringify(body)),
      Number(process.env.FIXTURE_DELAY_MS || 0),
    );
  };
  const fail = (status, detail) =>
    send({ status, detail, code: `FIXTURE_${status}` }, status);
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.replace(/^\/api\/v1\//, "").split("/");
  const [key, idString, action, arg] = parts;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body;
  try {
    body = raw ? JSON.parse(raw) : undefined;
  } catch {
    return fail(400, "JSON inválido");
  }
  requests.push({
    path: url.pathname,
    method: req.method,
    query: Object.fromEntries(url.searchParams),
    body:
      key === "auth"
        ? undefined
        : body &&
          Object.fromEntries(
            Object.entries(body).filter(([k]) => !/password/i.test(k)),
          ),
  });
  if (key === "health") return send({ status: "ok" });
  if (key === "auth" && idString === "login") {
    const user = users.find((u) => u.username === body?.username);
    if (!user || body.password !== "LocalOnlyTesting!")
      return fail(401, "Cuenta ficticia incorrecta");
    return send({
      accessToken: `local-fixture-${user.role}`,
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      user,
    });
  }
  const role = req.headers.authorization?.replace("Bearer local-fixture-", "");
  const user = users.find((u) => u.role === role);
  if (!user) return fail(401, "Token ficticio requerido");
  if (key === "auth" && idString === "me") return send(user);
  if (key === "fixture-requests") return send(requests);
  const readable =
    role === "ADMIN" ||
    ["employees", "roles", "areas"].includes(key) ||
    (role === "SEGURIDAD" &&
      [
        "credentials",
        "devices",
        "access-permissions",
        "access-events",
        "enrollments",
      ].includes(key)) ||
    (role === "RRHH" && key === "attendance");
  if (!readable) return fail(403, "Sin permisos");
  if (req.method !== "GET") {
    const write =
      role === "ADMIN" ||
      (role === "SEGURIDAD" &&
        ([
          "roles",
          "areas",
          "credentials",
          "devices",
          "access-permissions",
          "enrollments",
        ].includes(key) ||
          (key === "employees" && action === "roles"))) ||
      (role === "RRHH" && ["employees", "attendance"].includes(key));
    if (!write) return fail(403, "Sin permiso de escritura");
  }
  const list = data[key];
  if (!list) return fail(404, "Módulo desconocido");
  const row =
    idString && /^\d+$/.test(idString)
      ? list.find((r) => r.id === Number(idString))
      : undefined;
  if (key === "devices" && row && action === "events")
    return send({
      items: data["access-events"],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
  const matches = (row) =>
    [...url.searchParams].every(([key, value]) => {
      if (["page", "pageSize"].includes(key)) return true;
      if (key === "from")
        return (
          !row.occurredAt || Date.parse(row.occurredAt) >= Date.parse(value)
        );
      if (key === "to")
        return (
          !row.occurredAt || Date.parse(row.occurredAt) <= Date.parse(value)
        );
      if (key === "search")
        return Object.values(row).some((v) =>
          String(v).toLowerCase().includes(value.toLowerCase()),
        );
      return String(row[key]) === value;
    });
  if (idString === "export") {
    const headers =
      key === "attendance"
        ? [
            "id",
            "empleado_id",
            "empleado",
            "tipo",
            "fecha_hora_local",
            "origen",
            "dispositivo",
            "observacion",
          ]
        : [
            "id",
            "fecha_hora_local",
            "resultado",
            "motivo",
            "empleado_id",
            "empleado",
            "dispositivo",
            "area",
            "credencial",
          ];
    const escape = (value) =>
      '"' + String(value ?? "").replace(/"/g, '""') + '"';
    const local = (value) =>
      new Date(Date.parse(value) - 3 * 3600000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    const rows = list
      .filter(matches)
      .map((r) =>
        key === "attendance"
          ? [
              r.id,
              r.employeeId,
              r.employeeName,
              r.type,
              local(r.occurredAt),
              r.source,
              r.deviceCode,
              r.note,
            ]
          : [
              r.id,
              local(r.occurredAt),
              r.result,
              r.reason,
              r.employeeId,
              r.employeeName,
              r.deviceCode,
              r.areaName,
              r.maskedCredential,
            ],
      );
    res.setHeader("content-type", "text/csv;charset=utf-8");
    res.end(
      "\uFEFF" +
        [headers, ...rows]
          .map((row) => row.map(escape).join(","))
          .join("\r\n") +
        "\r\n",
    );
    return;
  }
  if (key === "attendance" && idString === "report")
    return send([
      {
        employeeId: 12,
        employeeName: "Ana Vera",
        date: "2026-10-21",
        firstEntry: now,
        lastExit: null,
        totalMarks: 1,
        incomplete: true,
      },
    ]);
  if (idString && idString !== "export" && idString !== "report" && !row)
    return fail(404, "Registro no encontrado");
  if (row) {
    if (req.method === "GET") return send(action === "roles" ? row.roles : row);
    if (action === "status") {
      if (row.revokedAt) return fail(422, "Revocación definitiva");
      row.isActive = body.isActive;
      if (key === "credentials")
        row.status = row.isActive ? "ACTIVA" : "INACTIVA";
      return send(row);
    }
    if (action === "rotate-key")
      return send({ device: row, deviceKey: "LOCAL-FIXTURE-KEY-ONCE" });
    if (action === "revoke") {
      row.revokedAt = now;
      row.status = "REVOCADA";
      row.isActive = false;
      row.revocationReason = body.reason;
      return send(row);
    }
    if (action === "password") return send(undefined, 204);
    if (action === "cancel") {
      row.status = "CANCELADO";
      return send(row);
    }
    if (action === "roles") {
      if (req.method === "DELETE")
        row.roles = row.roles.filter((r) => r.id !== Number(arg));
      else {
        const physical = data.roles.find((r) => r.id === Number(arg));
        if (!physical) return fail(404, "Rol inexistente");
        if (!row.roles.some((r) => r.id === physical.id))
          row.roles.push(physical);
      }
      return send(row);
    }
    if (req.method === "PUT") {
      Object.assign(row, body);
      if (key === "employees")
        row.fullName = `${row.firstName} ${row.lastName}`;
      return send(row);
    }
    return fail(405, "Operación no implementada en fixture");
  }
  if (req.method === "POST") {
    if (
      key === "employees" &&
      list.some((r) => r.documentNumber === body.documentNumber)
    )
      return fail(409, "Documento duplicado");
    const created = {
      ...body,
      id: Math.max(100, ...list.map((r) => r.id)) + 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    if (key === "employees") {
      created.fullName = `${body.firstName} ${body.lastName}`;
      created.roles = [];
    }
    delete created.password;
    if (key === "credentials") {
      created.employeeName = data.employees.find(
        (e) => e.id === body.employeeId,
      )?.fullName;
      created.status = "ACTIVA";
      created.issuedAt = now;
      created.revokedAt = null;
    }
    if (key === "attendance") {
      created.employeeName = data.employees.find(
        (e) => e.id === body.employeeId,
      )?.fullName;
      created.source = "MANUAL";
    }
    if (key === "enrollments") {
      created.status = "PENDIENTE";
      created.expiresAt = new Date(Date.now() + 60000).toISOString();
    }
    list.unshift(created);
    return send(
      key === "devices"
        ? { device: created, deviceKey: "LOCAL-FIXTURE-KEY-ONCE" }
        : created,
      201,
    );
  }
  let filtered = list.filter((row) =>
    [...url.searchParams].every(([key, value]) => {
      if (["page", "pageSize"].includes(key)) return true;
      if (key === "from")
        return (
          !row.occurredAt || Date.parse(row.occurredAt) >= Date.parse(value)
        );
      if (key === "to")
        return (
          !row.occurredAt || Date.parse(row.occurredAt) <= Date.parse(value)
        );
      if (key === "search")
        return Object.values(row).some((v) =>
          String(v).toLowerCase().includes(value.toLowerCase()),
        );
      return String(row[key]) === value;
    }),
  );
  if (["roles", "users"].includes(key)) return send(filtered);
  const page = Number(url.searchParams.get("page") || 1),
    pageSize = Number(url.searchParams.get("pageSize") || 20);
  send({
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    totalItems: filtered.length,
    totalPages: Math.ceil(filtered.length / pageSize),
  });
});
server.listen(Number(process.env.FIXTURE_PORT || 9060), "127.0.0.1", () =>
  console.log(
    "Fixture sintética: http://127.0.0.1:9060 · fixture.admin / fixture.seguridad / fixture.rrhh · contraseña LocalOnlyTesting!",
  ),
);
