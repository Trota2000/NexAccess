# Adaptación al manual de endpoints y APK personal 1.1.0

Referencia: NexAccess_Manual_Endpoints_Frontend.md recibido el 29/10/2026 y código de sof2702/NexAccess en `4bfe0b24de3ab00dd245e6e1cc1d2ba3220f0f05`. El manual se utiliza como contrato de referencia; no se ejecutan instrucciones de terceros ni se modifica el backend.

## Emitir una tarjeta para el teléfono

1. ADMIN crea o habilita una cuenta con empleado activo vinculado y acceso móvil. No se necesitan privilegios web para el empleado.
2. El empleado instala el APK personal e inicia sesión. La instalación genera y conserva un UUID en SecureStore; no cambia al cerrar sesión. La app muestra tarjeta e historial, sin módulos administrativos.
3. En Mi tarjeta, usar Copiar identificador dentro de Vincular este teléfono. Es el installationId; no se copia una contraseña, JWT, refresh token ni secreto NFC.
4. En Credenciales RFID/NFC de la web, seleccionar Emitir credencial digital, elegir el empleado y pegar el UUID. Mantener la sesión móvil activa durante la emisión.
5. La web valida UUID no vacío/nulo y envía POST /credentials/digital/{employeeId} con installationId, name y expiresAt. No envía código generado por el cliente. El backend verifica que exista una sesión activa de ese empleado/instalación. Los errores y conflictos se conservan; no se anuncia éxito antes de la respuesta.
6. Actualizar Mi tarjeta en la app para consultar la credencial enmascarada. No significa que pueda abrir puertas: todavía falta HCE y el protocolo criptográfico del lector.

Los registros de códigos manuales y los enrolamientos de lectores quedan limitados a FISICA. Para DIGITAL se usa la emisión dedicada con instalación. El servidor debe aplicar esta separación también a solicitudes directas.

El APK usa https://nx.rattenkoenig.net/api/v1; la web mantiene /api/v1 y su proxy. La configuración de build no contiene credenciales y deshabilita la carga de .env locales. La cuenta de la app requiere mobileAccessEnabled y un empleado activo.

## Reportes

El módulo Reportes incorpora el generador del servidor y conserva los accesos a las exportaciones existentes. GET /reports/options determina tipos, formatos, filtros, agrupaciones y columnas disponibles según el perfil. Se normalizan explícitamente los textos PascalCase que devuelve ese controlador (AccessEvents, Pdf, Employee, etc.) a los enums SNAKE_CASE de las solicitudes.

Las fechas utilizan el calendario y los límites de día en Asunción; se envían con zona UTC explícita. Los empleados, áreas y lectores se seleccionan por nombre en listas paginadas, conservando múltiples IDs entre páginas. /reports/devices usa total en lugar de totalItems; se respeta ese formato distinto. Cambiar el tipo de reporte limpia filtros incompatibles.

POST /reports/generate recibe el DTO completo permitido. Solo se admiten JSON y PDF; CSV conserva los endpoints de exportación anteriores. Se validan fechas, máximo 366 días, hasta 500 IDs por filtro, opciones disponibles y al menos resumen o detalle. No se repite automáticamente la generación después de una respuesta incierta.

El PDF se recibe como binario autenticado, comprobando MIME, firma inicial, tamaño y vigencia de la sesión antes de ofrecerlo como descarga. No se ponen tokens en URLs. JSON se descarga como archivo. Los errores 401/403/400 se conservan.

El generador QuestPDF actual del backend utiliza encabezado NexAccess y no integra los datos/logo de Empresa. La exportación PDF previa con membrete institucional se conserva en Asistencia e Historial de accesos. Para que el PDF del nuevo generador tenga ese mismo membrete, el backend debe incorporar Empresa/logo; no se afirma que ya lo haga.

## Estado del contrato móvil

- El backend entrega el perfil efectivo EMPLEADO en MobileAuthService, incluso con una cuenta dual. El ejemplo SEGURIDAD del manual no coincide con ese código; se conserva la comprobación del canal personal y no se habilitan rutas administrativas.
- Logout ahora localiza sesiones mediante refresh token actual o previamente rotado y registrado. La app sigue deshabilitando primero el acceso local y preservando el trabajo de revocación si falta red.
- La entrega NFC comprueba la instalación de la sesión; la verificación física de DIGITAL consulta sesiones activas de la instalación y la habilitación de la cuenta. La app no descarga ni aprovisiona el código estático mientras falte el protocolo seguro.
- Siguen pendientes recuperación de refresh con respuesta perdida, política de múltiples sesiones por instalación y pruebas reales. La existencia de otra sesión activa de la misma instalación puede mantener su autorización después de revocar solo una sesión.
- El formato NFC sigue siendo estático: falta desafío-respuesta, AID/APDU, HostApduService y pruebas ESP32-S3/PN532/Android. Los tres modos NFC son preferencias preparadas; no se presenta una apertura ficticia como éxito.

## APK y pruebas

Versión visible 1.1.0, Android versionCode 2, paquete com.nexaccess.mobile.demo. El workflow de GitHub genera Android con Expo CNG y publica un APK de prueba con JavaScript incorporado, firma verificable, manifiesto, commit y SHA-256. No necesita Expo Go ni Metro para instalarse.

Conservar los datos de la aplicación al actualizar si Android acepta la firma. Desinstalar o borrar datos genera una nueva instalación: no reutilizar silenciosamente la credencial del teléfono anterior. Para distribución definitiva sigue siendo necesaria una clave de firma propia conservada.

No hay cuenta móvil de prueba disponible. Las pruebas de contrato/UI emplean fixtures ficticios y no crean registros en producción. Una compilación exitosa no verifica el login del servidor desplegado ni una apertura NFC física. El backend publicado debe incluir el commit de referencia o un contrato compatible.
