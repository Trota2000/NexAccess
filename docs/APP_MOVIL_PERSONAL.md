# NexAccess � Frontend personal Android

La app m�vil tiene login del empleado, Mi tarjeta, Historial propio, cierre de sesi�n y tema claro/oscuro. La web administrativa no cambia. Los m�dulos m�viles anteriores se conservan en c�digo, pero sus rutas est�n fuera de la navegaci�n protegida de empleados.

## Ejecutar con backend real

```powershell
cd mobile
npm ci
npx expo start --go
```

Usar Expo Go compatible con SDK 57 para revisar las pantallas. La URL nativa predeterminada es `https://nexaccess.rattenkoenig.net/api/v1`. Se puede cambiar mediante `EXPO_PUBLIC_PERSONAL_API_URL` en `.env.local`; reiniciar Expo despu�s. No poner secretos en variables EXPO_PUBLIC.

El login personal todav�a depende de los nuevos endpoints del backend. No se reemplaza con el login administrativo. La apertura real NFC/HCE requiere un m�dulo Android y una nueva compilaci�n; no est� implementada en esta entrega.

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

Abrir http://localhost:8097 o presionar w. Usuario ficticio: `empleado.demo`. Contrase�a ficticia: `NexAccess2026!`. El fixture solo escucha en 127.0.0.1, contiene datos inventados, no abre puertas y no forma parte del APK. No ingresar cuentas reales en este fixture.

En el navegador los secretos se guardan �nicamente en memoria; la persistencia segura de sesi�n corresponde a Android/iOS. El banner de vista de prueba solo se muestra en desarrollo. No existe fallback autom�tico a datos ficticios.

El fixture localhost no es accesible desde un tel�fono f�sico. Para probar con Expo Go usar una API HTTPS de pruebas accesible desde el tel�fono. Quitar el archivo .env.local de prueba antes de volver al servidor real.

## Contrato esperado (pendiente del backend)

| M�todo | Ruta relativa a /api/v1 | Datos |
|---|---|---|
| POST | /auth/mobile/login | username, password |
| POST | /auth/mobile/refresh | refreshToken, sessionId |
| POST | /auth/mobile/logout | refreshToken, sessionId; 204 idempotente |
| GET | /me | Perfil propio |
| GET | /me/credentials | Lista propia paginada y c�digo enmascarado |
| GET | /me/access-events | Lista propia paginada; filtros from, to, result |

Login y refresh: `{accessToken,tokenType:"Bearer",expiresAt,refreshToken,sessionId,user:{id,username,role:"EMPLEADO",employeeId,isActive:true}}`. Refresh conserva sesi�n/cuenta/empleado y rota refreshToken. expiresAt corresponde solo al accessToken: la sesi�n m�vil se renueva sin vencimiento por tiempo/inactividad.

Perfil: `{id,fullName,firstName,lastName,documentNumber,isActive}`; id debe coincidir con employeeId de la sesi�n.

Lista de tarjetas: `{items,page,pageSize,totalItems,totalPages}`. Cada item: `{id,name,type:"DIGITAL"|"FISICA",maskedCode,status:"ACTIVA"|"INACTIVA"|"VENCIDA"|"REVOCADA",issuedAt,expiresAt}`. name/expiresAt admiten null. La pantalla muestra �nicamente tarjetas digitales.

Historial: mismo formato paginado; cada evento contiene `{id,employeeId,occurredAt,result:"AUTORIZADO"|"RECHAZADO",reason,areaName,deviceCode}`. reason/areaName/deviceCode admiten null. Fechas ISO 8601 con zona/UTC. IDs enteros seguros y positivos.

Errores: JSON problem con detail y code. Login 404/405/501 informa que falta habilitar la API m�vil. El cliente nunca env�a employeeId como filtro y descarta perfiles/eventos de otro empleado. El backend debe garantizar el aislamiento, no delegarlo al cliente.

## Sesi�n persistente y cierre

- Expo SecureStore en Android/iOS para secreto de renovaci�n y metadatos m�nimos; no se guarda contrase�a ni JWT de acceso en AsyncStorage. JWT solo en memoria.
- Restauraci�n al reabrir, renovaci�n silenciosa compartida entre peticiones simult�neas y control de respuestas tard�as. La falta de red no borra la sesi�n.
- Solo una revocaci�n expl�cita 401/403 durante refresh invalida la sesi�n y solicita deshabilitar NFC.
- Cerrar sesi�n deshabilita primero la credencial local, elimina la sesi�n y pide revocaci�n remota. Si no hay red se conserva �nicamente el trabajo de revocaci�n en almacenamiento seguro y se informa su estado pendiente. HCE no debe acceder a ese material.
- Se reintenta la revocaci�n al restaurar o antes de un nuevo login. No se inicia otra sesi�n local mientras siga pendiente, evitando sobrescribir ese trabajo.
- El backend debe admitir logout idempotente mediante autorizaci�n m�vil incluso si venci� el accessToken, y definir la relaci�n sesi�n/instalaci�n/credencial. sessionId solo no es autorizaci�n.

## NFC: alcance real

El selector guarda foreground (app visible), unlocked (tel�fono desbloqueado) o always (si Android lo permite). Persiste la elecci�n y no habilita capacidades inexistentes. Cuando falta la integraci�n se muestra Integraci�n NFC pendiente.

`src/personal/nfc.ts` prepara el l�mite de integraci�n opcional NativeModules.NexAccessHce con getCapabilities(), setMode(mode) y disableCredential(). El contrato de capacidades es `{available,enabled,alwaysAvailable,reason}`.

Faltan HostApduService, aprovisionamiento y almacenamiento nativo de la credencial, comprobaci�n del modo por APDU, estados reales de NFC/pantalla/bloqueo y prueba con el lector. No se transmite UID ni se entrega X-DEVICE-KEY al tel�fono. AID/APDU y protocolo deben acordarse con firmware/backend. La app no llama a access/verify ni simula abrir una puerta.

## Verificar

```powershell
npm test
npm run typecheck
npm run lint
npx expo export --platform web --output-dir dist-personal
```

Las pruebas cubren sesi�n offline, renovaci�n concurrente, revocaci�n, cierre sin red, aislamiento de datos, filtros, preferencias y pantallas. Un fixture no verifica el backend publicado ni NFC f�sico. Consultar los resultados de la ejecuci�n para conocer las comprobaciones efectivamente realizadas.
