# NexAccess — Frontend personal Android

La app móvil tiene login del empleado, Mi tarjeta, Historial propio, cierre de sesión y tema claro/oscuro. La web administrativa no cambia. Los módulos móviles anteriores se conservan en código, pero sus rutas están fuera de la navegación protegida de empleados.

## Ejecutar con backend real

```powershell
cd mobile
npm ci
npx expo start --go
```

Usar Expo Go compatible con SDK 57 para revisar las pantallas. La URL nativa predeterminada es `https://nexaccess.rattenkoenig.net/api/v1`. Se puede cambiar mediante `EXPO_PUBLIC_PERSONAL_API_URL` en `.env.local`; reiniciar Expo después. No poner secretos en variables EXPO_PUBLIC.

El login personal consume los endpoints móviles implementados por el backend. Hace falta una cuenta con empleado activo y mobileAccessEnabled=true; no se reemplaza con el login administrativo. La apertura real NFC/HCE requiere un módulo Android y una nueva compilación; no está implementada en esta entrega. Ver [revisión del manual y pendientes](REVISION_MANUAL_ANDROID.md).

## Vista de prueba sin backend nuevo

Terminal 1, desde mobile:

```powershell
node scripts/personal-preview.cjs
```

Crear mobile/.env.local (ignorado por Git):

```dotenv
EXPO_PUBLIC_PERSONAL_API_URL=http://localhost:8791/api/v1
EXPO_PUBLIC_PERSONAL_PREVIEW=1
```

Terminal 2, desde mobile:

```powershell
npx expo start --go --localhost --port 8097
```

Abrir http://localhost:8097 o presionar w. Usuario ficticio: `empleado.demo`. Contraseña ficticia: `NexAccess2026!`. El fixture solo escucha en 127.0.0.1, contiene datos inventados, no abre puertas y no forma parte del APK. No ingresar cuentas reales en este fixture.

En el navegador los secretos se guardan únicamente en memoria; la persistencia segura de sesión corresponde a Android/iOS. El banner de vista de prueba solo se muestra en desarrollo. No existe fallback automático a datos ficticios.

El fixture localhost no es accesible desde un teléfono físico. Para probar con Expo Go usar una API HTTPS de pruebas accesible desde el teléfono. Quitar el archivo .env.local de prueba antes de volver al servidor real.

## Contrato adaptado al backend f4dc357 (29/10/2026)

| Método | Ruta relativa a /api/v1 | Datos |
|---|---|---|
| POST | /auth/mobile/login | username, password, installationId (UUID persistente) |
| POST | /auth/mobile/refresh | refreshToken |
| POST | /auth/mobile/logout | refreshToken; 204 |
| GET | /me | Perfil propio |
| GET | /me/credentials | Lista propia paginada y código enmascarado |
| GET | /me/access-events | Lista propia paginada; filtros from, to, result |

Login y refresh: `{accessToken,tokenType:"Bearer",expiresAt,refreshToken,sessionId,user:{id,username,role:"EMPLEADO",employeeId,isActive:true}}`. Refresh conserva sesión/cuenta/empleado y rota refreshToken. expiresAt corresponde solo al accessToken: la sesión móvil se renueva sin vencimiento por tiempo/inactividad.

Perfil: `{userId,username,role:"EMPLEADO",employeeId,fullName,isActive}`. Se comprueban userId, username y employeeId contra la sesión. El backend no devuelve documento; la tarjeta no lo inventa.

Lista de tarjetas: `{items,page,pageSize,totalItems,totalPages}`. Cada item: `{id,name,type:"DIGITAL"|"FISICA",maskedCode,status:"ACTIVA"|"INACTIVA"|"VENCIDA"|"REVOCADA",issuedAt,expiresAt}`. name/expiresAt admiten null. La pantalla muestra únicamente tarjetas digitales.

Historial: mismo formato paginado; cada evento contiene `{id,employeeId,occurredAt,result:"AUTORIZADO"|"RECHAZADO",reason,areaName,deviceCode}`. reason/areaName/deviceCode admiten null. Fechas ISO 8601 con zona/UTC. IDs enteros seguros y positivos.

Errores: JSON problem con detail y code. Login 404/405/501 informa que falta habilitar la API móvil. El cliente nunca envía employeeId como filtro y descarta perfiles/eventos de otro empleado. El backend debe garantizar el aislamiento, no delegarlo al cliente.

## Sesión persistente y cierre

- Expo SecureStore en Android/iOS para secreto de renovación y metadatos mínimos; no se guarda contraseña ni JWT de acceso en AsyncStorage. JWT solo en memoria.
- installationId se genera mediante Expo Crypto y se conserva en el almacenamiento seguro de la instalación, también después de cerrar sesión. No es una contraseña ni identifica hardware del usuario.
- Restauración al reabrir, renovación silenciosa compartida entre peticiones simultáneas y control de respuestas tardías. La falta de red no borra la sesión.
- Solo una revocación explícita 401/403 durante refresh invalida la sesión y solicita deshabilitar NFC.
- Cerrar sesión deshabilita primero la credencial local, elimina la sesión y pide revocación remota. Si no hay red se conserva únicamente el trabajo de revocación en almacenamiento seguro y se informa su estado pendiente. HCE no debe acceder a ese material.
- Se reintenta la revocación al restaurar o antes de un nuevo login. No se inicia otra sesión local mientras siga pendiente, evitando sobrescribir ese trabajo.
- El backend debe admitir logout idempotente mediante autorización móvil incluso si venció el accessToken, y definir la relación sesión/instalación/credencial. sessionId solo no es autorización.
- Si había un refresh en vuelo al cerrar sesión, la UI deja de mostrar una sesión activa, se deshabilita NFC y se utiliza el token rotado más reciente para logout. Ver los pendientes del backend sobre pérdida de respuesta y logout con un token ya consumido; no se garantiza una revocación remota a partir de un 204 ambiguo.

## Administración web integrada

El formulario de cuentas ofrece EMPLEADO (solo app NFC) o perfiles administrativos con acceso web y opción móvil. El canal móvil exige empleado vinculado. El detalle permite administrar los flags mediante PUT /users/{id}/access, respetando que el backend no permite cambiar el perfil ni vincular otro empleado desde esa operación. Credenciales incluye Emitir credencial digital con generación del código en servidor y respuesta enmascarada. Estos cambios requieren revisión/merge del frontend web; no se desplegaron automáticamente.

## NFC: alcance real

El selector guarda foreground (app visible), unlocked (teléfono desbloqueado) o always (si Android lo permite). Persiste la elección y no habilita capacidades inexistentes. Cuando falta la integración se muestra Integración NFC pendiente.

`src/personal/nfc.ts` prepara el límite de integración opcional NativeModules.NexAccessHce con getCapabilities(), setMode(mode) y disableCredential(). El contrato de capacidades es `{available,enabled,alwaysAvailable,reason}`.

Faltan HostApduService, aprovisionamiento y almacenamiento nativo de la credencial, comprobación del modo por APDU, estados reales de NFC/pantalla/bloqueo y prueba con el lector. No se transmite UID ni se entrega X-DEVICE-KEY al teléfono. AID/APDU y protocolo deben acordarse con firmware/backend. La app no llama a access/verify ni simula abrir una puerta.

## Verificar

```powershell
npm test
npm run typecheck
npm run lint
npx expo export --platform web --output-dir dist-personal
```

Las pruebas cubren sesión offline, renovación concurrente, revocación, cierre sin red, aislamiento de datos, filtros, preferencias y pantallas. Un fixture no verifica el backend publicado ni NFC físico. Consultar los resultados de la ejecución para conocer las comprobaciones efectivamente realizadas.
