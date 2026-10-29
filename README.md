# NexAccess

Frontend web y app móvil personal, con React Native, TypeScript, Expo SDK 57 y Expo Router. Utilizan la API de [sof2702/NexAccess](https://github.com/sof2702/NexAccess). La web administra el control de accesos y la asistencia; la app del empleado muestra su tarjeta e historial propio.

| Aplicación | Carpeta | Uso |
|---|---|---|
| Web | [`web/`](web/) | Empleados, credenciales, áreas, roles físicos, lectores, permisos, historial, asistencia, cuentas y auditoría |
| Móvil | [`mobile/`](mobile/) | Login del empleado, tarjeta digital, historial propio, cierre de sesión y tema claro/oscuro; integración NFC física pendiente |

Cada aplicación instala sus dependencias por separado; la raíz no requiere npm install. Se verificó con Node 24.19.0.

## Ejecutar la web con el servicio publicado

En PowerShell:

```powershell
git clone https://github.com/Trota2000/NexAccess.git
cd NexAccess
git switch main
cd web
npm ci
npm run web:api
```

Abrí **http://localhost:8091/login**. Expo incluye el proxy de `/api/v1`, por lo que este comando alcanza: no hace falta una segunda terminal. Al actualizar desde una versión anterior, detené Expo con Ctrl+C y volvé a iniciarlo para cargar `metro.config.js`.

El gateway separado `npm run api:gateway` en el puerto 8082 sigue disponible como alternativa. El login web requiere una cuenta real con acceso al panel habilitado; no hay registro público ni cuenta real preconfigurada.

## Ejecutar el móvil

```powershell
cd mobile
npm ci
npx expo start --go
```

Si estabas dentro de `web`, usá `cd ../mobile`. El teléfono debe poder alcanzar la API HTTPS y usar Expo Go compatible con SDK 57. Para probar `mobile/` en navegador: `npm run web:api`, ejecutando una plantilla por vez. El proxy también está incluido en su configuración de Metro.

La app personal requiere un empleado activo y acceso móvil habilitado. Ver la [guía vigente de la app personal](docs/APP_MOVIL_PERSONAL.md) y la [revisión del contrato Android](docs/REVISION_MANUAL_ANDROID.md). Los módulos móviles anteriores permanecen en código, con sus rutas administrativas y demo deshabilitadas para empleados. Expo Go permite revisar las pantallas; no abre puertas mediante NFC.

Las URLs públicas se configuran con `.env.example`. La app personal admite `EXPO_PUBLIC_PERSONAL_API_URL`. Nunca pongas contraseñas, tokens o claves del dispositivo en variables EXPO_PUBLIC: forman parte del bundle.

## Integración incluida

- Web: JWT en memoria y perfil comprobado con `/auth/me`. Móvil: login personal, JWT en memoria y refresh token en SecureStore nativo para restaurar la sesión; no se guarda la contraseña.
- Formularios con DTO reales, confirmación antes de escribir y recarga del servidor al guardar.
- Validaciones compartidas con errores por campo para documentos, teléfonos, correos, nombres, RUC y formatos existentes. Ver [reglas y pendientes de backend](docs/VALIDACION_FORMULARIOS.md).
- Listas y selectores paginados, filtros compatibles y perfiles ADMIN/SEGURIDAD/RRHH separados de roles físicos.
- Estados de credenciales del servidor, revocación definitiva, enrolamiento y claves transitorias de lectores.
- Marcaciones manuales con motivo, reporte diario, CSV del backend y auditoría de solo lectura.
- Proxy local, Docker/Nginx y CI. Los cambios de web/integración en `main` activan Build → GHCR → Deploy mediante el runner del servidor; el APK requiere una compilación e instalación independiente.

![Historial conectado con datos sintéticos](docs/screenshots/api-historial-escritorio.jpg)

## Documentación y límites

- [Endpoints, ejecución e integración](docs/INTEGRACION_API.md).
- [Pendientes de backend, base de datos y despliegue](docs/PENDIENTES_SISTEMA.md).
- [Verificación de la integración](docs/VERIFICACION_API.md).
- [Validaciones de formularios y verificación](docs/VALIDACION_FORMULARIOS.md).
- [App móvil personal](docs/APP_MOVIL_PERSONAL.md) y [pendientes de integración Android/NFC](docs/REVISION_MANUAL_ANDROID.md).
- [Colaboración](CONTRIBUTING.md).

Se verificaron health, login web real y consulta inicial de empleados desde el navegador en las revisiones anteriores. Las escrituras y las nuevas validaciones se probaron con fixtures sintéticos locales, sin modificar datos de negocio de producción. No existe un entorno de pruebas separado ni cuenta móvil de prueba disponible. El despliegue web automatizado está operativo; quedan pendientes la aceptación de los CRUD con datos autorizados, el login móvil contra el servicio publicado y las pruebas de hardware NFC/Android.

El backend revisado incluye perfil, credenciales e historial personales bajo `/me`; HCE/APDU y revocación física digital requieren completar la integración documentada. Notificaciones y gestión de alertas no se presuponen disponibles. La consistencia entre varios operadores/dispositivos requiere también transacciones, concurrencia e idempotencia del backend; el frontend por sí solo no puede garantizarla.

## Demostraciones originales

En la web, elegí **Abrir demostración con datos ficticios** en el login: `admin` / `NexAccess2026!`. Estas cuentas no se envían a la API real. La demo móvil anterior permanece como código histórico fuera de la navegación actual; para revisar la app personal sin cuenta real, usá el fixture descrito en su guía.

Se conservan las [guías web anteriores](web/README.md), la [revisión de la maqueta](web/REVISION_REQUISITOS.md) y la [propuesta móvil](mobile/INTEGRACION.md). Sus rutas históricas outputs/ y work/ corresponden al entorno de desarrollo original.

Documentación del proyecto: [juliobernal92/NexAccess_docs](https://github.com/juliobernal92/NexAccess_docs). No aplicar su SQL original sobre una base existente sin revisar las migraciones del backend.
