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
const {
  resources,
  bodyFor,
  accountAccessBody,
} = require("../source/resources.ts");
const { resolveOperation } = require("../source/contract.ts");
const users = resources.find((r) => r.key === "users");
test("account form creates an NFC-only user with an employee and no web privilege", () => {
  const body = bodyFor(users.fields, {
    username: "empleado.demo",
    password: "Prueba-local-123",
    role: "EMPLEADO",
    employeeId: 42,
    webAccessEnabled: false,
    mobileAccessEnabled: true,
  });
  assert.equal(body.role, "EMPLEADO");
  assert.equal(body.webAccessEnabled, false);
  assert.equal(body.mobileAccessEnabled, true);
});
test("existing web clients keep web default and never gain mobile access implicitly", () => {
  const body = bodyFor(users.fields, {
    username: "seguridad.demo",
    password: "Prueba-local-123",
    role: "SEGURIDAD",
  });
  assert.equal(body.webAccessEnabled, true);
  assert.equal(body.mobileAccessEnabled, false);
});
test("dual account requires an employee and cannot upgrade its canonical role through access update", () => {
  assert.deepEqual(
    accountAccessBody(
      { webAccessEnabled: true, mobileAccessEnabled: true },
      "SEGURIDAD",
      42,
    ),
    { webAccessEnabled: true, mobileAccessEnabled: true },
  );
  assert.throws(
    () =>
      accountAccessBody(
        { webAccessEnabled: true, mobileAccessEnabled: true },
        "SEGURIDAD",
        null,
      ),
    /empleado vinculado/,
  );
  assert.throws(
    () =>
      accountAccessBody(
        { webAccessEnabled: false, mobileAccessEnabled: true },
        "SEGURIDAD",
        42,
      ),
    /no permite cambiar el perfil/i,
  );
  assert.throws(
    () =>
      accountAccessBody(
        { webAccessEnabled: true, mobileAccessEnabled: true },
        "EMPLEADO",
        42,
      ),
    /solo puede usar la app/,
  );
  assert.throws(
    () =>
      accountAccessBody(
        { webAccessEnabled: false, mobileAccessEnabled: false },
        "EMPLEADO",
        42,
      ),
    /al menos un canal/,
  );
});
test("routes match current backend PUT access and server-generated digital issuance DTO", () => {
  const access = resolveOperation("/users/101/access", "PUT");
  assert.deepEqual(access.roles, ["ADMIN"]);
  assert.deepEqual(access.bodyKeys, [
    "webAccessEnabled",
    "mobileAccessEnabled",
  ]);
  assert.equal(resolveOperation("/users/101/access", "PATCH"), undefined);
  const digital = resolveOperation("/credentials/digital/42", "POST");
  assert.deepEqual(digital.roles, ["ADMIN", "SEGURIDAD"]);
  assert.deepEqual(digital.bodyKeys, ["installationId", "name", "expiresAt"]);
});
