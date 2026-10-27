const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("../../web/node_modules/typescript");
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
  calendarInstant,
  monthDays,
  localParts,
} = require("../source/dates.ts");
const { parseCsv, reportHtml } = require("../source/reports.ts");
const { queryFor, resource } = require("../source/resources.ts");
const { loadMetrics } = require("../source/workflows.ts");
test("calendar exports include the entire selected Asunción day with explicit UTC boundaries", () => {
  const from = calendarInstant("2026-10-26", "from"),
    to = calendarInstant("2026-10-26", "to");
  assert.equal(from, "2026-10-26T03:00:00.000Z");
  assert.equal(to, "2026-10-27T02:59:59.999Z");
  assert.equal(Date.parse(to) - Date.parse(from), 86400000 - 1);
  for (const key of ["access-events", "attendance"]) {
    const q = queryFor(resource(key), { from, to });
    assert.equal(q.from, from);
    assert.equal(q.to, to);
    assert.throws(() => queryFor(resource(key), { from: to, to: from }));
  }
  assert.equal(localParts("2026-10-27T02:00:00Z").day, "2026-10-26");
});
test("calendar handles leap months and year boundaries; malformed dates and times are rejected", () => {
  assert.ok(
    monthDays(2024, 1).some((d) => d.day === "2024-02-29" && d.current),
  );
  assert.ok(!monthDays(2025, 1).some((d) => d.day === "2025-02-29"));
  assert.ok(monthDays(2026, 11).some((d) => d.day === "2027-01-01"));
  for (const date of ["2026-02-30", "bad"])
    assert.throws(() => calendarInstant(date, "from"));
  assert.throws(() => calendarInstant("2026-10-26", "instant", "24", "00"));
  assert.equal(
    calendarInstant("2026-10-26", "instant", "9", "5"),
    "2026-10-26T12:05:00.000Z",
  );
});
test("PDF uses every exported CSV row, including quoted delimiters, newlines, BOM and escaped quotes", () => {
  const csv =
    '\uFEFFid,empleado,observacion\r\n1,"Ana, Vera","Nota con \"\"comillas\"\"\nsegunda línea"\r\n2,Lucía,ok\r\n';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[1][1], "Ana, Vera");
  assert.equal(rows[1][2], 'Nota con "comillas"\nsegunda línea');
  const html = reportHtml(csv, "Asistencia", {
    from: "2026-10-26T03:00:00Z",
    to: "2026-10-27T02:59:59.999Z",
  });
  assert.match(html, /2 registros/);
  assert.match(html, /Lucía/);
  assert.match(html, /Desde: 26\/10\/2026/);
});
test("PDF escapes server-controlled HTML and preserves an empty export as empty", () => {
  const html = reportHtml(
    "id,nombre\n1,<script>alert(1)<\/script>\n",
    "<img src=x>",
    { employeeId: "<b>12</b>" },
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x>"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(reportHtml("id,nombre\r\n", "Informe", {}), /0 registros/);
  assert.throws(() => parseCsv('id,nombre\n1,"incompleto'));
  assert.throws(() => parseCsv("id,nombre\n1"));
});
test("dashboard period is sent only to event/attendance counters and does not change current inventory counts", async () => {
  const requests = [];
  const client = {
    request: async (path, { query }) => {
      requests.push({ path, query });
      return { items: [], page: 1, pageSize: 1, totalItems: 2, totalPages: 2 };
    },
  };
  const range = {
    from: calendarInstant("2026-10-26", "from"),
    to: calendarInstant("2026-10-26", "to"),
  };
  const metrics = await loadMetrics(
    client,
    "ADMIN",
    new Date("2026-10-27T12:00:00Z"),
    range,
  );
  for (const req of requests) {
    if (["/access-events", "/attendance"].includes(req.path)) {
      assert.equal(req.query.from, range.from);
      assert.equal(req.query.to, range.to);
    } else assert.equal(req.query.from, undefined);
  }
  assert.ok(
    metrics
      .filter((m) => ["access-events", "attendance"].includes(m.key))
      .every((m) => m.label.includes("período")),
  );
});
