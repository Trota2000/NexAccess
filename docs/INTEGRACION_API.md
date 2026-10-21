# Integración real de NexAccess

Implementada el 21 de octubre de 2026 sobre `Trota2000/NexAccess` (`a6f06b2`). Contrato revisado: [`sof2702/NexAccess@81511f3`](https://github.com/sof2702/NexAccess/tree/81511f3e3680b3ef6c45ac3b3a85a3431df2b3b5). Se revisaron controladores, DTO, enumeraciones, validaciones y servicios; la documentación OpenAPI del servicio público devolvió 404. Esto no confirma qué commit está ejecutando el servidor.

## Qué está conectado

`web/` y `mobile/` abren por defecto un espacio de trabajo conectado a `/api/v1`. Comparten login, transporte, formularios, autorizaciones y pantallas nativas. El cliente está en `integration/source/`; `node integration/sync.cjs` copia su código a las dos aplicaciones independientes. `node integration/sync.cjs --check` detecta diferencias. No hay nuevas dependencias nativas.

Las pantallas anteriores se conservan en `/demo`. Sus datos, cuentas, preferencias y notificaciones siguen siendo ficticios y no se envían a la API. Al entrar en la demo se descarta la sesión real. El modo conectado nunca usa los almacenes de la demo para representar resultados del servidor.

El login no tiene registro ni selector de privilegios. Solicita `POST /auth/login`, valida el perfil con `GET /auth/me` y acepta únicamente ADMIN, SEGURIDAD y RRHH. Las cuentas deben existir en el backend; `admin / NexAccess2026!` pertenece a la demo y no se intenta contra producción.

## Ejecutar la web local con el servicio publicado

Se necesita Node 24 con npm y Git. Desde el repositorio clonado, terminal 1:

```powershell
cd web
npm ci
npx expo start --go --web --localhost --port 8091
```

Terminal 2, desde la raíz del repositorio:

```powershell
node integration/dev-gateway.cjs
```

Abrí **http://localhost:8082**. El gateway entrega Expo y reenvía `/api/*` a `https://nexaccess.rattenkoenig.net`, de modo que el navegador usa un solo origen. Está limitado a loopback y no registra contraseñas, tokens ni claves de dispositivos. Expo sigue ejecutándose normalmente y el QR sigue disponible.

Para cambiar de backend, configurá `API_ORIGIN` en la terminal del gateway. Solo admite HTTPS remoto y HTTP para localhost. Para cambiar el puerto de Expo, configurá `EXPO_ORIGIN=http://localhost:PUERTO`. El frontend acepta `EXPO_PUBLIC_API_URL=/api/v1` (predeterminado web) o una URL HTTPS terminada en `/api/v1`.

No abras la web directamente en 8091 para usar la API relativa: ese puerto corresponde a Metro, no al gateway. Usar directamente una API de otro origen requiere CORS en el backend; en la revisión, el preflight OPTIONS devolvió 405 sin `Access-Control-Allow-Origin`.

## Ejecutar el móvil

```powershell
cd mobile
npm ci
npx expo start --go
```

Escaneá el QR con Expo Go compatible con el SDK del proyecto. El móvil usa por defecto `https://nexaccess.rattenkoenig.net/api/v1`. Podés copiar `.env.example` a `.env` para cambiar esa URL pública. El navegador, incluso si se inicia desde `mobile/`, usa por defecto `/api/v1` y necesita un gateway igual al anterior (`EXPO_ORIGIN` debe apuntar al puerto de ese Metro).

No se almacenan JWT, contraseñas ni claves del dispositivo en AsyncStorage, localStorage, archivos ni parámetros de URL. La sesión vive en memoria, se elimina al recargar/salir y caduca según `expiresAt` o una respuesta 401. La API actual no ofrece refresh ni revocación explícita de sesión; cerrar el frontend elimina su copia del token.

## Correspondencia de endpoints

Todas las rutas de esta tabla son relativas a `/api/v1`. A = ADMIN, S = SEGURIDAD, R = RRHH. Las restricciones del servidor siguen siendo la autoridad.

| Endpoint | Implementación conectada | Perfiles |
|---|---|---|
| `GET /health` | Comprobar conexión sin sesión | Público |
| `POST /auth/login`, `GET /auth/me` | Login y validación de cuenta | Operadores |
| `GET /employees`, `GET /employees/{id}` | Lista paginada, búsqueda, estado, detalle actualizado | A/S/R |
| `POST /employees`, `PUT /employees/{id}`, `PATCH /employees/{id}/status` | Alta, edición y actividad | A/R |
| `GET /employees/{id}/roles` | Detalle de roles físicos actualizado | A/S/R |
| `POST` y `DELETE /employees/{id}/roles/{roleId}` | Asignar y retirar rol físico con confirmación | A/S |
| `GET /roles`, `GET /roles/{id}` | Lista no paginada y detalle | A/S/R |
| `POST /roles`, `PUT /roles/{id}` | Alta, edición y actividad dentro del PUT | A/S |
| `GET /areas`, `GET /areas/{id}` | Lista paginada, búsqueda, estado y detalle | A/S/R |
| `POST /areas`, `PUT /areas/{id}` | Alta, edición, restricción y actividad dentro del PUT | A/S |
| `GET /credentials`, `GET /credentials/{id}` | Lista por empleado/actividad y detalle | A/S |
| `POST /credentials` | Alta con `codigo_credencial`, `employeeId`, `FISICA`/`DIGITAL` | A/S |
| `PATCH /credentials/{id}/status`, `POST /credentials/{id}/revoke` | Actividad y revocación definitiva con motivo | A/S |
| `GET /devices`, `GET /devices/{id}` | Lista por función, área y actividad; detalle | A/S |
| `POST /devices`, `PUT /devices/{id}`, `PATCH /devices/{id}/status` | Alta, edición sin cambiar código, actividad | A/S |
| `POST /devices/{id}/rotate-key` | Confirmación y visualización transitoria de clave | A/S |
| `GET /devices/{id}/events` | Historial contextual desde el detalle del lector | A/S |
| `GET /access-permissions`, `GET /access-permissions/{id}` | Lista por rol, área, actividad y detalle | A/S |
| `POST /access-permissions`, `PUT /access-permissions/{id}`, `PATCH /access-permissions/{id}/status` | Rol/área, días, horas y actividad | A/S |
| `GET /access-events`, `GET /access-events/export` | Lista y CSV del servidor con filtros aplicados | A/S |
| `GET /attendance`, `POST /attendance` | Marcaciones y alta manual con motivo | A/R |
| `GET /attendance/report`, `GET /attendance/export` | Resumen diario y CSV del servidor con rango | A/R |
| `GET /users`, `POST /users`, `PATCH /users/{id}/status`, `PUT /users/{id}/password` | Cuentas administrativas, actividad y contraseña | A |
| `GET /audit` | Auditoría real, paginada y filtrada | A |
| `POST /enrollments`, `GET /enrollments/{id}`, `POST /enrollments/{id}/cancel` | Iniciar, consultar por ID, actualizar estado y cancelar | A/S |
| `POST /access/verify`, `GET /devices/{codigo}/commands`, `POST /enrollments/{id}/card` | **Exclusivos del dispositivo**, fuera del frontend | X-DEVICE-KEY |

La API no tiene endpoints generales de eliminación. No se agregaron botones que finjan borrar registros. La única retirada implementada es el vínculo empleado/rol, que sí tiene DELETE.

## Reglas para no mezclar contratos

- IDs reales numéricos positivos y seguros para JavaScript; no se generan `EMP-*`, `CR-*` ni IDs temporales en modo conectado. Números fuera del rango seguro se rechazan; si fueran necesarios, el backend debe enviar IDs como cadenas.
- DTO explícitos: se eliminan campos visuales antes de enviar. No se envían departamentos, salarios, estados BLOQUEADA/PERDIDA ni permisos individuales inexistentes.
- Las credenciales se muestran enmascaradas. El tipo es `FISICA` o `DIGITAL`; la actividad y el estado derivado no son equivalentes. La UI bloquea reactivación de una credencial revocada y deja la regla definitiva al servidor.
- Los permisos usan `roleId`, `areaId`, siete booleanos de día, `startTime`, `endTime`, `isActive`. Se admiten franjas nocturnas. El servidor evalúa el día calendario actual, incluso después de medianoche: no se promete semántica de turno del día anterior. La UI solicita ambas horas o ambas vacías para evitar límites implícitos.
- Las fechas de filtros y marcaciones requieren ISO 8601 con zona; se convierten a UTC. Las listas muestran fechas en Asunción y el reporte conserva el día calculado por el servidor. No hay salarios, tardanzas ni cálculos horarios inventados.
- `isActive` de un dispositivo no se presenta como conectado. Se conserva `lastConnectionAt`, incluso si es nulo.
- Las listas paginadas usan `items/page/pageSize/totalItems/totalPages`; roles y cuentas son listas completas. Los selectores de referencias tienen paginación y búsqueda cuando la API la admite; no se corta silenciosamente en la primera página.
- El CSV se solicita autenticado al servidor, con filtros **aplicados** y sin paginación. Requiere rango; el backend aplica su máximo de días. Web descarga un archivo; el móvil comparte el CSV **como texto**, sin afirmar que genera un archivo nativo.
- Escrituras confirmadas por el operador, sin actualización optimista ni reintentos automáticos. Un fallo de red/timeout o un error 5xx puede ocurrir después de guardar: se bloquean nuevas escrituras hasta actualizar y revisar la lista. En enrolamientos sin ID recuperable hace falta comprobar el resultado con el administrador. Esto reduce duplicados, pero no sustituye idempotencia y transacciones del backend.
- Antes de CSV/reporte se consulta el conteo con los mismos filtros y se rechazan rangos de más de 50.000 registros. No es una instantánea transaccional: si los datos cambian entre conteo y exportación, sigue siendo necesario que el backend elimine el truncamiento silencioso.
- No hay edición de rol del sistema ni vínculo usuario/empleado después del alta porque la API no los permite. Cambiar contraseña propia no invalida otros JWT del servidor actual.

## Publicar el portal junto al backend

El repositorio de backend ya construye `ghcr.io/sof2702/nexaccess:dev` al hacer push a su `main` y ejecuta `/opt/nexaccess/scripts/deploy-ci.sh` en un runner privado. Ese script y la configuración efectiva del servidor no están en el repositorio revisado. Un push a Trota2000/NexAccess no despliega por sí solo esta web en ese servicio.

Se incluye un contenedor independiente:

```powershell
docker build -f deploy/Dockerfile -t nexaccess-frontend .
docker run --rm -p 8082:80 -e API_ORIGIN=https://nexaccess.rattenkoenig.net nexaccess-frontend
```

El contenedor sirve la web compilada y reenvía `/api/*` al backend. En el servidor, el proxy HTTPS público debe dirigir `/api/*` a la API y las demás rutas al contenedor frontend (o todo a este contenedor, que ya reenvía la API). No apuntar `API_ORIGIN` al mismo dominio si ese dominio devuelve al mismo contenedor: produciría un bucle; usar el origen interno del backend en esa topología. Si el origen es HTTP interno, la red debe ser privada. `API_ORIGIN` es configuración de Nginx, nunca un secreto del bundle.

No se modificó `sof2702/NexAccess/main`, no se tocaron datos reales ni se ejecutó despliegue. La imagen y el cambio de proxy deben revisarse y probarse en el servidor antes de activar el dominio. El Dockerfile está preparado, pero su ejecución requiere Docker y no se pudo verificar en esta computadora.

Para CI se incluye un workflow de frontend que sincroniza/verifica clientes, prueba las dos apps y exporta web. No activa el despliegue del backend. Para publicación automática del frontend falta acordar en el equipo el runner, registro de imagen, red privada y destino del proxy; esos valores no se inventaron.

## Verificar con datos sintéticos

El fixture es solo una herramienta de prueba y no una implementación alternativa del backend:

```powershell
# Desde la raíz; las dos apps deben tener npm ci completado.
node integration/sync.cjs --check
node --test integration/tests/api.test.cjs
node integration/fixture.cjs
```

En otra terminal del gateway, usá `$env:API_ORIGIN='http://127.0.0.1:9060'` antes de ejecutar `node integration/dev-gateway.cjs`. Mantené Expo en 8091. Cuentas sintéticas: `fixture.admin`, `fixture.seguridad`, `fixture.rrhh`, contraseña `LocalOnlyTesting!`. Solo existen en localhost:9060 y no sirven en producción. La verificación autenticada real sigue pendiente porque no se dispone de una cuenta de pruebas.
