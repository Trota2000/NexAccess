const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("../../web/node_modules/typescript");
require.extensions[".ts"] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
const { ApiClient } = require("../source/client.ts");
const { operations, resolveOperation } = require("../source/contract.ts");
const {
  relatedFlows,
  writeReceipt,
  formErrorMap,
  loadMetrics,
} = require("../source/workflows.ts");
const originalSnapshot = require("../openapi-routes.json");
// Additional supplied Empresa API v1 documentation, without altering the original OpenAPI snapshot.
const snapshot = [
  ...originalSnapshot,
  ...[
    ["GET", "/empresa"],
    ["PUT", "/empresa"],
    ["POST", "/empresa/logo"],
    ["GET", "/empresa/logo"],
    ["DELETE", "/empresa/logo"],
    ["PUT", "/users/{id}/access"],
    ["POST", "/credentials/digital/{id}"],
  ].map(([method, path]) => ({ method, path, security: "bearer" })),
];
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
async function session(role = "ADMIN", handler = () => json({ id: 12 })) {
  const calls = [];
  const client = new ApiClient(
    "https://example.test/api/v1",
    async (url, init) => {
      const path = new URL(url).pathname.replace("/api/v1", "");
      calls.push({ path, init, url });
      if (path === "/auth/login")
        return json({
          accessToken: "SYNTHETIC-ONLY",
          tokenType: "Bearer",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        });
      if (path === "/auth/me")
        return json({
          id: 1,
          username: "fixture.operator",
          role,
          isActive: true,
          employeeId: null,
        });
      return handler(path, init, url);
    },
  );
  await client.login("fixture.operator", "LocalOnlyTesting!");
  return { client, calls };
}
test("catalog covers every operation/security scheme in the supplied OpenAPI, without invented routes", () => {
  const signature = ({ method, path, security }) =>
    `${method} ${path} ${security}`;
  assert.equal(originalSnapshot.length, 53);
  assert.equal(snapshot.length, 60);
  assert.deepEqual(
    operations.map(signature).sort(),
    snapshot.map(signature).sort(),
  );
  assert.equal(new Set(operations.map((o) => o.id)).size, operations.length);
  for (const op of snapshot) {
    const path = op.path
      .replace(/\{id\}|\{roleId\}/g, "12")
      .replace("{codigo}", "reader_1");
    assert.equal(resolveOperation(path, op.method)?.security, op.security);
  }
});
test("all protected operator operations send the login bearer header, never a device key or login password", async () => {
  const { client, calls } = await session();
  for (const op of operations.filter((o) => o.security === "bearer")) {
    await client.request(op.path.replace(/\{id\}|\{roleId\}/g, "12"), {
      method: op.method,
      ...(op.bodyKeys ? { body: {} } : {}),
      ...(op.id === "empresa.logo.upload" ? { formData: new FormData() } : {}),
    });
    const { url, init } = calls.at(-1);
    assert.equal(init.headers.Authorization, "Bearer SYNTHETIC-ONLY", op.id);
    assert.equal(init.headers["X-Device-Key"], undefined, op.id);
    assert.ok(!url.includes("SYNTHETIC-ONLY"));
    assert.ok(!String(init.body).includes("LocalOnlyTesting!"));
  }
});
test("role and device restrictions stop requests before transport; undocumented updates cannot be sent", async () => {
  for (const role of ["SEGURIDAD", "RRHH"]) {
    const { client, calls } = await session(role);
    for (const op of operations.filter(
      (o) => o.security === "bearer" && !o.roles.includes(role),
    )) {
      const count = calls.length;
      await assert.rejects(
        client.request(op.path.replace(/\{id\}|\{roleId\}/g, "12"), {
          method: op.method,
        }),
        (e) => e.code === "FORBIDDEN",
      );
      assert.equal(calls.length, count);
    }
  }
  const { client, calls } = await session();
  const count = calls.length;
  for (const op of operations.filter((o) => o.security === "device"))
    await assert.rejects(
      client.request(
        op.path.replace("{id}", "12").replace("{codigo}", "reader1"),
        { method: op.method },
      ),
      (e) => e.code === "DEVICE_ONLY",
    );
  await assert.rejects(
    client.request("/credentials/12", {
      method: "PUT",
      body: { employeeId: 14 },
    }),
    (e) => e.code === "UNSUPPORTED_OPERATION",
  );
  await assert.rejects(
    client.request("/employees", {
      method: "POST",
      body: { documentNumber: "123456", department: "inexistente" },
    }),
    (e) => e.code === "INVALID_BODY",
  );
  await assert.rejects(
    client.request("/users", { anonymous: true }),
    (e) => e.code === "UNAUTHORIZED",
  );
  assert.equal(calls.length, count);
});
test("saved receipts accept both device response shapes, drop secrets, and reject ambiguous success IDs", () => {
  assert.deepEqual(
    writeReceipt("devices", {
      device: { id: 4, name: "Portón" },
      deviceKey: "SECRET",
    }),
    { id: 4, name: "Portón" },
  );
  assert.deepEqual(writeReceipt("devices", { id: 4, name: "Portón" }), {
    id: 4,
    name: "Portón",
  });
  assert.deepEqual(
    writeReceipt("users", {
      id: 8,
      username: "test",
      password: "SECRET",
      accessToken: "SECRET",
    }),
    { id: 8, username: "test" },
  );
  for (const response of [undefined, {}, { id: 0 }, { id: "bad" }])
    assert.throws(
      () => writeReceipt("employees", response),
      (e) => e.code === "WRITE_RECEIPT_INVALID",
    );
});
test("related flows preserve employee/area/role/device context and system role boundaries", () => {
  const employee = { id: 12, fullName: "Ana Vera" };
  const hr = relatedFlows("employees", employee, "RRHH");
  assert.deepEqual(
    hr.map((f) => f.key),
    ["attendance"],
  );
  assert.equal(hr[0].query.employeeId, 12);
  const admin = relatedFlows("employees", employee, "ADMIN");
  assert.equal(admin.find((f) => f.key === "enrollments").seed.employeeId, 12);
  assert.equal(admin.find((f) => f.key === "users").seed.employeeId, 12);
  assert.equal(relatedFlows("roles", { id: 7 }, "ADMIN")[0].query.roleId, 7);
  assert.ok(
    relatedFlows("areas", { id: 2 }, "ADMIN").every(
      (f) => f.query.areaId === 2,
    ),
  );
  assert.equal(
    relatedFlows("devices", { id: 4 }, "SEGURIDAD")[0].deviceScope,
    4,
  );
  assert.deepEqual(
    formErrorMap(
      {
        "$.Email": ["Correo ya registrado"],
        CredentialCode: ["Duplicado"],
        other: ["Otro"],
      },
      "credentials",
    ),
    { codigo_credencial: "Duplicado" },
  );
  assert.deepEqual(formErrorMap({ Email: ["Correo inválido"] }, "employees"), {
    email: "Correo inválido",
  });
});
test("dashboard uses server totals and explicit periods, and does not convert a failed count to zero", async () => {
  const { client, calls } = await session("ADMIN", (path) =>
    path === "/devices"
      ? json({ detail: "Servicio temporalmente no disponible" }, 503)
      : json({
          items: [],
          page: 1,
          pageSize: 1,
          totalItems: 234,
          totalPages: 234,
        }),
  );
  const metrics = await loadMetrics(
    client,
    "ADMIN",
    new Date("2026-10-21T12:00:00Z"),
  );
  assert.equal(metrics.find((m) => m.key === "employees").value, 234);
  assert.equal(metrics.find((m) => m.key === "devices").value, undefined);
  assert.ok(metrics.find((m) => m.key === "devices").error);
  const event = new URL(calls.find((c) => c.path === "/access-events").url);
  assert.equal(event.searchParams.get("from"), "2026-10-20T12:00:00.000Z");
  assert.equal(event.searchParams.get("pageSize"), "1");
});
