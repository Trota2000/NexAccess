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
const { authenticateDemo, validateLogin, DEMO_ACCOUNT } = require('../src/domain/auth.ts');

test('empty login requires both credentials', () => {
  const errors = validateLogin('  ', '');
  assert.ok(errors.username);
  assert.ok(errors.password);
});
test('valid demo credentials produce a session without password data', () => {
  assert.deepEqual(authenticateDemo(DEMO_ACCOUNT.username, DEMO_ACCOUNT.password), {
    username: 'admin', displayName: 'Administrador Demo',
  });
});
test('username is normalized but password remains case and space sensitive', () => {
  assert.ok(authenticateDemo(' ADMIN ', DEMO_ACCOUNT.password));
  assert.equal(authenticateDemo('admin', DEMO_ACCOUNT.password.toLowerCase()), null);
  assert.equal(authenticateDemo('admin', ` ${DEMO_ACCOUNT.password} `), null);
});
test('unknown account and incorrect password cannot start a session', () => {
  assert.equal(authenticateDemo('otra-persona', DEMO_ACCOUNT.password), null);
  assert.equal(authenticateDemo('admin', 'incorrecta'), null);
});
