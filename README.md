# NexAccess

Frontend web y móvil para control de accesos y asistencia, con React Native, TypeScript, Expo SDK 57 y Expo Router. El login predeterminado usa la API de [sof2702/NexAccess](https://github.com/sof2702/NexAccess). Las dos maquetas originales se conservan en `/demo`, con sus datos ficticios separados de la API.

| Aplicación | Carpeta | Uso |
|---|---|---|
| Web | [`web/`](web/) | Empleados, credenciales, áreas, roles físicos, lectores, permisos, historial, asistencia, cuentas y auditoría |
| Móvil | [`mobile/`](mobile/) | Espacio conectado adaptable y Expo Go; maqueta personal de cinco pestañas conservada en `/demo` |

Cada aplicación instala sus dependencias por separado; la raíz no requiere npm install. Se verificó con Node 24.19.0.

## Ejecutar la web con el servicio publicado

En PowerShell:

```powershell
git clone https://github.com/Trota2000/NexAccess.git
cd NexAccess
git switch feature/integracion-api
cd web
npm ci
npm run web:api
```

Abrí **http://localhost:8091/login**. Expo incluye el proxy de `/api/v1`, por lo que este comando alcanza: no hace falta una segunda terminal. Al actualizar desde una versión anterior, detené Expo con Ctrl+C y volvé a iniciarlo para cargar `metro.config.js`.

El gateway separado `npm run api:gateway` en el puerto 8082 sigue disponible como alternativa. El login requiere una cuenta real de operador; no hay registro público ni cuenta real preconfigurada.

## Ejecutar el móvil

```powershell
cd mobile
npm ci
npx expo start --go
```

Si estabas dentro de `web`, usá `cd ../mobile`. El teléfono debe poder alcanzar la API HTTPS y usar Expo Go compatible con SDK 57. Para probar `mobile/` en navegador: `npm run web:api`, ejecutando una plantilla por vez. El proxy también está incluido en su configuración de Metro.

Las URLs públicas se configuran con `.env.example`. Nunca pongas contraseñas, tokens o claves del dispositivo en variables EXPO_PUBLIC: forman parte del bundle.

## Integración incluida

- JWT en memoria, perfil comprobado con `/auth/me`, expiración/401 y cierre de sesión sin persistir secretos.
- Formularios con DTO reales, confirmación antes de escribir y recarga del servidor al guardar.
- Listas y selectores paginados, filtros compatibles y perfiles ADMIN/SEGURIDAD/RRHH separados de roles físicos.
- Estados de credenciales del servidor, revocación definitiva, enrolamiento y claves transitorias de lectores.
- Marcaciones manuales con motivo, reporte diario, CSV del backend y auditoría de solo lectura.
- Proxy local, Docker/Nginx y CI de verificación sin despliegue automático a producción.

![Historial conectado con datos sintéticos](docs/screenshots/api-historial-escritorio.jpg)

## Documentación y límites

- [Endpoints, ejecución e integración](docs/INTEGRACION_API.md).
- [Pendientes de backend, base de datos y despliegue](docs/PENDIENTES_SISTEMA.md).
- [Verificación de la integración](docs/VERIFICACION_API.md).
- [Colaboración](CONTRIBUTING.md).

Se verificaron health, login real y consulta inicial de empleados desde el navegador. Las escrituras se probaron con fixtures sintéticos locales, sin modificar datos de negocio de producción. No existe un entorno de pruebas separado. Quedan pendientes aceptación de los CRUD con datos autorizados, hardware, Expo Go en dispositivo y despliegue del contenedor web.

Autoservicio EMPLEADO, notificaciones y gestión de alertas no tienen endpoints en la API revisada y continúan solo en demo. La consistencia entre varios operadores/dispositivos requiere también transacciones, concurrencia e idempotencia del backend; el frontend por sí solo no puede garantizarla.

## Demostraciones originales

Elegí **Abrir demostración con datos ficticios** en el login. Web: `admin` / `NexAccess2026!`. Móvil: `empleado`, `seguridad`, `rrhh` o `admin`, misma contraseña de demo. Estas cuentas no se envían a la API real.

Se conservan las [guías web anteriores](web/README.md), la [revisión de la maqueta](web/REVISION_REQUISITOS.md) y la [propuesta móvil](mobile/INTEGRACION.md). Sus rutas históricas outputs/ y work/ corresponden al entorno de desarrollo original.

Documentación del proyecto: [juliobernal92/NexAccess_docs](https://github.com/juliobernal92/NexAccess_docs). No aplicar su SQL original sobre una base existente sin revisar las migraciones del backend.
