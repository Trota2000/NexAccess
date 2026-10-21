param(
    [ValidateSet('go', 'web', 'android')]
    [string]$Target = 'go',
    [int]$Port = 8081
)

$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $taskNodeBin = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin'
        if (Test-Path (Join-Path $taskNodeBin 'node.exe')) { $env:PATH = "$taskNodeBin;$env:PATH" }
        else { throw 'Instalá Node.js con npm y abrí una terminal nueva.' }
    }
    # In this Codex workspace Node is bundled without npm. Reuse the local
    # npm shim if available; normal Node installations already supply npx.
    $taskTools = Join-Path $PSScriptRoot '../../work/tools'
    if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
        if (Test-Path (Join-Path $taskTools 'npx.cmd')) {
            $env:PATH = (Resolve-Path $taskTools).Path + ';' + $env:PATH
        } else {
            throw 'Instalá Node.js LTS con npm, luego ejecutá npm ci y npx expo start --go.'
        }
    }
    $env:npm_config_cache = Join-Path $PSScriptRoot '.npm-cache'
    $env:EXPO_NO_TELEMETRY = '1'
    $env:__UNSAFE_EXPO_HOME_DIRECTORY = Join-Path $PSScriptRoot '.expo-cli-home'
    $env:DOTSLASH_CACHE = Join-Path $PSScriptRoot '.dotslash-cache'
    if (-not (Test-Path 'node_modules/expo/package.json')) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
    }
    $taskArgs = @('expo', 'start', '--go', '--port', $Port)
    if ($Target -eq 'web') { $taskArgs += '--web' }
    if ($Target -eq 'android') { $taskArgs += '--android' }
    & npx.cmd @taskArgs
} finally {
    Pop-Location
}
