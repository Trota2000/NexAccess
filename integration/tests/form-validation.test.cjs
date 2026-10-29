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
  fieldError,
  inputError,
} = require("../source/resources.ts");
const { companyBody, companyDraft } = require("../source/company.ts");
const employees = resources.find((r) => r.key === "employees");
const field = (key) => employees.fields.find((f) => f.key === key);
const employee = {
  documentNumber: "00123456",
  firstName: "María José",
  lastName: "O’Connor-Pérez",
  email: "maria+acceso@ficticio.net",
  phone: "+595 (981) 123-456",
};

test("employee formats preserve leading zeros, accents, international phone formatting and valid arbitrary email domains", () => {
  assert.deepEqual(bodyFor(employees.fields, employee), employee);
  for (const email of [
    "a@gmail.com",
    "nombre@ficticio.net",
    "a.b+tag@sub.empresa.com.py",
    "a@xn--bcher-kva.de",
  ])
    assert.equal(fieldError(field("email"), email), "", email);
  for (const phone of [
    "0981123456",
    "+595 981 123456",
    "(021) 123456",
    "123456",
  ])
    assert.equal(fieldError(field("phone"), phone), "", phone);
  assert.deepEqual(
    bodyFor(employees.fields, { ...employee, email: " ", phone: "" }),
    { ...employee, email: null, phone: null },
  );
});
test("malformed emails and invalid numeric inputs cannot produce a DTO even if the input handler is bypassed", () => {
  for (const email of [
    "texto",
    "a@",
    "a@gmail",
    "a@@gmail.com",
    "a b@gmail.com",
    ".a@gmail.com",
    "a..b@gmail.com",
    "a.@gmail.com",
    "a@-dominio.com",
    "a@dominio-.com",
    "a@dominio..com",
    "a@dominio.c",
    "a@dominio.123",
    "a@dominio.com/path",
  ]) {
    assert.throws(
      () => bodyFor(employees.fields, { ...employee, email }),
      (error) => !!error.errors.email,
      email,
    );
  }
  for (const [key, invalid] of [
    ["documentNumber", "abc"],
    ["documentNumber", "12.345"],
    ["documentNumber", "12"],
    ["documentNumber", "123456789012345678901"],
    ["phone", "123abc456"],
    ["phone", "12345"],
    ["phone", "1234567890123456"],
    ["phone", "123+456"],
    ["phone", "(021 123456"],
    ["phone", "021) 123456"],
    ["firstName", "Ana123"],
    ["lastName", "---"],
  ]) {
    assert.throws(
      () => bodyFor(employees.fields, { ...employee, [key]: invalid }),
      (error) => !!error.errors[key],
      key + ": " + invalid,
    );
  }
});
test("numeric and name input guards reject an invalid edit instead of silently rewriting pasted data", () => {
  for (const [key, invalid] of [
    ["documentNumber", "123abc"],
    ["phone", "0981xyz123"],
    ["phone", "++595"],
    ["firstName", "Ana7"],
  ])
    assert.ok(inputError(field(key), invalid));
  assert.equal(inputError(field("documentNumber"), ""), "");
  assert.equal(inputError(field("phone"), "+595 (981) "), "");
  assert.equal(inputError(field("firstName"), "Ána-María O’"), "");
});
test("company uses the same phone and email validation, and numeric RUC with optional check digit", () => {
  const draft = {
    ...companyDraft(),
    razonSocial: "Empresa & Hijos S.A.",
    ruc: "80000000-1",
    telefono: "+595 (21) 123456",
    email: "contacto@empresa.com.py",
  };
  assert.equal(companyBody(draft).ruc, "80000000-1");
  for (const bad of [
    { ruc: "ABC-1" },
    { ruc: "123--1" },
    { ruc: "123-12" },
    { telefono: "llamar123" },
    { email: "correo sin dominio" },
  ])
    assert.throws(() => companyBody({ ...draft, ...bad }));
  assert.equal(companyBody({ ...draft, ruc: "" }).ruc, null);
});
test("existing format, length, ID, choice and time rules apply consistently; passwords and free text are preserved", () => {
  const users = resources.find((r) => r.key === "users");
  const password = "  Clave válida + !  ";
  assert.equal(
    bodyFor(users.fields, {
      username: "empleado.demo",
      password,
      role: "SEGURIDAD",
    }).password,
    password,
  );
  assert.throws(() =>
    bodyFor(users.fields, {
      username: "usuario con espacios",
      password,
      role: "SEGURIDAD",
    }),
  );
  const areas = resources.find((r) => r.key === "areas");
  assert.throws(() =>
    bodyFor(areas.fields, { code: "CODIGO!", name: "Área", description: "" }),
  );
  assert.equal(
    bodyFor(areas.fields, {
      code: "A_1",
      name: "Depósito 2",
      description: "Piso 3, sector B / atención 24 h.",
    }).description,
    "Piso 3, sector B / atención 24 h.",
  );
  assert.ok(fieldError({ key: "id", label: "ID", type: "id" }, "1e3"));
  assert.ok(
    fieldError(
      { key: "duration", label: "Duración", type: "id", max: 1440 },
      "1441",
    ),
  );
  assert.ok(
    fieldError({ key: "startTime", label: "Hora", type: "time" }, "24:60"),
  );
  assert.ok(
    fieldError({ key: "type", label: "Tipo", choices: ["A", "B"] }, "C"),
  );
  assert.ok(fieldError({ key: "name", label: "Nombre", max: 3 }, "Largo"));
});
