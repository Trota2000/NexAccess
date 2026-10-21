const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Load the domain-only TypeScript code without involving React Native or Metro.
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(output.outputText, filename);
};
const { cleanDraft, validateDraft, filterUsers } = require('../src/domain/users.ts');
const { employees } = require('../src/data/mock.ts');
const valid = { nombre: ' Laura ', apellido: 'Pérez', cedula: '7.654.321', email: ' Laura@Empresa.Example ', telefono: '0981 123 456', departamento: 'Administración', roles: ['Empleado'], activo: true };

test('valid registration normalizes document and email', () => {
  assert.deepEqual(validateDraft(valid, employees), {});
  assert.equal(cleanDraft(valid).cedula, '7654321');
  assert.equal(cleanDraft(valid).email, 'laura@empresa.example');
});
test('formatted duplicate document is rejected', () => {
  assert.ok(validateDraft({ ...valid, cedula: '4.200.100' }, employees).cedula);
});
test('duplicate email ignores case and whitespace', () => {
  assert.ok(validateDraft({ ...valid, email: ' PERSONA1@NEXACCESS.EXAMPLE ' }, employees).email);
});
test('editing a user permits their own unique fields', () => {
  assert.deepEqual(validateDraft(employees[0], employees, employees[0].id), {});
});
test('invalid form reports required fields and malformed optional values', () => {
  const errors = validateDraft({ ...valid, nombre: '', apellido: 'A', cedula: '', email: 'incorrecto', telefono: 'abc', departamento: '', roles: [] }, employees);
  assert.equal(Object.keys(errors).length, 7);
});
test('email and phone are optional', () => {
  assert.deepEqual(validateDraft({ ...valid, email: '', telefono: '' }, employees), {});
});
test('search ignores accents and supports IDs', () => {
  assert.equal(filterUsers(employees, 'lucia', 'Todos', 'Todos')[0].nombre, 'Lucía');
  assert.equal(filterUsers(employees, 'EMP-001', 'Todos', 'Todos')[0].nombre, 'Camila');
});
test('role filter matches additional roles and intersects status', () => {
  assert.equal(filterUsers(employees, '', 'RRHH', 'Activos').length, 1);
  assert.equal(filterUsers(employees, '', 'RRHH', 'Inactivos')[0].nombre, 'Ana');
});
