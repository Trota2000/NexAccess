const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, filename);
const { emptyHistoryFilters, filterAccessEvents, historyFilterError } = require('../src/domain/history.ts');
const { validateRecord, materializeCredentials } = require('../src/domain/system.ts');
const { eventRows } = require('../src/domain/reports.ts');
const { validateDraft } = require('../src/domain/users.ts');
const { employees, events } = require('../src/data/mock.ts');
const { initialRecords } = require('../src/data/system.ts');
const credentials = materializeCredentials(initialRecords.cards);

test('historial busca por terminación enmascarada y por ID de credencial', () => {
  const selected = events[0], credential = credentials.find(c=>c.id===selected.credentialId);
  for(const search of [credential.maskedUid.slice(-4), selected.credentialId]) {
    const result=filterAccessEvents(events,employees,credentials,{...emptyHistoryFilters,search},'America/Asuncion');
    assert.ok(result.some(e=>e.id===selected.id));
  }
});
test('historial combina área, lector y resultado sin alterar los datos originales',()=>{
  const before=JSON.stringify(events), e=events[0];
  const result=filterAccessEvents(events,employees,credentials,{...emptyHistoryFilters,area:e.areaId,device:e.deviceId,result:e.resultado},'America/Asuncion');
  assert.ok(result.length);assert.ok(result.every(x=>x.areaId===e.areaId&&x.deviceId===e.deviceId&&x.resultado===e.resultado));assert.equal(JSON.stringify(events),before);
});
test('fecha y hora se filtran en la zona configurada, con límites inclusivos',()=>{
  const row={...events[0],date:'2026-10-14T01:00:00Z'};
  const f={...emptyHistoryFilters,from:'2026-10-13',until:'2026-10-13',timeFrom:'22:00',timeUntil:'22:00'};
  assert.equal(filterAccessEvents([row],employees,credentials,f,'America/Asuncion').length,1);
  assert.equal(filterAccessEvents([row],employees,credentials,f,'UTC').length,0);
});
test('rechaza rangos de fechas y horas inválidos antes de filtrar o exportar',()=>{
  for(const f of [{from:'2026-02-30'},{from:'2026-10-20',until:'2026-10-01'},{timeFrom:'25:00'},{timeFrom:'18:00',timeUntil:'07:00'}]) {
    assert.ok(historyFilterError({...emptyHistoryFilters,...f}));assert.deepEqual(filterAccessEvents(events,employees,credentials,{...emptyHistoryFilters,...f},'UTC'),[]);
  }
});
test('orden cronológico es real y puede invertirse',()=>{
  const result=filterAccessEvents(events,employees,credentials,{...emptyHistoryFilters,order:'Antiguos'},'UTC');
  assert.ok(result.every((e,i)=>!i||Date.parse(e.date)>=Date.parse(result[i-1].date)));
});
test('credencial revocada no se reactiva, reasigna ni cambia de código',()=>{
  const records=structuredClone(initialRecords), row=records.cards[0];row.fields.status='Revocada';
  const errors=validateRecord('cards',{...row.fields,status:'Activa',employeeId:employees[1].id,uid:'OTRO-UID'},records,employees,row.id);
  assert.ok(errors.status);assert.ok(errors.employeeId);assert.ok(errors.uid);
});
test('días arbitrarios y roles físicos falsos no pasan validación',()=>{
  const row=initialRecords.permissions[0];assert.ok(validateRecord('permissions',{...row.fields,days:'cualquier cosa'},initialRecords,employees,row.id).days);
  assert.ok(validateDraft({...employees[0],roles:['SUPERADMIN']},employees,employees[0].id).roles);
});
test('CSV incluye identificador enmascarado y respeta exactamente la selección',()=>{
  const selected=events.slice(0,2),rows=eventRows(selected,employees,credentials);
  assert.equal(rows.length,3);assert.ok(rows[0].includes('Identificador enmascarado'));
  assert.equal(rows[1][0],selected[0].id);assert.ok(rows[1][4].startsWith('••••'));
});
