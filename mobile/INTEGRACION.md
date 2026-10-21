# Referencias e integración futura

Se revisó [NexAccess_docs](https://github.com/juliobernal92/NexAccess_docs), su esquema `SQL/sql_inicial.sql`, y el [backend NexAccess](https://github.com/sof2702/NexAccess), commit `8b9f0ce122e269e7df9bc78a4405df4445d05f20`, consultado el 20/10/2026. Los clones de referencia se usaron solo para lectura.

Fuentes del backend: `docs/SEGURIDAD.md`, `docs/MANUAL_USUARIO.md`, entidades/enumeraciones en `src/NexAccess.Domain`, `AttendanceService`, controladores y DTO. El backend distingue empleado (persona), usuario (cuenta del sistema) y rol de acceso físico. Las fechas y enumeraciones se transportan con sus contratos, no con los textos de pantalla.

## Disponible en la API de referencia

| Recurso | Familia documentada | Autorización relevante |
|---|---|---|
| Sesión administrativa | `/api/v1/auth/login` | ADMIN, SEGURIDAD, RRHH |
| Usuarios / auditoría | `/api/v1/users`, `/api/v1/audit` | ADMIN |
| Empleados | `/api/v1/employees` | Consulta: los tres; escritura: ADMIN/RRHH |
| Roles físicos / áreas | `/api/v1/roles`, `/api/v1/areas` | Consulta: los tres; escritura: ADMIN/SEGURIDAD |
| Credenciales / lectores / permisos | `/api/v1/credentials`, `/api/v1/devices`, `/api/v1/access-permissions` | ADMIN/SEGURIDAD |
| Eventos | `/api/v1/access-events` | ADMIN/SEGURIDAD |
| Asistencia | `/api/v1/attendance` | ADMIN/RRHH |

Estas rutas se enumeran como referencia; esta aplicación **no realiza requests**. Revisar DTO y OpenAPI antes de desarrollar cada adaptador. IDs de la demo son strings como `e1`; la API usa IDs numéricos, y los nombres de campos requieren conversión explícita. `src/services/contracts.ts` define la frontera propuesta, no afirma que exista un servicio conectado.

Credencial: la API guarda `IsActive`, `ExpiresAt` y `RevokedAt`. La UI deriva REVOCADA > VENCIDA > ACTIVA/INACTIVA. Los tipos son FISICA/DIGITAL. No confundir rol del sistema ADMIN con rol físico ADMINISTRADOR.

Marcaciones: ENTRADA/SALIDA y origen DISPOSITIVO/MANUAL. La corrección crea una nueva marcación con motivo y actor; no edita el historial. El backend usa una ventana configurable de duplicación (60 s por defecto). Su implementación tolera hasta cinco minutos de desfase futuro; el prototipo aplica la regla más estricta solicitada: ningún instante futuro. Documentar y acordar esa diferencia antes de integrar. No se calculan reglas laborales.

## Propuestas exclusivas de la demo móvil

- Perfil EMPLEADO: no existe como rol administrativo autenticable en el backend revisado. Su autenticación y las consultas personales necesitan diseño de API y autorización por identidad.
- Vinculación directa usuario-empleado: simplificación de la demo, que debe verificarse antes de integrar.
- Bandeja de notificaciones internas, preferencias, selector de perfiles y recuperación de contraseña demostrativa: no se anuncian como endpoints existentes.
- Sector/departamento es dato de presentación opcional. Confirmar soporte en el modelo real.
- Tarjeta visual digital: no es una credencial criptográfica ni una implementación NFC.
- El dispositivo tiene estado activo y última conexión; no se deduce automáticamente que activo signifique conectado. La alerta de DC-01 es un dato ficticio de monitoreo.

## Sustituir datos locales

1. Implementar adaptadores de DTO hacia `src/types` y las etiquetas centralizadas. Mantener enmascarados los códigos de credencial en historiales y auditoría.
2. Sustituir acciones del store por un gateway inyectable con manejo de paginación, carga, errores y conflictos. No reutilizar credenciales de demo.
3. Integrar la sesión real con almacenamiento seguro de tokens y validación del rol en el servidor. Nunca guardar JWT en el AsyncStorage de la demo.
4. Definir contratos de autoservicio del empleado y notificaciones antes de conectarlos.
5. Acordar zona horaria, ventanas de duplicación y reglas de permiso con el backend. El formulario móvil de permisos admite intervalos dentro del mismo día; no admite turnos nocturnos cruzando medianoche.
6. Eliminar el selector de roles y los datos ficticios al pasar a producción. Implementar controles del servidor para cada consulta y mutación.

No se modificó el backend, no se implementaron endpoints, PostgreSQL, JWT real, ESP32, emulación NFC, push ni apertura de puertas.
