const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("../../web/node_modules/typescript");
require.extensions[".ts"] = (m, f) => {
  m.paths.unshift(path.resolve(__dirname, "../../web/node_modules"));
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    f,
  );
};
const {
  reportSnapshot,
  reportDate,
  exportReportSnapshot,
} = require("../source/reportSnapshot.ts");
const { renderReportPdf } = require("../source/reportPdf.ts");
const { PDFDocument } = require("../../web/node_modules/pdf-lib");
const request = {
  type: "ATTENDANCE",
  format: "PDF",
  from: "2026-11-01T03:00:00Z",
  to: "2026-11-03T02:59:59Z",
  includeDetails: true,
  includeSummary: true,
  columns: [],
  employeeIds: [],
  attendanceTypes: [],
  attendanceSources: [],
  deviceIds: [],
  groupBy: [],
};
const fixture = () => ({
  type: "Attendance",
  from: request.from,
  to: request.to,
  generatedAt: "2026-11-03T03:00:00Z",
  totalRecords: 1,
  rows: [
    {
      id: 1,
      employeeName: "José Ñandutí",
      occurredAt: "2026-11-01T12:00:00Z",
      type: "ENTRADA",
      source: "MANUAL",
      deviceCode: "D1",
    },
  ],
  groups: [],
});

test("report response must match requested type, dates and complete row count", () => {
  assert.equal(reportSnapshot(fixture(), request).totalRecords, 1);
  assert.equal(
    reportDate("2026-11-01T12:00:00").toISOString(),
    "2026-11-01T12:00:00.000Z",
  );
  for (const change of [
    { rows: [] },
    { type: "AccessEvents" },
    { from: "2026-10-01T03:00:00Z" },
    { generatedAt: "invalid" },
    { totalRecords: -1 },
    { groups: [{ keys: {}, totalRecords: 1 }] },
  ])
    assert.throws(() => reportSnapshot({ ...fixture(), ...change }, request));
  assert.doesNotThrow(() =>
    reportSnapshot(
      { ...fixture(), rows: [] },
      { ...request, includeDetails: false },
    ),
  );
});

test("web PDF retains original PDF audit request exactly once and confirms unchanged data", async () => {
  const calls = [];
  const result = new Blob(["pdf"]);
  const client = {
    request: async (url, args) => {
      calls.push({ url, ...args });
      return args.pdf
        ? new Blob(["legacy"])
        : { ...fixture(), generatedAt: new Date().toISOString() };
    },
  };
  assert.equal(
    await exportReportSnapshot(client, request, async () => result),
    result,
  );
  assert.deepEqual(
    calls.map((c) => c.body.format),
    ["JSON", "PDF", "JSON"],
  );
  assert.deepEqual(calls[1].body, request);
  assert.equal(calls[1].pdf, true);
  assert.ok(
    calls.every((c) => c.url === "/reports/generate" && c.method === "POST"),
  );
});

test("concurrent changes, failed audit, bad data or rendering failure never return a misleading PDF", async () => {
  let reads = 0;
  await assert.rejects(
    exportReportSnapshot(
      {
        request: async (_, args) =>
          args.pdf
            ? new Blob()
            : ++reads === 1
              ? fixture()
              : {
                  ...fixture(),
                  rows: [{ ...fixture().rows[0], type: "SALIDA" }],
                },
      },
      request,
      async () => new Blob(),
    ),
    /cambiaron/,
  );
  await assert.rejects(
    exportReportSnapshot(
      {
        request: async (_, args) => {
          if (args.pdf) throw new Error("403");
          return fixture();
        },
      },
      request,
      async () => new Blob(),
    ),
    /403/,
  );
  let audits = 0;
  const client = {
    request: async (_, args) => {
      if (args.pdf) audits++;
      return fixture();
    },
  };
  await assert.rejects(
    exportReportSnapshot(client, request, async () => {
      throw new Error("Logo inválido");
    }),
    /Logo/,
  );
  assert.equal(audits, 0);
  await assert.rejects(
    exportReportSnapshot(
      client,
      request,
      async () => new Blob(),
      () => false,
    ),
    /cancelada/,
  );
  assert.equal(audits, 0);
});

test("PDF handles all rows, selected columns and extremely long multiline cells across pages", async () => {
  const logo =
    "data:image/png;base64," +
    fs
      .readFileSync(path.join(__dirname, "../assets/nexaccess-logo.png"))
      .toString("base64");
  const data = fixture();
  data.rows = Array.from({ length: 120 }, (_, i) => ({
    ...data.rows[0],
    id: i + 1,
    note: i === 0 ? "observación extensa ".repeat(1200) : `REGISTRO ${i + 1}`,
  }));
  data.totalRecords = data.rows.length;
  const selected = {
    ...request,
    columns: [
      "occurredAt",
      "employeeId",
      "employeeName",
      "type",
      "source",
      "note",
    ],
  };
  const bytes = await renderReportPdf(data, selected, 1, async () => ({
    image: logo,
    height: 78,
  }));
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() > 5);
  assert.equal(pdf.getTitle(), "Reporte de asistencia");
  assert.ok(pdf.getPages().every((p) => p.getWidth() > p.getHeight()));
  const empty = await renderReportPdf(
    { ...fixture(), rows: [], totalRecords: 0 },
    request,
    1,
    async () => ({ image: logo, height: 78 }),
  );
  assert.equal((await PDFDocument.load(empty)).getPageCount(), 1);
  await assert.rejects(
    renderReportPdf(data, selected, 1, async () => ({
      image: logo,
      height: 500,
    })),
    /demasiado extenso/,
  );
});
