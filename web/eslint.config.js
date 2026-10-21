const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', '.expo/**'] },
  { files: ['tests/**/*.cjs'], languageOptions: { globals: { require: 'readonly', Buffer: 'readonly', process: 'readonly', module: 'readonly' } } },
]);
