const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("../../web/node_modules/typescript");
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    f,
  );
const {
  reportOptions,
  reportBody,
  enumCode,
} = require("../source/reportContract.ts");
const { ApiClient } = require("../source/client.ts");
const {
  bodyFor,
  digitalCredentialFields,
  resource,
} = require("../source/resources.ts");
const { calendarInstant } = require("../source/dates.ts");
const uuid = "f534312a-12cc-47dc-9d53-34ef801c99d7";
const fixture = {
  reports: [
    {
      type: "Attendance",
      name: "Asistencia",
      formats: ["Json", "Pdf"],
      filters: [
        "from",
        "to",
        "employeeIds",
        "deviceIds",
        "attendanceTypes",
        "attendanceSources",
      ],
      groupBy: ["Employee", "Day", "Week", "Month", "Device"],
      columns: ["occurredAt", "employeeName", "note"],
    },
    {
      type: "AccessEvents",
      name: "Accesos",
      formats: ["Json", "Pdf"],
      filters: [
        "from",
        "to",
        "employeeIds",
        "areaIds",
        "deviceIds",
        "accessResults",
      ],
      groupBy: ["Employee", "Day", "Area", "Device"],
      columns: ["occurredAt", "result", "areaName"],
    },
  ],
  filterValues: {
    attendanceTypes: ["Entrada", "Salida"],
    attendanceSources: ["Dispositivo", "Manual"],
    accessResults: ["Autorizado", "Rechazado"],
  },
  maxReportDays: 366,
  supportsSummary: true,
  supportsDetails: true,
};
const draft = {
  format: "PDF",
  from: calendarInstant("2026-10-01", "from"),
  to: calendarInstant("2026-10-29", "to"),
  employeeIds: [12, 12],
  deviceIds: [4],
  attendanceSources: ["MANUAL"],
  groupBy: ["EMPLOYEE", "DAY"],
  columns: ["employeeName"],
  includeSummary: true,
  includeDetails: true,
};
test("options normalize actual PascalCase strings and restrict report types to the operator role", () => {
  assert.equal(enumCode("AccessEvents"), "ACCESS_EVENTS");
  assert.deepEqual(
    reportOptions(fixture, "ADMIN").reports.map((r) => r.type),
    ["ATTENDANCE", "ACCESS_EVENTS"],
  );
  assert.deepEqual(
    reportOptions(fixture, "RRHH").reports.map((r) => r.type),
    ["ATTENDANCE"],
  );
  assert.deepEqual(
    reportOptions(fixture, "SEGURIDAD").reports.map((r) => r.type),
    ["ACCESS_EVENTS"],
  );
  assert.deepEqual(
    reportOptions(fixture, "ADMIN").filterValues.attendanceSources,
    ["DISPOSITIVO", "MANUAL"],
  );
  assert.throws(() =>
    reportOptions({ ...fixture, maxReportDays: undefined }, "ADMIN"),
  );
});
test("report DTO retains calendar boundaries, filters and enum names without forwarding UI fields", () => {
  const options = reportOptions(fixture, "ADMIN");
  const body = reportBody(options, options.reports[0], {
    ...draft,
    unexpected: "not sent",
  });
  assert.deepEqual(body, {
    type: "ATTENDANCE",
    format: "PDF",
    from: "2026-10-01T03:00:00.000Z",
    to: "2026-10-30T02:59:59.999Z",
    employeeIds: [12],
    areaIds: [],
    deviceIds: [4],
    attendanceTypes: [],
    attendanceSources: ["MANUAL"],
    accessResults: [],
    groupBy: ["EMPLOYEE", "DAY"],
    columns: ["employeeName"],
    includeSummary: true,
    includeDetails: true,
  });
  for (const invalid of [
    { format: "CSV" },
    { to: "2026-09-01T00:00:00Z" },
    { from: "2020-01-01T00:00:00Z" },
    { areaIds: [2] },
    { employeeIds: [0] },
    { employeeIds: [9007199254740992] },
    { employeeIds: Array.from({ length: 501 }, (_, i) => i + 1) },
    { groupBy: ["AREA"] },
    { columns: ["password"] },
    { attendanceSources: ["evil"] },
    { includeSummary: false, includeDetails: false },
  ])
    assert.throws(() =>
      reportBody(options, options.reports[0], { ...draft, ...invalid }),
    );
});
test("digital issuance requires nonempty installation UUID and generic creation remains physical", () => {
  const body = bodyFor(digitalCredentialFields, {
    employeeId: 12,
    installationId: uuid,
  });
  assert.equal(body.installationId, uuid);
  assert.equal(body.employeeId, 12);
  for (const installationId of [
    "",
    undefined,
    "123",
    "00000000-0000-0000-0000-000000000000",
    "not-an-installation",
  ])
    assert.throws(() =>
      bodyFor(digitalCredentialFields, { employeeId: 12, installationId }),
    );
  assert.deepEqual(
    resource("credentials").fields.find((f) => f.key === "type").choices,
    ["FISICA"],
  );
});
const json = (data) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
async function clientWith(handler) {
  const calls = [];
  const client = new ApiClient(
    "https://example.test/api/v1",
    async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith("/auth/login"))
        return json({
          accessToken: "synthetic-report-token",
          tokenType: "Bearer",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        });
      if (url.endsWith("/auth/me"))
        return json({
          id: 1,
          username: "test",
          role: "ADMIN",
          isActive: true,
          employeeId: null,
        });
      return handler(url, init);
    },
  );
  await client.login("test", "SyntheticOnlyPassword");
  return { client, calls };
}
test("authenticated PDF generation returns server bytes and never sends bearer material in URL", async () => {
  const bytes = "%PDF-1.7\nsynthetic-fixture\n%%EOF";
  const { client, calls } = await clientWith(
    () =>
      new Response(bytes, { headers: { "content-type": "application/pdf" } }),
  );
  const blob = await client.request("/reports/generate", {
    method: "POST",
    body: { type: "ATTENDANCE", format: "PDF" },
    pdf: true,
  });
  assert.equal(await blob.text(), bytes);
  const { url, init } = calls.at(-1);
  assert.equal(url, "https://example.test/api/v1/reports/generate");
  assert.equal(init.headers.Authorization, "Bearer synthetic-report-token");
  assert.equal(init.headers.Accept, "application/pdf");
  await assert.rejects(
    client.request("/employees", { pdf: true }),
    (e) => e.code === "INVALID_BODY",
  );
});
test("PDF transport rejects disguised HTML and honors JSON errors and session revocation", async () => {
  for (const [body, mime] of [
    ["<html>login</html>", "text/html"],
    ["not a pdf", "application/pdf"],
  ]) {
    const { client } = await clientWith(
      () => new Response(body, { headers: { "content-type": mime } }),
    );
    await assert.rejects(
      client.request("/reports/generate", {
        method: "POST",
        body: { format: "PDF" },
        pdf: true,
      }),
      (e) => e.code === "CONTRACT_ERROR",
    );
  }
  const { client } = await clientWith(
    () =>
      new Response(
        JSON.stringify({ detail: "Sesión vencida", code: "EXPIRED" }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
  );
  await assert.rejects(
    client.request("/reports/generate", {
      method: "POST",
      body: { format: "PDF" },
      pdf: true,
    }),
    (e) => e.status === 401 && e.code === "EXPIRED",
  );
  await assert.rejects(
    client.request("/employees"),
    (e) => e.code === "SESSION_EXPIRED",
  );
});
test("a PDF received after logout is discarded before it can be downloaded", async () => {
  let finish;
  const { client } = await clientWith(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = client.request("/reports/generate", {
    method: "POST",
    body: { format: "PDF" },
    pdf: true,
  });
  client.logout();
  finish(
    new Response("%PDF-1.7\n%%EOF", {
      headers: { "content-type": "application/pdf" },
    }),
  );
  await assert.rejects(pending, (e) => e.code === "STALE_REQUEST");
});
