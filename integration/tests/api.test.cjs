const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const ts = require("../../web/node_modules/typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const {
  ApiClient,
  ApiError,
  id,
  instant,
  queryString,
  normalizeBaseUrl,
} = require("../source/client.ts");
const {
  resources,
  resource,
  authorize,
  bodyFor,
  queryFor,
  pageOf,
  display,
  checkReportSize,
} = require("../source/resources.ts");
test("report preflight rejects known truncation and preserves filters", async () => {
  const { client, requests } = await loggedIn(() =>
    json({
      items: [],
      page: 1,
      pageSize: 1,
      totalItems: 50001,
      totalPages: 50001,
    }),
  );
  await assert.rejects(
    checkReportSize(client, resource("attendance"), { employeeId: 7 }),
    (e) => e.code === "REPORT_TOO_LARGE",
  );
  assert.ok(requests.at(-1).url.includes("employeeId=7"));
  assert.ok(requests.at(-1).url.includes("pageSize=1"));
});
const user = (role) => ({
  id: 1,
  username: `test.${role.toLowerCase()}`,
  role,
  isActive: true,
  employeeId: null,
});
const json = (data, status = 200, type = "application/json") =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": type },
  });
const loginResponse = () => ({
  accessToken: "test-token",
  tokenType: "Bearer",
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  user: user("ADMIN"),
});
async function loggedIn(after, role = "ADMIN") {
  const requests = [];
  const client = new ApiClient(
    "https://example.test/api/v1",
    async (url, init) => {
      requests.push({ url, init });
      if (url.endsWith("/auth/login")) return json(loginResponse());
      if (url.endsWith("/auth/me")) return json(user(role));
      return after(url, init);
    },
  );
  await client.login("test.admin", "OnlyForLocalTests!");
  return { client, requests };
}
test("accepts HTTPS or fixed same-origin prefix, rejects credential and insecure remote URLs", () => {
  assert.equal(normalizeBaseUrl("/api/v1/"), "/api/v1");
  for (const u of [
    "http://remote.test/api/v1",
    "https://user:pass@example.test/api/v1",
    "https://example.test/api/v1?token=123",
    "https://example.test/api/v2",
    "//example.test/api/v1",
  ])
    assert.throws(() => normalizeBaseUrl(u));
});
test("IDs must be exact positive safe integers", () => {
  assert.equal(id("123"), 123);
  for (const n of ["1e2", "1.2", "", 0, -1, "9007199254740993", "test"])
    assert.throws(() => id(n));
});
test("datetime requires explicit timezone, rejects impossible calendar dates", () => {
  assert.equal(
    instant("2026-10-21T09:00:00-03:00"),
    "2026-10-21T12:00:00.000Z",
  );
  for (const d of [
    "2026-10-21T09:00:00",
    "2026-02-30T09:00:00Z",
    "2026-13-01T09:00:00Z",
  ])
    assert.throws(() => instant(d));
});
test("query preserves false and zero and escapes text", () =>
  assert.equal(
    queryString({ isActive: false, q: "a&b", unused: "", count: 0 }),
    "isActive=false&q=a%26b&count=0",
  ));
test("fetch transport is not invoked with ApiClient as its receiver (browser Illegal invocation regression)", async () => {
  const client = new ApiClient("https://example.test/api/v1", function () {
    "use strict";
    assert.equal(this, undefined);
    return Promise.resolve(json({ status: "ok" }));
  });
  assert.deepEqual(await client.request("/health", { anonymous: true }), {
    status: "ok",
  });
});
test("system roles cannot gain permissions from a physical role", () => {
  assert.throws(() => authorize("RRHH", resource("credentials")));
  assert.throws(() => authorize("SEGURIDAD", resource("employees"), true));
  assert.throws(() => authorize("RRHH", resource("roles"), true));
  authorize("SEGURIDAD", resource("roles"), true);
  authorize("ADMIN", resource("users"), true);
});
test("employee DTO strips UI-only fields and rejects missing document", () => {
  const fields = resource("employees").fields;
  assert.deepEqual(
    bodyFor(fields, {
      firstName: " Ana ",
      lastName: " Vera ",
      documentNumber: "12345",
      department: "Inventado",
      isActive: false,
    }),
    {
      documentNumber: "12345",
      firstName: "Ana",
      lastName: "Vera",
      email: null,
      phone: null,
    },
  );
  assert.throws(() => bodyFor(fields, { firstName: "Ana", lastName: "Vera" }));
});
test("credential payload uses codigo_credencial exactly and numeric employeeId", () => {
  const body = bodyFor(resource("credentials").fields, {
    employeeId: "7",
    codigo_credencial: "04AABBCC",
    type: "FISICA",
  });
  assert.equal(body.codigo_credencial, "04AABBCC");
  assert.equal(body.employeeId, 7);
  assert.ok(!("credentialCode" in body));
});
test("device update does not send immutable code", () => {
  const body = bodyFor(
    resource("devices").fields,
    { code: "READER_1", name: "Portón", type: "ACCESO", areaId: "4" },
    true,
  );
  assert.ok(!("code" in body));
  assert.equal(body.areaId, 4);
});
test("permissions support overnight schedules and unrestricted paired nulls", () => {
  const fields = resource("access-permissions").fields;
  const draft = {
    roleId: 1,
    areaId: 2,
    monday: true,
    isActive: true,
    startTime: "22:00",
    endTime: "06:00",
  };
  const body = bodyFor(fields, draft);
  assert.equal(body.startTime, "22:00:00");
  assert.equal(body.endTime, "06:00:00");
  assert.ok(!("employeeId" in body));
  assert.equal(
    bodyFor(fields, { ...draft, startTime: "", endTime: "" }).startTime,
    null,
  );
  assert.throws(() => bodyFor(fields, { ...draft, endTime: "" }));
  assert.throws(() => bodyFor(fields, { ...draft, endTime: "22:00" }));
  assert.throws(() => bodyFor(fields, { ...draft, monday: false }));
});
test("attendance manual reason and server enum required; no fabricated correction ID", () => {
  const fields = resource("attendance").fields;
  const body = bodyFor(fields, {
    employeeId: 1,
    type: "ENTRADA",
    occurredAt: "2026-10-01T09:00:00-03:00",
    note: " Corrección autorizada ",
    source: "MANUAL",
    id: 99,
  });
  assert.equal(body.note, "Corrección autorizada");
  assert.ok(!("id" in body));
  assert.ok(!("source" in body));
  assert.throws(() => bodyFor(fields, { ...body, note: "x" }));
  assert.throws(() => bodyFor(fields, { ...body, type: "ENTRY" }));
});
test("filters match API names, exclude unsupported UI keys, and reject reversed ranges", () => {
  assert.deepEqual(
    queryFor(
      resource("access-events"),
      { employeeId: "7", result: "RECHAZADO", name: "unused" },
      2,
    ),
    { page: 2, pageSize: 20, employeeId: 7, result: "RECHAZADO" },
  );
  assert.throws(() =>
    queryFor(resource("attendance"), {
      from: "2026-10-02T00:00:00Z",
      to: "2026-10-01T00:00:00Z",
    }),
  );
});
test("paged and array endpoints remain distinct", () => {
  assert.equal(pageOf([{ id: 1 }], resource("roles")).totalItems, 1);
  assert.throws(() => pageOf([{ id: 1 }], resource("employees")));
  assert.throws(() =>
    pageOf(
      { items: [], page: 1, pageSize: 20, totalItems: -1, totalPages: 0 },
      resource("employees"),
    ),
  );
});
test("credential display is masked and isActive is not interpreted as online", () => {
  assert.equal(display("codigo_credencial", "ABCDEF12"), "••••EF12");
  assert.equal(display("isActive", true), "Sí");
  assert.equal(display("lastConnectionAt", null), "—");
});
test("login verifies /me and credentials are absent from subsequent requests", async () => {
  const { client, requests } = await loggedIn(
    () => json({ status: "ok" }),
    "RRHH",
  );
  const session = await client.login(" test.rrhh ", "OnlyForLocalTests!");
  assert.equal(session.user.role, "RRHH");
  assert.ok(!("accessToken" in session));
  await client.request("/employees");
  const request = requests.at(-1);
  assert.equal(request.init.headers.Authorization, "Bearer test-token");
  assert.equal(request.init.body, undefined);
  assert.equal(request.init.credentials, "omit");
  const login = requests.find((r) => r.url.endsWith("/auth/login"));
  assert.equal(login.init.headers.Authorization, undefined);
});
test("login rejects a fabricated EMPLEADO account role", async () => {
  const client = new ApiClient("https://example.test/api/v1", async (url) =>
    json(url.endsWith("/login") ? loginResponse() : user("EMPLEADO")),
  );
  await assert.rejects(
    client.login("empleado", "test"),
    (e) => e.code === "INVALID_ROLE",
  );
  await assert.rejects(client.request("/employees"), (e) => e.status === 401);
});
test("401 clears session and notifies once; no retry of a write", async () => {
  let count = 0,
    expired = 0;
  const { client } = await loggedIn(() => {
    count++;
    return json({ detail: "Token invalidado", code: "UNAUTHORIZED" }, 401);
  });
  client.onExpired = () => expired++;
  await assert.rejects(
    client.request("/employees", { method: "POST", body: {} }),
    (e) => e.status === 401,
  );
  assert.equal(count, 1);
  assert.equal(expired, 1);
});
test("409 and field errors surface as server conflicts without optimistic success", async () => {
  const { client } = await loggedIn(() =>
    json(
      {
        detail: "Documento duplicado",
        code: "EMPLOYEE_DOCUMENT_DUPLICATE",
        errors: { documentNumber: ["Duplicado"] },
      },
      409,
    ),
  );
  await assert.rejects(
    client.request("/employees", {
      method: "POST",
      body: { documentNumber: "123" },
    }),
    (e) => e.status === 409 && e.errors.documentNumber[0] === "Duplicado",
  );
});
test("CSV export uses authenticated fetch, preserves filters, never puts tokens in URL", async () => {
  const { client, requests } = await loggedIn(
    () =>
      new Response("id;empleado\n7;Ana", {
        headers: { "content-type": "text/csv" },
      }),
  );
  const csv = await client.request("/attendance/export", {
    csv: true,
    query: {
      from: "2026-10-01T00:00:00Z",
      to: "2026-10-02T00:00:00Z",
      employeeId: 7,
    },
  });
  assert.ok(csv.includes("Ana"));
  assert.ok(requests.at(-1).url.includes("employeeId=7"));
  assert.ok(!requests.at(-1).url.includes("test-token"));
});
test("HTML and unsafe integer responses are rejected", async () => {
  const { client } = await loggedIn(
    () =>
      new Response("<html>error</html>", {
        headers: { "content-type": "text/html" },
      }),
  );
  await assert.rejects(
    client.request("/employees"),
    (e) => e.code === "API_ROUTE_NOT_CONFIGURED",
  );
  const c = await loggedIn(
    () =>
      new Response('{"id":9007199254740993}', {
        headers: { "content-type": "application/json" },
      }),
  );
  await assert.rejects(
    c.client.request("/employees/1"),
    (e) => e.code === "UNSAFE_NUMBER",
  );
});
test("a late response after logout is discarded even if transport ignores AbortSignal", async () => {
  let resolve;
  const { client } = await loggedIn(() => new Promise((r) => (resolve = r)));
  const request = client.request("/employees");
  client.logout();
  resolve(
    json({
      items: [{ id: 99 }],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    }),
  );
  await assert.rejects(request, (e) => e.code === "STALE_REQUEST");
});
test("requests cannot escape the configured API origin", async () => {
  const { client } = await loggedIn(() => json({}));
  for (const path of [
    "https://evil.test/steal",
    "//evil.test",
    "/../users",
    "/users?token=secret",
  ])
    await assert.rejects(
      client.request(path),
      (e) => e.code === "INVALID_PATH",
    );
});
test("timeout aborts request and never repeats a non-idempotent operation", async () => {
  let count = 0;
  const c = new ApiClient(
    "https://example.test/api/v1",
    async (url, init) => {
      if (url.endsWith("/auth/login")) return json(loginResponse());
      if (url.endsWith("/auth/me")) return json(user("ADMIN"));
      count++;
      return new Promise((_, reject) =>
        init.signal.addEventListener("abort", () =>
          reject(new Error("AbortError")),
        ),
      );
    },
    10,
  );
  await c.login("test.admin", "OnlyForLocalTests!");
  await assert.rejects(
    c.request("/attendance", { method: "POST", body: {} }),
    (e) => e.code === "TIMEOUT",
  );
  assert.equal(count, 1);
});
test("HTTP smoke: login, me, paginated employees, create conflict and filtered CSV against local contract fixture", async (t) => {
  const requests = [];
  let created = false;
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const url = new URL(req.url, "http://localhost");
    requests.push({
      path: url.pathname,
      query: url.searchParams,
      body: raw ? JSON.parse(raw) : undefined,
      auth: req.headers.authorization,
    });
    res.setHeader("content-type", "application/json");
    const send = (v, status = 200) => {
      res.statusCode = status;
      res.end(JSON.stringify(v));
    };
    if (url.pathname.endsWith("/auth/login")) {
      assert.deepEqual(JSON.parse(raw), {
        username: "test.admin",
        password: "OnlyForLocalTests!",
      });
      return send(loginResponse());
    }
    if (req.headers.authorization !== "Bearer test-token")
      return send({ detail: "No autorizado" }, 401);
    if (url.pathname.endsWith("/auth/me")) return send(user("ADMIN"));
    if (url.pathname.endsWith("/employees") && req.method === "POST") {
      if (created)
        return send(
          {
            detail: "Documento duplicado",
            code: "EMPLOYEE_DOCUMENT_DUPLICATE",
          },
          409,
        );
      created = true;
      return send(
        { ...JSON.parse(raw), id: 17, isActive: true, roles: [] },
        201,
      );
    }
    if (url.pathname.endsWith("/employees"))
      return send({
        items: [
          {
            id: 17,
            documentNumber: "123456",
            firstName: "Ana",
            lastName: "Vera",
            fullName: "Ana Vera",
            isActive: true,
            roles: [],
          },
        ],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      });
    if (url.pathname.endsWith("/access-events/export")) {
      res.setHeader("content-type", "text/csv");
      res.end("id;resultado\n1;RECHAZADO");
      return;
    }
    send({ detail: "No existe" }, 404);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const c = new ApiClient(`http://127.0.0.1:${server.address().port}/api/v1`);
  await c.login("test.admin", "OnlyForLocalTests!");
  const body = bodyFor(resource("employees").fields, {
    documentNumber: "123456",
    firstName: "Ana",
    lastName: "Vera",
  });
  assert.equal(
    (await c.request("/employees", { method: "POST", body })).id,
    17,
  );
  await assert.rejects(
    c.request("/employees", { method: "POST", body }),
    (e) => e.status === 409,
  );
  const page = pageOf(
    await c.request("/employees", {
      query: queryFor(resource("employees"), { search: "Ana" }),
    }),
    resource("employees"),
  );
  assert.equal(page.items[0].id, 17);
  const csv = await c.request("/access-events/export", {
    csv: true,
    query: queryFor(resource("access-events"), {
      result: "RECHAZADO",
      from: "2026-10-01T00:00:00Z",
      to: "2026-10-02T00:00:00Z",
    }),
  });
  assert.ok(csv.includes("RECHAZADO"));
  assert.equal(requests.at(-1).query.get("result"), "RECHAZADO");
});
