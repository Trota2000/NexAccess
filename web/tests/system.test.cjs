const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(output.outputText, filename);
};
const { initialRecords } = require('../src/data/system.ts');
const { employees, events } = require('../src/data/mock.ts');
const { validateRecord, materializeCredentials, materializePermissions, validDate, cardState } = require('../src/domain/system.ts');
const { csvContent, reportHtml, groupEvents, dateKey, eventRows } = require('../src/domain/reports.ts');
const { dateLabel } = require('../src/domain/users.ts');
const clone = () => structuredClone(initialRecords);

test('invalid calendar days cannot be submitted', () => {
  assert.equal(validDate('2026-02-31'), false);
  assert.equal(validDate('2026-02-28'), true);
});
test('optional dates and timezone boundaries do not break the profile', () => {
  assert.equal(dateLabel(''), 'Sin fecha');
  const row = structuredClone(initialRecords.cards[0]); row.fields.expires = '2026-10-14';
  assert.equal(cardState(row, new Date('2026-10-15T01:00:00Z')), 'Activa');
  assert.equal(cardState(row, new Date('2026-10-15T01:00:00Z'), 'UTC'), 'Vencida');
});
test('active credentials require an assigned employee and unique UID', () => {
  const f = { ...initialRecords.cards[0].fields, employeeId: '' };
  const errors = validateRecord('cards', f, initialRecords, employees);
  assert.ok(errors.uid);
  assert.ok(errors.employeeId);
});
test('blocking or unlinking updates the profile credential projection', () => {
  const row = structuredClone(initialRecords.cards[0]);
  row.fields.status = 'Bloqueada';
  assert.equal(materializeCredentials([row])[0].activa, false);
  assert.equal(materializeCredentials([row])[0].estado, 'Bloqueada');
  row.fields.employeeId = ''; row.fields.status = 'Inactiva';
  assert.equal(materializeCredentials([row])[0].employeeId, '');
});
test('expired credentials cannot present as active', () => {
  const row = structuredClone(initialRecords.cards[0]); row.fields.expires = '2000-01-01';
  assert.equal(cardState(row), 'Vencida');
  assert.equal(materializeCredentials([row])[0].activa, false);
});
test('inactive area suspends its permission projections', () => {
  const records = clone(); records.areas[0].fields.status = 'Inactiva';
  assert.ok(materializePermissions(records).filter(p => p.area === 'Recepción').every(p => !p.activa));
});
test('revoked permissions are not effective', () => {
  const records = clone(); records.permissions[0].fields.status = 'Revocado';
  assert.equal(materializePermissions(records)[0].activa, false);
});
test('permission validation rejects duplicate subject and area and inverted hours', () => {
  const f = { ...initialRecords.permissions[0].fields, start: '18:00', end: '07:00' };
  const errors = validateRecord('permissions', f, initialRecords, employees);
  assert.ok(errors.areaId); assert.ok(errors.end);
});
test('devices cannot point to an unknown area', () => {
  const f = { ...initialRecords.devices[0].fields, areaId: 'UNKNOWN' };
  assert.ok(validateRecord('devices', f, initialRecords, employees, initialRecords.devices[0].id).areaId);
});
test('CSV escapes quotes and neutralizes spreadsheet formulas', () => {
  const csv = csvContent([['Nombre'], ['=1+1'], ['Camila, "prueba"']]);
  assert.ok(csv.includes("'=")); assert.ok(csv.includes('"Camila, ""prueba"""'));
});
test('print report escapes user controlled HTML', () => {
  const html = reportHtml('<script>', [['Nombre'], ['<img onerror=x>']]);
  assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img onerror'));
  assert.ok(html.includes('&lt;img onerror=x&gt;'));
});
test('report grouping and CSV selection preserve event counts', () => {
  const groups = groupEvents(events, 'Semana', 'America/Asuncion');
  assert.equal(groups.reduce((n, g) => n + g.value, 0), events.length);
  assert.equal(eventRows(events.slice(0, 3), employees).length, 4);
  assert.equal(dateKey('2026-10-14T01:00:00Z', 'America/Asuncion'), '2026-10-13');
});
