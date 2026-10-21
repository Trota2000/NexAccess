# Plantillas web y móvil

> Comparación histórica de las maquetas de `/demo`. El modo conectado de ambas apps usa ahora el mismo contrato API; consultá [la integración vigente](INTEGRACION_API.md).

| Aspecto | Web | Móvil |
|---|---|---|
| Propósito | Administración de accesos y registros | Consulta personal y tareas de campo por perfil |
| Navegación | Menú lateral y panel administrativo | Inicio, Credencial, Actividad, Notificaciones y Perfil; módulos adicionales por rol |
| Sesión | Una cuenta demo administrativa | Cuatro perfiles demo |
| Estado | Memoria durante la sesión | Zustand y persistencia local de datos ficticios |
| Formularios | Componentes y validaciones propias | React Hook Form y Zod |
| Pruebas | Node Test Runner, 32 casos | Jest/RNTL, 16 casos |
| Datos | Ficticios, independientes | Ficticios, independientes |

No están sincronizadas entre sí. Registrar una persona en una plantilla no modifica la otra. Compartir datos reales requerirá conectar ambas a la API y definir los permisos del servidor.

## Conceptos compartidos

- **Empleado:** persona con credenciales, accesos y marcaciones. No equivale a una cuenta de login.
- **Usuario del sistema:** operador con rol `ADMIN`, `SEGURIDAD` o `RRHH` en el backend revisado.
- **Rol de acceso físico:** agrupación que habilita áreas y horarios, como `EMPLEADO` o `ADMINISTRADOR`. No concede privilegios administrativos.
- **Credencial:** física o digital; su estado compatible se deriva de actividad, vencimiento y revocación.
- **Evento de acceso:** autorización o rechazo ante un área. No equivale a una entrada o salida laboral.
- **Marcación:** entrada o salida de asistencia, con origen dispositivo o manual y motivo cuando corresponde.

El perfil móvil EMPLEADO, la bandeja de notificaciones y ciertos campos visuales son propuestas del frontend. La web también conserva propuestas como permisos individuales/con vigencia y estados adicionales de tarjeta; no deben enviarse directamente como contratos API existentes.

## Siguientes pasos de integración

1. Revisar los DTO y autorizaciones del backend, fijando la versión de contrato.
2. Definir adaptadores explícitos para IDs, enumeraciones, fechas y etiquetas.
3. Completar cuentas y perfiles del portal web, separándolos del directorio de empleados.
4. Acordar autoservicio del empleado, notificaciones y asistencia web.
5. Sustituir mocks por servicios con carga, errores, paginación y autorización real en el servidor.
6. Probar en hardware antes de afirmar compatibilidad nativa o con lectores.

No se requiere unificar las librerías de estado o formularios para que las dos aplicaciones consuman la misma API.
