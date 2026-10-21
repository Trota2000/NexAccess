# Colaboración en NexAccess

## Preparar el entorno

1. Cloná el repositorio y elegí `web/` o `mobile/`.
2. Ejecutá `npm ci` dentro de la plantilla elegida.
3. En `/demo` y los fixtures usá únicamente datos ficticios. El modo API opera sobre el servidor configurado: realizá solo consultas y escrituras autorizadas.

Si Windows informa que `node` no se reconoce, instalá Node.js con npm y abrí una terminal nueva. Los scripts `run.ps1` son opcionales; los comandos npm del README funcionan con una instalación normal de Node.

## Trabajar por ramas

```powershell
git switch main
git pull --ff-only
git switch -c feature/descripcion-del-cambio
```

Realizá el cambio en su plantilla, verificá el resultado y abrí un Pull Request hacia `main`. Indicá qué cambió, en qué pantallas se puede revisar y qué comprobaciones realizaste. Para corregir errores podés usar `fix/descripcion`.

En un repositorio público cualquiera puede proponer cambios desde un fork. Para subir ramas directamente se necesita permiso de colaborador. La persona propietaria puede concederlo desde Settings → Collaborators; no hace falta compartir tokens ni cuentas.

## Comprobaciones

Para cambios de integración, editá `integration/source/`, ejecutá `node integration/sync.cjs` desde la raíz y comprobá `node integration/sync.cjs --check`. Las copias en `web/src/api` y `mobile/src/api` permiten instalar cada Expo por separado. El proxy se mantiene en `integration/metro-proxy.cjs` y también se sincroniza. Con las dependencias web instaladas, ejecutá `node --test integration/tests/*.test.cjs`. No uses producción para probar escrituras o credenciales ficticias.

La CI verifica ambas apps y exporta web, pero no despliega el backend. Antes de cambiar contratos, ejecutá `node integration/check-contract.cjs RUTA_BACKEND` contra una copia actual y revisá DTO y permisos. Un health válido no prueba que el despliegue coincida con esa versión.

Dentro de cada plantilla afectada:

```powershell
npm test
npm run typecheck
npm run lint
```

Para paquetes de Expo, usá `npx expo install nombre-del-paquete`, así se resuelven versiones compatibles con el SDK. Conservá el archivo `package-lock.json` y no actualices dependencias de la otra plantilla sin necesidad.

## Mantener el alcance

- Conservá separadas la navegación de escritorio y la navegación móvil.
- Distinguí empleados, cuentas de operadores y roles físicos de acceso.
- Identificá los cambios como simulaciones locales mientras no exista una integración real.
- No agregues endpoints, reglas salariales o funciones NFC que el backend no soporte.
- No subas `node_modules`, cachés, archivos `.env`, tokens, claves de dispositivos ni datos reales.
- Conservá las notas de requisitos e integración y actualizalas cuando cambie una funcionalidad.

Los reportes de validación describen pruebas concretas; no deben presentarse como garantía de seguridad, accesibilidad o funcionamiento en hardware no probado.
