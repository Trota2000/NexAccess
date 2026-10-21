param(
  [ValidateSet('go','web','android')][string]$Target='go',
  [int]$Port=8090
)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  $taskNodeBin=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin'
  if (Test-Path (Join-Path $taskNodeBin 'node.exe')) { $env:Path="$taskNodeBin;$env:Path" }
  else { throw 'Instalá Node.js con npm, abrí una terminal nueva y volvé a ejecutar este script.' }
}
if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
  $taskToolBin=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../work/tools'))
  if(Test-Path (Join-Path $taskToolBin 'npx.cmd')) { $env:Path="$taskToolBin;$env:Path" }
  else { throw 'No se encuentra npm/npx. Instalá Node.js con npm y reiniciá la terminal.' }
}
$env:__UNSAFE_EXPO_HOME_DIRECTORY=Join-Path $PSScriptRoot '.expo-cli-home'
$env:npm_config_cache=Join-Path $PSScriptRoot '.npm-cache'
$env:DOTSLASH_CACHE=Join-Path $PSScriptRoot '.dotslash-cache'
$env:EXPO_NO_TELEMETRY='1'
if(-not (Test-Path 'node_modules/expo/package.json')) {
  & npm.cmd ci
  if($LASTEXITCODE -ne 0) { throw 'No se completó la instalación de dependencias.' }
}
$taskExpoArgs=@('expo','start','--go','--port',"$Port")
if($Target -eq 'web') { $taskExpoArgs+='--web' }
if($Target -eq 'android') { $taskExpoArgs+='--android' }
& npx.cmd @taskExpoArgs
