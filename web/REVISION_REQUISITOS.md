# Revisión del frontend web NexAccess

> Esta revisión describe la maqueta conservada en `/demo`. La integración API posterior tiene [su propia guía](../docs/INTEGRACION_API.md), [verificación](../docs/VERIFICACION_API.md) y [pendientes](../docs/PENDIENTES_SISTEMA.md).

Fecha: 20/10/2026. Proyecto revisado: `outputs/nexaccess`. Se preservaron sus rutas y funcionalidades y se mantuvo independiente de `outputs/nexaccess-mobile`.

**Conclusión: cumple parcialmente el documento web y sirve como prototipo administrativo. No está todavía alineado para conectarse directamente con todos los contratos del backend.** La existencia de los once apartados no implica que cada detalle del documento original esté implementado.

## Base de comparación

- Documento original «Diseño Frontend de un Sistema de Control de Accesos RFID/NFC», más las instrucciones de login sin registro y colores claros.
- Documentación y esquema de [NexAccess_docs](https://github.com/juliobernal92/NexAccess_docs).
- [Backend NexAccess](https://github.com/sof2702/NexAccess), commit revisado `8b9f0ce122e269e7df9bc78a4405df4445d05f20`: `docs/SEGURIDAD.md`, `MANUAL_USUARIO.md`, entidades, enumeraciones y DTO.
- El documento móvil se usó para contrastar conceptos compartidos. Sus cinco pestañas, pantallas personales y librerías no se impusieron al portal web.

Los repositorios de referencia se consultaron como fuentes. Esta revisión modifica únicamente la copia local del frontend; no publica cambios en GitHub.

## Matriz de cumplimiento después de los ajustes

| Apartado | Estado | Evidencia y límites |
|---|---|---|
| Navegación general | Cubierto | Once módulos, menú lateral contraíble, barra superior, campana, cierre de sesión y menú para pantallas pequeñas. |
| Login | Cubierto para demo | Cuenta administrativa ficticia, validación, contraseña visible/oculta y rutas protegidas por sesión. Sin registro público; no es JWT real. |
| Dashboard | Parcial | Totales, accesos del día, actividad reciente, gráficos por fecha/área y alertas. Se corrigió el uso del último día de muestra como día de indicadores. Falta un gráfico comparativo específico de autorizados/rechazados. |
| Historial | Parcial con mejoras | Ahora busca empleado, evento, ID/terminación de credencial; filtra fecha, hora, área, lector y resultado; ordena, pagina, muestra detalles y exporta la selección CSV. La presentación sigue siendo una lista de tarjetas, no la tabla completa de escritorio pedida originalmente. No se inventaron tipos entrada/salida o resultado ERROR que la API revisada no expone como eventos de acceso. |
| Personas / empleados | Cubierto como directorio de empleados | Alta, edición, estados, búsqueda, filtros y perfil con credenciales/permisos/historial. Se corrigieron los rótulos «Usuarios» por «Empleados». Las rutas `/usuarios/...` se conservaron para no romper navegación. No gestiona cuentas administrativas. |
| Credenciales | Parcial | Registro, asociación, desvinculación, seis estados de demo, filtros, historial y datos enmascarados. Se impide reactivar/reasignar una credencial revocada. Pendientes: motivo/fecha de revocación como campos propios y último uso resumido. Los seis estados no equivalen directamente al contrato API. |
| Áreas | Cubierto como simulación | CRUD, estados, ubicación, nivel de seguridad, lectores, personas con permisos configurados e historial. Edificio, piso, ubicación y horario son datos de presentación que necesitan acuerdo de contrato. |
| Dispositivos | Parcial para integración | Registro, edición, área, tipo, estado de conexión, última comunicación e historial. Falta separar explícitamente actividad administrativa de conectividad; la API usa `IsActive` y `LastSeenAt`. |
| Permisos | Cubierto en demo; adaptación pendiente | Crear, editar, revocar, rol/persona, fechas, horarios y matriz. La matriz ahora dice «Configurado», sin afirmar una autorización física actual. La API admite rol físico/área/días/horas/actividad; los permisos directos a personas y las fechas de vigencia son propuestas. |
| Alertas | Parcial | Consulta, detalle, prioridad, estados y filtros. No hay ejemplos de todos los tipos del documento original. Puerta forzada/abierta y alertas en tiempo real requieren contratos o fuentes adicionales; no hay monitoreo real. |
| Reportes | Parcial con mejoras | Agrupación diaria/semanal/mensual, áreas, empleados, lector y franjas horarias; filtros y CSV/PDF por impresión. Los dos últimos gráficos se agregaron en esta revisión. No se implementó filtro por un tipo de evento que el modelo actual no tiene. |
| Auditoría | Cubierto para demo | Solo lectura, detalle, captura de cambios y exportaciones. Se añadieron selectores explícitos de administrador y acción además de módulo, fecha y búsqueda. |
| Configuración | Parcial | Nombre, institución, zona horaria, tamaño de página y contador de alertas. Pendientes: formatos de fecha/hora y preferencias por tipo/prioridad de alerta. Se conserva tema claro por la preferencia expresa del usuario; no se introduce un tema negro. |
| Componentes y estructura | Cubierto | Componentes compartidos, dominio, estado, datos, funciones, rutas y estilos separados. No hace falta reescribir el portal con las librerías del móvil para integrar ambos. |
| Interacciones | Cubierto en el alcance existente | Formularios, confirmaciones, mensajes, búsquedas, filtros, navegación y estados vacíos funcionan con estado local. Se añadieron validaciones de roles físicos, días de permiso y revocación. |
| Diseño y accesibilidad | Parcialmente verificado | Paleta clara y tokens, distribución adaptable, etiquetas y tamaños táctiles. Queda una revisión específica de teclado, foco, hover, contraste y escalado de texto antes de dar conformidad de accesibilidad. |

«Cubierto» indica funcionalidad de demostración en el alcance mencionado; no implica integración de servidor ni certificación de seguridad o accesibilidad.

## Correcciones realizadas

1. **Identidad de personas:** el directorio y sus formularios/perfiles hablan de empleados y aclaran que no crean cuentas de login. El tipo `AccessRole` se diferencia de `SystemRole` (`ADMIN`, `SEGURIDAD`, `RRHH`).
2. **Historial:** filtros combinados, validación de rangos, zona horaria institucional, límites inclusivos, orden cronológico y paginación acotada. Exporta todas las coincidencias, no solo la página visible, y registra la exportación en auditoría.
3. **Exportación:** CSV con empleado, ID interno de credencial e identificador enmascarado. Se conserva protección de fórmulas y escape de contenido.
4. **Revocación:** no se permite reactivar, reasignar o cambiar el identificador de una credencial ya revocada. Se ocultó su botón de desvinculación.
5. **Validación:** se rechazan roles físicos inexistentes/duplicados y días de permiso fuera de las opciones admitidas.
6. **Dashboard:** los contadores usan la fecha actual de la zona configurada; se informa por separado la fecha de la muestra. Con una muestra antigua es correcto mostrar cero accesos hoy.
7. **Matriz y perfil:** los permisos aparecen como configurados, sujetos a las evaluaciones del backend. Tener un permiso por rol no prueba que el acceso esté autorizado ahora.
8. **Auditoría y reportes:** filtros explícitos de actor/acción y gráficos por lector/hora.
9. **Arranque local:** `run.ps1` detecta también el Node disponible en este equipo, para evitar el error de PATH observado anteriormente.

## Qué falta para encajar con el backend y el móvil

### Prioridad alta: cuentas y autorizaciones del portal

Crear un módulo independiente de **usuarios del sistema**. El modelo de empleado no debe utilizarse como cuenta administrativa. Incorporar perfiles demo ADMIN/SEGURIDAD/RRHH y comprobar privilegios tanto en rutas como en acciones locales. En la integración real, el servidor debe validar cada operación. Hoy esta web usa una única cuenta demo administrativa; no simula la matriz completa de operadores.

El rol físico «Administrador» representa `ADMINISTRADOR`, mientras que el privilegio administrativo del sistema es `ADMIN`. Asignar un rol físico a un empleado no debe cambiar la sesión de un operador.

### Prioridad alta: contratos y estados

- Introducir DTO/adaptadores con IDs reales y conversiones de campos; los modelos de demostración no son DTO listos para enviar.
- Credenciales: derivar estado de `IsActive`, `ExpiresAt`, `RevokedAt`; solicitar motivo al revocar. «Bloqueada» y «Extraviada» necesitan una traducción acordada o permanecer como metadatos locales, sin inventar estados API.
- Permisos: usar `RoleId`, `AreaId`, días booleanos, horas y `IsActive`. No enviar permisos individuales ni vigencias sin soporte de contrato.
- Dispositivos: separar habilitación del dispositivo y señal de conectividad; «Conectado» no equivale a `IsActive`.
- Roles de acceso físico: permitir consultar/gestionar el catálogo real, que admite roles adicionales a los cuatro de muestra.

### Ampliación funcional: asistencia web

Agregar un módulo de asistencia para RRHH/ADMIN con consulta, filtros, detalle y corrección manual justificada. Es una ampliación respecto del documento web original, necesaria si el portal debe cubrir también el proceso laboral que ya representa el móvil. Aplicar la ventana de duplicación configurable (60 segundos por defecto) y acordar el desfase futuro con el backend; no calcular tardanzas, horas extras ni salarios.

### Prioridad siguiente: completar el detalle visual

Completar tabla de historial para escritorio, comparación gráfica por resultado, último uso y revocación de credenciales, preferencias de formatos/notificaciones y casos de alertas faltantes. Revisar navegación con teclado/foco y tamaños tablet/teléfono. Mantener las funciones no respaldadas por API identificadas como propuestas.

## Verificación

- 32 pruebas de dominio aprobadas, incluidas ocho nuevas de esta revisión.
- TypeScript y ESLint comprobados en el proyecto web.
- La interfaz conserva las funciones previas y las rutas existentes.
- El alcance de prueba visual y de compilación de esta revisión se registra al final de `VERIFICACION.md`.

La conclusión no es que haya que rehacer la web. La base sirve; conviene cerrar estos puntos en etapas, empezando por separar cuentas administrativas, empleados y permisos físicos.
