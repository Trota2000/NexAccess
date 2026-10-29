# Revisión del manual Android y adaptación del frontend

Fecha: 29/10/2026. Manual recibido: NexAccess, integración Android v1.0 MVP. Código revisado: [sof2702/NexAccess, f4dc357](https://github.com/sof2702/NexAccess/tree/f4dc357d2bd3108409636a292cdce124a60504c3).

## Resultado

El backend aporta la base para integrar login, perfil, tarjetas e historial personales. No cumple todavía todo el recorrido de una tarjeta NFC ni todas las condiciones de revocación y recuperación de sesión. El manual reconoce que HCE/APDU, seguridad contra repetición y pruebas con PN532 están pendientes.

La revisión es estática sobre el código indicado. No se modificó el repositorio del backend, no se crearon cuentas reales y no se ejecutaron las pruebas de backend que el manual enumera. No hay cuenta de pruebas móvil disponible; no se verificó un login autenticado contra producción.

## Matriz frente a los requisitos

| Requisito | Estado observado |
|---|---|
| Login móvil independiente y cuenta dual | Implementado: MobileAuthService acepta cuentas habilitadas para móvil y devuelve perfil efectivo EMPLEADO, aunque el rol web sea administrativo |
| Instalación identificable | Implementado con installationId UUID obligatorio; el frontend ahora lo genera con Expo Crypto y lo conserva de forma segura |
| Sesión sin caducidad por inactividad | MobileSession no contiene vencimiento absoluto/inactivo. JWT sí vence y refresh rota; falta resolver la pérdida de respuesta de refresh para garantizar continuidad |
| Perfil e historial exclusivamente propios | MyProfileService deriva el empleado de la cuenta y filtra en servidor; el frontend valida también la identidad recibida |
| Listado de tarjetas enmascaradas | Implementado con MyCredentialResponse; frontend compatible |
| Cierre de sesión API | Implementado e idempotente para el refresh token actualmente registrado; hay un caso pendiente con tokens ya rotados |
| Logout/deshabilitar móvil bloquea el código NFC ante el lector | No implementado: access/verify no comprueba sesión móvil/canal de la credencial digital |
| Modos NFC: primer plano, desbloqueado y siempre que se soporte | Frontend guarda la preferencia; falta HostApduService y aplicación efectiva de las reglas en Android |
| Apertura NFC con ESP32-S3 + PN532 | Pendiente AID, APDU, intercambio seguro, integración de firmware y prueba física |
| Modo oscuro y estilo web | Corresponde al frontend; se conserva sin cambiar a Kotlin/Compose |
| Canales de cuenta configurables desde web | Crear cuentas web/NFC/duales y activar móvil está disponible. Cambiar el perfil/vínculo de una cuenta existente no está disponible |

## Diferencias concretas de contrato corregidas en frontend

1. Login: `{username,password,installationId}`. Antes el cliente solo enviaba usuario y contraseña.
2. Refresh/logout: el DTO actual recibe exclusivamente `{refreshToken}`; se eliminó sessionId de las solicitudes, conservándolo en los metadatos de respuesta.
3. Perfil: el backend devuelve `{userId,username,role,employeeId,fullName,isActive}`. No devuelve id de empleado bajo la clave id, documento, nombres/apellidos separados. La tarjeta utiliza el nombre y número de empleado reales; no inventa un documento.
4. Identidad personal: comprobar userId y employeeId contra la sesión, además del nombre de usuario. El historial sigue descartando eventos ajenos.
5. Cuentas web: creación con ambos flags, perfil EMPLEADO para solo NFC y PUT /users/{id}/access para las actualizaciones. El frontend no envía PATCH ni role en esa actualización porque no pertenecen al DTO implementado.
6. Emisión digital: POST /credentials/digital/{employeeId}, cuerpo name/expiresAt, código generado por backend y respuesta enmascarada. No se envía un código inventado por el navegador.
7. El fixture local fue actualizado para exigir installationId y devolver los DTOs actuales; sigue siendo una herramienta de prueba, no un backend alternativo de producción.

## Pendientes para el compañero de backend

### P1 — Vincular autorización física digital con sesión/instalación

[AccessService](https://github.com/sof2702/NexAccess/blob/f4dc357d2bd3108409636a292cdce124a60504c3/src/NexAccess.Application/Services/AccessService.cs#L117) busca el código y comprueba credencial, empleado y permisos físicos, pero no la cuenta, mobileAccessEnabled ni una sesión/instalación. Credential tampoco tiene ese vínculo. Logout solo revoca MobileSession.

Consecuencia por revisión de código: un código estático ya obtenido puede seguir siendo aceptado por un lector después de logout o de retirar el acceso móvil, mientras la credencial y el empleado continúen activos. El bloqueo local en Android no basta frente a una copia del código.

Acción: acordar el protocolo NFC seguro y su relación con sesión/instalación. Revocar el derecho digital de esa instalación sin desactivar tarjetas físicas ni otros teléfonos. Integrarlo en la validación del lector antes de probar puertas reales.

### P1 — Recuperar una renovación cuya respuesta se pierde

[RefreshAsync](https://github.com/sof2702/NexAccess/blob/f4dc357d2bd3108409636a292cdce124a60504c3/src/NexAccess.Application/Services/MobileAuthService.cs#L223) consume el refresh anterior antes de entregar la respuesta. Si se corta la conexión después de la rotación, Android conserva el token anterior y una renovación posterior obtiene INVALID_REFRESH_TOKEN.

Acción: definir recuperación/idempotencia autenticada por instalación para ese caso, sin admitir reutilización ilimitada. La app ya evita renovaciones simultáneas, pero no puede recuperar unilateralmente un secreto nuevo que nunca recibió. La continuidad de sesión ante cualquier corte de red no está garantizada por la implementación actual.

### P1 — Logout con un refresh que ya fue rotado

[LogoutAsync](https://github.com/sof2702/NexAccess/blob/f4dc357d2bd3108409636a292cdce124a60504c3/src/NexAccess.Application/Services/MobileAuthService.cs#L270) busca solo el hash vigente. Si el token fue rotado, devuelve 204 sin encontrar/revocar necesariamente la sesión que lo emitió, aunque existe el registro UsedMobileRefreshToken.

Acción: acordar una revocación autenticada que pueda localizar correctamente la familia/sesión cuando corresponda, incluyendo la carrera refresh/logout y cierre offline. El frontend ahora deshabilita primero NFC, oculta la sesión local y, si una renovación ya estaba en vuelo, espera su resultado para revocar con el token más reciente. Esto reduce la carrera local; no sustituye la corrección remota cuando la respuesta se pierde.

### P2 — Administración completa de cuentas existentes

UpdateUserAccessRequest contiene solo los dos flags. UserService rechaza web=false con roles ADMIN/SEGURIDAD/RRHH, y web=true con EMPLEADO. No se encontró un endpoint para cambiar el perfil o vincular un empleado a una cuenta ya existente.

Acción: si se necesita convertir una cuenta web existente a solo NFC o habilitar web a una cuenta EMPLEADO, agregar un cambio administrativo validado de perfil/canales/vínculo. Debe ser atómico, auditable y preservar el último administrador web. Hasta entonces la UI permite únicamente las combinaciones que el backend admite; no simula que puede cambiar el perfil.

### P2 — Corregir el ejemplo de entrega NFC del manual

El manual dice credentialCode. [MyNfcCredentialResponse](https://github.com/sof2702/NexAccess/blob/f4dc357d2bd3108409636a292cdce124a60504c3/src/NexAccess.Application/DTOs/Me/MyNfcCredentialResponse.cs#L4) declara Credential, que se serializa como `credential`. Corregir el manual/OpenAPI o acordar un cambio de DTO antes de aprovisionar Android. El frontend documenta y modela el nombre real; no muestra ni persiste el código estático en la tarjeta visual.

### P2 — Completar políticas y pruebas

- Acordar cambio de contraseña, reemplazo de teléfono y cantidad de sesiones activas por instalación. Login actualmente crea una nueva sesión; el índice de instalación no es único.
- Revisar auditoría de reutilización: actualmente registra el refresh consumido, sin revocar automáticamente su familia. Documentar la política elegida y su recuperación segura.
- Los tokens web/móvil comparten audiencia y se distinguen mediante channel/role/sid validados. La separación observada existe, pero difiere de la propuesta de audiencias distintas; documentar la decisión.
- No se encontraron pruebas específicas de MobileAuthService/MyProfileService o /auth/mobile/* en tests del commit revisado. El manual reconoce que faltan pruebas móviles sobre el entorno desplegado. Los conteos generales informados por el compañero no sustituyen esos casos.
- Probar revocación y cambio de permisos con tokens ya emitidos, operaciones simultáneas, pérdida de respuesta, dos empleados distintos y dos instalaciones. Dar una cuenta de prueba vinculada con mobileAccessEnabled=true y una credencial DIGITAL propia, en un entorno aislado.

## Límites y siguiente paso

Verificación frontend ejecutada: 76 pruebas móviles, 32 web y 56 de integración aprobadas; TypeScript, ESLint, sincronización de fuentes y exportación Expo web de ambos proyectos correctos. Se revisaron login, tarjeta, historial, calendario y tema en navegador a tamaño de teléfono con el fixture ficticio local. Se intentó Expo Go mediante `npx expo start --go`; no hubo teléfono ni simulador conectado. No se probó HCE ni un APK físico.

No hace falta reescribir React Native/Expo como Kotlin/Compose: el manual presenta esa arquitectura como recomendación. El servicio HCE sí requiere código Android nativo, incorporable al proyecto Expo una vez acordado el protocolo.

La sincronización offline de políticas de lectores mencionada en el manual es un trabajo adicional de backend/firmware; no se incorpora como un nuevo módulo móvil ni se supone disponible en el lector actual.

Primera prueba con el backend: login → perfil → listado de tarjetas → historial/fechas → refresh → logout → revocación. Después, con el protocolo y los pendientes P1 resueltos, prueba NFC física y de los tres modos en Android. El frontend mantiene el aviso de integración NFC pendiente.
