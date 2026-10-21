# NexAccess Mobile

Frontend móvil independiente con React Native, TypeScript, Expo SDK 57 y Expo Router. No reemplaza el portal anterior de `outputs/nexaccess`. No se modificaron los repositorios de referencia.

## Ejecutar

Requisitos: Node.js con npm (verificado con Node 24.19.0), teléfono con Expo Go compatible con SDK 57, misma red que la computadora. No se necesita PostgreSQL ni el backend.

```powershell
cd C:\Users\diego\Documents\Codex\2026-10-14\use-the-expo-plugin-to-build\outputs\nexaccess-mobile
npm.cmd ci
npx.cmd expo start --go
```

Escaneá el QR con Expo Go en Android o con Cámara/Expo Go en iOS. Para navegador: presioná `w` o ejecutá `npm.cmd run web`.

En este equipo también podés usar el asistente PowerShell que detecta el Node disponible y configura sus cachés dentro del proyecto:

```powershell
.\run.ps1 -Target web
# O para teléfono:
.\run.ps1 -Target go
```

Si PowerShell bloquea scripts, usá los comandos npm anteriores. Si dice que `node` no se reconoce, instalá Node.js con npm y abrí una terminal nueva. El script prueba además el runtime de Codex disponible en este equipo; esa ruta no es un requisito para otros compañeros.

## Entrar en la demo

Seleccioná un perfil e ingresá su usuario. Contraseña ficticia común: `NexAccess2026!`.

| Perfil | Usuario | Herramientas |
|---|---|---|
| Empleado | `empleado` | Solo sus datos personales |
| Seguridad | `seguridad` | Accesos generales, credenciales, áreas, lectores, roles y permisos |
| Recursos Humanos | `rrhh` | Empleados, asistencia y correcciones justificadas |
| Administrador | `admin` | Todos los módulos, usuarios del sistema y auditoría |

No hay registro público. Recuperar contraseña muestra una explicación de demostración. El selector de Perfil permite explorar otros roles; esta capacidad es exclusiva del prototipo.

## Pantallas y acciones

- **Inicio:** saludo, credencial, última entrada/salida, acceso reciente, marcaciones del día, pendientes y accesos rápidos.
- **Credencial:** tarjetas física y digital, estados ACTIVA/INACTIVA/VENCIDA/REVOCADA derivados, identificador enmascarado, vencimiento y detalle. Sin NFC real.
- **Actividad:** historial personal, filtros de fechas, resultado y área; detalles de solo lectura.
- **Asistencia:** calendario mensual navegable, selección por día, resumen, filtros por período y detalle de cada marcación.
- **Notificaciones:** filtros por tipo/lectura, detalle, lectura individual y masiva, contador por perfil.
- **Perfil:** documento enmascarado, datos de contacto, roles separados, preferencias, cambio de perfil, información, cierre de sesión y restablecimiento local.
- **Seguridad:** panel, eventos generales por empleado/área/fecha/resultado, áreas, lectores, credenciales, roles físicos y permisos.
- **RRHH:** panel, consulta/búsqueda de empleados, creación/edición local con validación, cambios de estado, asistencia general y corrección manual confirmada.
- **Administración:** usuarios del sistema, empleados, roles físicos, áreas, credenciales, dispositivos, permisos y auditoría de solo lectura.
- **Permisos:** creación y edición con rol físico, área, días, horas y estado; filtros por rol y área. Rechaza duplicados rol/área y horarios inválidos.
- **Auditoría:** fecha, actor, acción, recurso, resultado y detalle, con búsqueda y filtros. Las mutaciones locales agregan registros SIMULADO.

En las colecciones administrativas se priorizan consulta, detalle y cambios rápidos de estado. Los formularios de alta/edición están disponibles para empleados y permisos; las altas de usuarios, áreas, dispositivos, credenciales y roles físicos quedan para la integración del portal/API. No hay botones que anuncien operaciones no implementadas.

## Persistencia y restricciones

Zustand conserva datos ficticios y preferencias con AsyncStorage. La sesión y el campo contraseña **no se persisten**. Al recargar se vuelve al login; los cambios locales se mantienen hasta restablecer la demo desde Perfil. No ingresar información real: el almacenamiento no está cifrado y es únicamente para datos ficticios.

Las autorizaciones se comprueban en rutas y acciones del store. Las pantallas personales filtran por empleado. Esto sirve para el prototipo y no sustituye la autorización de la API.

Las correcciones exigen empleado activo, fecha/hora válidas y motivo. Se rechaza cualquier fecha futura y toda marcación a menos de 60 segundos de otra del mismo empleado. No se calculan tardanzas, horas extras, descuentos ni cumplimiento laboral.

Los timestamps de la demo se muestran en la zona horaria del dispositivo; los datos iniciales representan Paraguay (`-03:00`). En la integración debe acordarse la zona institucional con la API.

## Código

```text
src/app/                 Expo Router: login, pestañas, stacks y rutas protegidas
src/components/          Contenedores, tarjetas, formularios, filtros y diálogos
src/features/            Pantallas personales y módulos de trabajo
src/data/mocks/          Datos ficticios relacionados
src/stores/              Estado y acciones locales con autorización
src/types/               Modelos de dominio
src/theme/               Tokens sustituibles de color, espaciado y estilos
src/utils/               Fechas, estados de credenciales y validaciones
src/services/            Contratos para futura integración
tests/                   Jest + React Native Testing Library
```

Tecnologías: Lucide React Native + SVG, React Hook Form + Zod, Zustand, AsyncStorage y date-fns. Expo Reanimated está disponible; las transiciones actuales usan Stack y modales nativos. No necesita servicios externos ni un plugin adicional para funcionar. Las dependencias se instalaron con `npx expo install`.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npx.cmd expo install --check
npx.cmd expo-doctor
```

Ver [INTEGRACION.md](INTEGRACION.md) para contratos y diferencias con la API y [VERIFICACION.md](VERIFICACION.md) para el alcance real de las pruebas.
