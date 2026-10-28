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
const { ApiClient, ApiError } = require("../source/client.ts");
const {
  companyBody,
  companyDraft,
  getCompany,
  validateLogo,
  isLogoDataUrl,
  loadCompanyBranding,
} = require("../source/company.ts");
const { reportHtml } = require("../source/reports.ts");
const company = {
  id: 1,
  razonSocial: "Compañía Demo S.A.",
  nombreFantasia: "Demo",
  ruc: "80000000-0",
  direccion: "Asunción",
  telefono: null,
  email: "demo@example.test",
  activo: true,
  tieneLogo: false,
};
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP2kAAAAASUVORK5CYII=",
  "base64",
);
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
async function clientFor(after, role = "ADMIN") {
  const calls = [];
  const client = new ApiClient(
    "https://example.test/api/v1",
    async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith("/auth/login"))
        return json({
          accessToken: "synthetic-token",
          tokenType: "Bearer",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        });
      if (url.endsWith("/auth/me"))
        return json({
          id: 1,
          username: "fixture",
          role,
          isActive: true,
          employeeId: null,
        });
      return after(url, init);
    },
  );
  await client.login("fixture", "OnlyForLocalTests!");
  return { client, calls };
}
test("company DTO includes exactly six writable fields; excludes active/id/logo; validates limits/email", () => {
  const body = companyBody(companyDraft(company));
  assert.deepEqual(Object.keys(body), [
    "razonSocial",
    "nombreFantasia",
    "ruc",
    "direccion",
    "telefono",
    "email",
  ]);
  assert.equal(body.telefono, null);
  for (const d of [
    { razonSocial: "" },
    { razonSocial: "a".repeat(201) },
    { email: "invalid" },
    { ruc: "a".repeat(21) },
  ])
    assert.throws(() => companyBody({ ...companyDraft(company), ...d }));
});
test("company not configured is distinct from inaccessible or broken API", async () => {
  let { client } = await clientFor(() =>
    json({ code: "EMPRESA_NOT_CONFIGURED" }, 404),
  );
  assert.equal(await getCompany(client), null);
  assert.equal(await loadCompanyBranding(client), undefined);
  for (const status of [403, 404, 500]) {
    ({ client } = await clientFor(() => json({ code: "HTTP_ERROR" }, status)));
    await assert.rejects(getCompany(client));
  }
});
test("all roles can read; only ADMIN can save/upload/delete; server 403 is retained", async () => {
  for (const role of ["ADMIN", "RRHH", "SEGURIDAD"]) {
    const { client, calls } = await clientFor(() => json(company), role);
    assert.equal((await getCompany(client)).id, 1);
    if (role !== "ADMIN") {
      for (const [path, method, extra] of [
        ["/empresa", "PUT", { body: companyBody(companyDraft(company)) }],
        ["/empresa/logo", "POST", { formData: new FormData() }],
        ["/empresa/logo", "DELETE", {}],
      ]) {
        const before = calls.length;
        await assert.rejects(
          client.request(path, { method, ...extra }),
          (e) => e.code === "FORBIDDEN",
        );
        assert.equal(calls.length, before);
      }
    }
  }
  const { client } = await clientFor(() =>
    json({ detail: "Sin permiso" }, 403),
  );
  await assert.rejects(getCompany(client), (e) => e.status === 403);
});
test("logo multipart preserves bearer and lets fetch generate boundary; binary GET and 204 DELETE work", async () => {
  const { client, calls } = await clientFor((url, init) =>
    init.method === "DELETE"
      ? new Response(null, { status: 204 })
      : init.method === "GET"
        ? new Response(png, { headers: { "content-type": "image/png" } })
        : json({ ...company, tieneLogo: true }),
  );
  const form = new FormData();
  form.append("logo", new Blob([png], { type: "image/png" }), "logo.png");
  await client.request("/empresa/logo", { method: "POST", formData: form });
  const init = calls.at(-1).init;
  assert.equal(init.body, form);
  assert.equal(init.headers.Authorization, "Bearer synthetic-token");
  assert.equal(init.headers["Content-Type"], undefined);
  assert.equal(init.credentials, "omit");
  const image = await client.request("/empresa/logo", { binary: true });
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
  assert.equal(
    await client.request("/empresa/logo", { method: "DELETE" }),
    undefined,
  );
  await assert.rejects(
    client.request("/employees", { method: "POST", formData: form }),
    (e) => e.code === "INVALID_BODY",
  );
});
test("binary failure expires session, rejects HTML, oversized logos and stale logout responses", async () => {
  for (const [status, type, data] of [
    [401, "application/json", "{}"],
    [200, "text/html", "<html>"],
    [200, "image/png", Buffer.alloc(2 * 1024 * 1024 + 1)],
  ]) {
    const { client } = await clientFor(
      () => new Response(data, { status, headers: { "content-type": type } }),
    );
    let expired = false;
    client.onExpired = () => (expired = true);
    await assert.rejects(client.request("/empresa/logo", { binary: true }));
    assert.equal(expired, status === 401);
  }
  let finish;
  const { client } = await clientFor(() => ({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "image/png" }),
    blob: () => new Promise((resolve) => (finish = resolve)),
  }));
  const pending = client.request("/empresa/logo", { binary: true });
  await new Promise((resolve) => setImmediate(resolve));
  client.logout();
  finish(new Blob([png], { type: "image/png" }));
  await assert.rejects(pending, (e) => e.code === "STALE_REQUEST");
});
test("logo validation checks size, signature and MIME; PDF rejects external/HTML image sources", () => {
  validateLogo(png, "image/png");
  validateLogo(Uint8Array.from([255, 216, 255, 224]), "image/jpeg");
  for (const [bytes, mime] of [
    [png, "image/jpeg"],
    [Buffer.from("not an image"), "image/png"],
    [Buffer.alloc(2 * 1024 * 1024 + 1), "image/png"],
  ])
    assert.throws(() => validateLogo(bytes, mime));
  assert.equal(isLogoDataUrl("https://host/logo.png"), false);
  assert.throws(() =>
    reportHtml(
      "id\n1",
      "Informe",
      {},
      { company, logoDataUrl: "data:image/svg+xml,<svg onload=x>" },
    ),
  );
});
test("letterhead preserves corporate data, every CSV row and range, escaping untrusted fields", () => {
  const brand = {
    company: {
      ...company,
      razonSocial: "<script>cliente</script>",
      direccion: "A & B",
    },
    logoDataUrl: "data:image/png;base64," + png.toString("base64"),
  };
  const html = reportHtml(
    "id,empleado\n1,Ana\n2,Juan\n",
    "Asistencia",
    { from: "2026-10-26T03:00:00Z", to: "2026-10-27T02:59:59Z" },
    brand,
  );
  assert.match(html, /class="letterhead"/);
  assert.match(html, /data:image\/png;base64/);
  assert.match(html, /RUC: 80000000-0/);
  assert.match(html, /&lt;script&gt;cliente/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /2 registros/);
  assert.match(html, /26\/10\/2026/);
  assert.match(html, /Juan/);
  assert.ok(!html.includes("<script>"));
  assert.match(reportHtml("id\n1", "Informe", {}), /NexAccess · Informe/);
});
