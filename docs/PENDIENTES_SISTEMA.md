# Pendientes para operar NexAccess sin inconsistencias

Revisión de código del 21/10/2026, backend `81511f3`, documentación `juliobernal92/NexAccess_docs@5e1955a`. Son hallazgos estáticos y comprobaciones HTTP anónimas, no una auditoría de la base ni una garantía sobre el despliegue. La cuenta de pruebas, la configuración privada y el hardware no estuvieron disponibles.

## Antes de habilitar operación real

| Prioridad | Hallazgo y consecuencia | Cambio requerido y aceptación |
|---|---|---|
| Alta | El servicio `/health` devuelve un objeto estático `ok` (`HealthController.cs`); no prueba PostgreSQL, esquema ni permisos de la cuenta. | Agregar readiness con conexión/consulta mínima a DB y versión de esquema; conservar liveness simple. Probar caída de DB y confirmar que readiness falla. |
| Alta | El preflight público de `/auth/login` devolvió 405 sin CORS. Abrir la web desde otro origen bloquea el login aunque health responda. | Usar el proxy del mismo origen incluido o CORS con lista explícita de orígenes. Probar login y GET con Authorization en navegador. Nunca usar `*` como arreglo de autenticación. |
| Alta | Varias altas guardan entidad y auditoría en dos `SaveChangesAsync` sin una transacción común (`EmployeeService`, `AreaService`, `RoleService`, `CredentialService`, `DeviceService`, `AccessPermissionService`, `UserService`, `AttendanceService`). La primera escritura puede quedar confirmada y la segunda fallar; el cliente recibe error pese a existir el registro. | Transacción que incluya entidad y auditoría o outbox duradero. Inyectar fallo de auditoría y comprobar rollback o entrega garantizada. El frontend evita reintentos automáticos, pero no puede garantizar atomicidad. |
| Alta | La prevención de marcaciones cercanas consulta y luego inserta (`AttendanceService.RegisterManualAsync`, `AttendanceRepository.ExistsNearAsync`); dos solicitudes simultáneas pueden pasar la comprobación. El flujo automático también lee la última marca antes de insertar. | Serializar por empleado o usar bloqueo/transacción y una política de idempotencia para dispositivos y marcaciones. Probar dos solicitudes simultáneas en la ventana configurada y obtener una única marca efectiva. No basta deshabilitar el botón. |
| Alta | Los PUT no reciben versión/ETag ni las entidades revisadas tienen token de concurrencia. Dos operadores pueden sobrescribir cambios ajenos. | Añadir versión por registro y `If-Match`/409/412; formularios deben recargar y resolver conflicto. La actualización posterior a guardar no soluciona la carrera previa. |
| Alta | Se verificó el código, no el commit ni el esquema efectivos del servicio público. OpenAPI público devolvió 404, esperable si está deshabilitado. | Publicar contrato versionado como artefacto de CI o endpoint protegido e identificar versión de API/despliegue. Obtener cuenta de pruebas de mínimo privilegio y realizar aceptación autenticada antes de integrar a producción. |
| Alta | La documentación SQL original y el esquema del backend tienen diferencias. `CREATE TABLE IF NOT EXISTS` no actualiza una tabla existente (`001_esquema_inicial.sql`). | Crear migraciones versionadas y revisar columnas/restricciones reales con respaldo previo. No ejecutar el SQL original y el del backend indistintamente ni reinicializar producción para probar. |

## Reglas y cobertura que faltan

| Prioridad | Tema | Situación y propuesta |
|---|---|---|
| Media | Invalidación de sesiones | `UserService.ChangePasswordAsync` cambia el hash, pero la validación JWT comprueba actividad y rol, no una versión de sesión. Los tokens previos pueden seguir válidos hasta expirar. Añadir tokenVersion/security stamp y comprobarlo, o documentar expresamente la política. Logout actual es local, sin endpoint de revocación. |
| Media | Exportaciones y reporte | `ListAsync(...,50000)` usa `Take(limit)` sin indicador de truncamiento. Un CSV/resumen de más de 50.000 filas puede parecer completo. Devolver error explícito, metadatos de truncamiento o exportación por trabajos/paginación. Verificar con >50.000 registros. No es correcto calcular totales globales a partir de la página visible. |
| Media | Asistencia manual de inactivos | La corrección manual comprueba existencia de empleado, pero no `IsActive`, a diferencia de otros flujos. Definir si RRHH puede cargar marcas históricas de personas inactivas; añadir regla y prueba según esa decisión. La UI no inventa la política. |
| Media | Reporte incompleto | `Incomplete` compara cantidad de entradas/salidas. No detecta por sí solo secuencias inválidas como dos entradas seguidas, ni define turnos nocturnos. Acordar semántica antes de usarlo como control laboral. |
| Media | Zona y horarios nocturnos | `Access:TimeZoneId` no tiene endpoint de consulta. `AllowsAt` usa el día actual: un permiso lunes 22–06 no habilita automáticamente el martes 02 si martes está deshabilitado. Documentar esa política o cambiar la evaluación y sus pruebas. Añadir configuración pública no sensible para que web y móvil muestren la zona real, sin asumir Asunción si el servidor cambia. |
| Media | Autoservicio empleado | No hay rol del sistema EMPLEADO ni rutas `/me/attendance`, `/me/credentials`, `/me/access-events`. Un campo `employeeId` en una cuenta no la convierte en cuenta de empleado. Añadir autorización por propietario y consultas limitadas por servidor antes de activar las cinco pestañas personales con datos reales. |
| Media | Alertas/notificaciones | No existen endpoints de bandeja, destinatarios, lectura ni gestión de alertas. Mantenerlos solo en demo o implementar persistencia y autorización. No derivar avisos personales de eventos globales que el usuario no puede consultar. |
| Media | Cuentas | La API solo crea, lista, activa/desactiva y cambia contraseña. Para editar perfil o vínculo con empleado después del alta faltan endpoints y validaciones. La UI no permite esos cambios ficticios. |
| Media | Enrolamiento | No hay listado general; la UI necesita ID para consultar. Agregar lista paginada filtrada por empleado/dispositivo/estado si se requiere recuperar solicitudes después de cerrar sesión. La clave del dispositivo debe mantenerse exclusivamente en el ESP32/configuración operativa. |
| Media | Gestión de claves | La UI muestra la clave una sola vez en memoria. Acordar el canal seguro de entrega/configuración del ESP32 y recuperación si se cierra la ventana antes de copiar. Rotar invalida la clave anterior; probar el cambio con hardware. |
| Media | Compatibilidad de DB | El README del backend indica pruebas en PostgreSQL 18.3 y no verifica PostgreSQL 9.3.5. Confirmar la versión real del servidor y la compatibilidad Npgsql/EF antes de afirmar soporte. |
| Media | IDs bigint | El backend devuelve long como número JSON. La UI rechaza enteros fuera de `Number.MAX_SAFE_INTEGER`; si se necesitan, cambiar el contrato a cadenas en todos los DTO/rutas/adaptadores. |

## Despliegue y aceptación pendientes

1. Integrar el contenedor frontend y las rutas del proxy del dominio con el runner real. El script `/opt/nexaccess/scripts/deploy-ci.sh` no está disponible aquí. El workflow del backend despliega solo su imagen, no el contenido de este repositorio frontend.
2. Revisar forwarded headers y terminación HTTPS con el proxy existente: el código usa `UseHttpsRedirection` en producción. Verificar que no haya bucles antes de modificar configuración de proxies conocidos; no confiar en cualquier origen de cabeceras.
3. Probar login ADMIN/SEGURIDAD/RRHH, 401, 403 y desactivación de cuenta; comprobar que no se pueden obtener módulos ajenos por HTTP directo.
4. Probar empleados duplicados, roles múltiples, credencial revocada/vencida, área inactiva, permisos nocturnos, enrolamiento vencido/cancelado y rotación de clave.
5. Probar simultaneidad con dos operadores y dos dispositivos, fallos parciales de DB/auditoría y pérdida de red después de un POST.
6. Verificar credenciales, apertura y marcaciones con ESP32 real. La app no emula lectura NFC ni abre puertas; esos endpoints requieren X-DEVICE-KEY y corresponden al firmware.
7. Ejecutar Expo Go en un dispositivo real y validar red/HTTPS y compartir CSV. La exportación de JS nativo no sustituye esta prueba.

La rama de frontend se puede revisar y probar localmente. No se considera validada para producción hasta completar los puntos de aceptación relevantes. Ningún cambio de esta revisión se aplicó automáticamente al backend o a la base de datos pública.
