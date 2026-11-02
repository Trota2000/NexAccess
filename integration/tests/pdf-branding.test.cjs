const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("../../web/node_modules/typescript");
const {
  PDFDocument,
  StandardFonts,
} = require("../../web/node_modules/pdf-lib");
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
const { stampPdf } = require("../source/stampPdf.ts");
const { letterheadData, letterheadHtml } = require("../source/letterhead.ts");
const { reportHtml } = require("../source/reports.ts");
const { ApiError } = require("../source/client.ts");
const logo =
  "data:image/png;base64," +
  fs
    .readFileSync(path.resolve(__dirname, "../assets/nexaccess-logo.png"))
    .toString("base64");
const company = {
  id: 1,
  razonSocial: "Empresa Ñandutí S.A.",
  nombreFantasia: "Ñandutí",
  ruc: "80000000-0",
  direccion: "Asunción",
  telefono: "0981000000",
  email: "demo@example.test",
  activo: true,
  tieneLogo: true,
};

test("the same letterhead contains company identity or NexAccess default, escaping HTML", () => {
  const brand = {
    company: { ...company, razonSocial: "A & B <script>" },
    logoDataUrl: logo,
  };
  const header = letterheadHtml(brand);
  assert.match(header, /A &amp; B &lt;script&gt;/);
  assert.match(header, /RUC: 80000000-0/);
  assert.match(header, /0981000000 · demo@example.test/);
  for (const name of ["Asistencia", "Historial de accesos"]) {
    const html = reportHtml("id,empleado\n1,Ana\n2,José", name, {}, brand);
    assert.ok(html.includes(header));
    assert.match(html, /2 registros/);
  }
  const fallback = letterheadHtml({ logoDataUrl: logo });
  assert.match(fallback, /<h2>NexAccess<\/h2>/);
  assert.match(fallback, /Control de accesos y asistencia/);
  assert.ok(fallback.includes(logo));
  assert.throws(() =>
    letterheadData({ logoDataUrl: "https://example.test/logo.png" }),
  );
});

test("branding loader uses bundled logo only for absent configuration/logo; never hides API errors", async () => {
  let downloads = 0;
  const originalLoad = Module._load;
  Module._load = function (name, ...args) {
    if (name === "expo-asset")
      return {
        Asset: {
          fromModule: () => ({
            uri: "https://example.test/bundled.png",
            downloadAsync: async () => downloads++,
          }),
        },
      };
    if (name === "react-native") return { Platform: { OS: "web" } };
    return originalLoad.call(this, name, ...args);
  };
  const originalPng = require.extensions[".png"];
  require.extensions[".png"] = (m) => {
    m.exports = 1;
  };
  // Match the location the canonical file has after integration/sync.cjs.
  const file = path.resolve(__dirname, "../../web/src/api/reportBranding.ts");
  const savedReader = global.FileReader,
    savedFetch = global.fetch;
  global.FileReader = class {
    readAsDataURL() {
      this.result = logo;
      this.onload();
    }
  };
  global.fetch = async () =>
    new Response(Buffer.from(logo.split(",")[1], "base64"), {
      headers: { "content-type": "image/png" },
    });
  try {
    const { loadReportBranding } = require(file);
    const { ApiError: BrandingError } = require("../../web/src/api/client.ts");
    const missing = {
      request: async () => {
        throw new BrandingError("Sin empresa", 404, "EMPRESA_NOT_CONFIGURED");
      },
    };
    assert.deepEqual(await loadReportBranding(missing), { logoDataUrl: logo });
    const noLogo = { request: async () => ({ ...company, tieneLogo: false }) };
    const branded = await loadReportBranding(noLogo);
    assert.equal(branded.company.razonSocial, company.razonSocial);
    assert.equal(branded.logoDataUrl, logo);
    const custom = {
      request: async (url) =>
        url === "/empresa"
          ? company
          : new Blob([Buffer.from(logo.split(",")[1], "base64")], {
              type: "image/png",
            }),
    };
    assert.equal((await loadReportBranding(custom)).logoDataUrl, logo);
    assert.equal(downloads, 1);
    for (const status of [401, 403, 404, 500]) {
      await assert.rejects(
        loadReportBranding({
          request: async () => {
            throw new BrandingError("Fallo", status, "HTTP_ERROR");
          },
        }),
        (e) => e.status === status,
      );
    }
    await assert.rejects(
      loadReportBranding({
        request: async (url) => {
          if (url === "/empresa") return company;
          throw new BrandingError("Logo no disponible", 500);
        },
      }),
    );
  } finally {
    Module._load = originalLoad;
    if (originalPng) require.extensions[".png"] = originalPng;
    else delete require.extensions[".png"];
    global.FileReader = savedReader;
    global.fetch = savedFetch;
  }
});

test("server PDF keeps every portrait/landscape/rotated page and reserves space for the header", async () => {
  const source = await PDFDocument.create();
  const font = await source.embedFont(StandardFonts.Helvetica);
  const { degrees } = require("../../web/node_modules/pdf-lib");
  for (const [width, height, rotation] of [
    [595, 842, 0],
    [842, 595, 0],
    [595, 842, 90],
  ]) {
    const page = source.addPage([width, height]);
    page.setRotation(degrees(rotation));
    page.drawText("SUMMARY AND ALL DETAIL ROWS", {
      x: 30,
      y: height - 40,
      size: 12,
      font,
    });
    page.drawText("LAST ROW AT BOTTOM", { x: 30, y: 15, size: 10, font });
  }
  const bytes = await source.save();
  const original = Buffer.from(bytes);
  let renders = 0;
  const output = await stampPdf(bytes, async () => {
    renders++;
    return { image: logo, height: 78 };
  });
  const pdf = await PDFDocument.load(output);
  assert.equal(pdf.getPageCount(), 3);
  assert.deepEqual(
    pdf.getPages().map((p) => p.getSize()),
    [
      { width: 595, height: 842 },
      { width: 842, height: 595 },
      { width: 842, height: 595 },
    ],
  );
  assert.deepEqual(Buffer.from(bytes), original);
  assert.equal(renders, 2);
  assert.equal(pdf.getCreator(), "NexAccess");
  await assert.rejects(
    stampPdf(Buffer.from("not a PDF"), async () => ({
      image: logo,
      height: 78,
    })),
  );
  await assert.rejects(
    stampPdf(bytes, async () => ({ image: logo, height: 600 })),
    /demasiado extenso/,
  );
});
