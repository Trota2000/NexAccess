# NexAccess · Frontend de administración

Prototipo frontend del sistema de accesos RFID/NFC. React Native, Expo SDK 57 y Expo Router, con interfaz en español adaptable a escritorio, tablet y teléfono. Incluye los once apartados de navegación del ejemplo, manteniendo el login, el directorio y el historial anteriores.

## Ejecutar

Requiere Node.js LTS compatible (22.13 o superior) con npm. Desde esta carpeta:

```powershell
npm ci
npx expo start --go
```

Abrí Expo Go compatible con SDK 57 en el teléfono y escaneá el QR. El teléfono y la computadora deben estar en la misma red. Si la red impide la conexión, se puede probar `npx expo start --go --tunnel` (puede requerir instalar el proveedor de túnel).

Vista web:

```powershell
npx expo start --web
```

En el entorno de Codex utilizado, Node está disponible pero npm/npx no están en el PATH normal. El script de arranque reutiliza la copia local de npm preparada en el workspace y mantiene las cachés de las herramientas en el proyecto:

```powershell
.\run.ps1 -Target go
.\run.ps1 -Target web -Port 8083
```

El script incluido en el ZIP también funciona con una instalación normal de Node y npm. No incluye los paquetes instalados ni los runtimes de Codex.

## Funcionalidad de esta etapa

- Inicio de sesión simple, sin registro público: usuario, contraseña, mostrar/ocultar contraseña, validaciones y errores de acceso.
- Rutas del panel protegidas en el cliente con Expo Router y cierre de sesión con confirmación. Una recarga exige iniciar sesión nuevamente; cerrar sesión descarta los cambios de demostración.
- Directorio con 12 empleados ficticios; búsqueda por nombre, cédula, correo e ID, filtros combinables por rol y estado, orden y paginación.
- Registro y edición: nombre, apellido, cédula, correo opcional, teléfono opcional, departamento, varios roles y estado.
- Validación de campos obligatorios, formatos, límites y unicidad de documento/correo. Un documento con puntos se compara normalizado; el correo ignora mayúsculas.
- Perfil con pestañas de datos personales, credenciales físicas/digitales, permisos derivados de roles e historial individual.
- Activación/desactivación con confirmación, mensajes de resultado y actualización de lista/contadores. Los permisos del empleado inactivo se presentan suspendidos; las credenciales y eventos históricos se conservan.
- Historial general complementario, con búsqueda, filtro por resultado, paginación y detalle de evento de solo lectura.
- Menú lateral contraíble en escritorio; navegación inferior en teléfono. Estados vacíos y carga inicial de fuentes.
- Navegación completa agrupada en General, Administración, Monitoreo y Sistema; menú móvil con todos los módulos.

| Apartado | Funcionalidad implementada |
| --- | --- |
| Dashboard | Resumen de usuarios, credenciales, accesos de la última fecha de muestra, áreas y lectores; gráficos, actividad reciente, alertas y accesos rápidos. |
| Historial de accesos | Búsqueda, resultado, paginación y detalle de eventos de solo lectura. |
| Usuarios | Alta, edición, búsqueda, filtros, estado y perfil con tarjetas, permisos e historial. |
| Tarjetas RFID/NFC | Alta, edición, asignación a usuario, bloqueo, desvinculación, estados, filtros e historial relacionado. El identificador se muestra enmascarado fuera del formulario. |
| Áreas y salas | Alta, edición, activación/desactivación, ubicación, nivel de seguridad y detalle de lectores, personas autorizadas e historial. |
| Lectores y dispositivos | Alta, edición, asignación a área, tipo, estado simulado, última comunicación de muestra e historial. |
| Permisos de acceso | Alta y edición para roles o personas, horarios, días, vigencia, revocación y matriz por rol. |
| Alertas | Búsqueda y filtros por estado/prioridad, detalle y cambio entre Nueva, En revisión y Resuelta. |
| Reportes | Filtros por persona, área, resultado y fechas; agrupación diaria/semanal/mensual, gráficos y exportación CSV o impresión/PDF. |
| Auditoría | Registro local automático de altas, ediciones, estados, alertas, configuración y exportaciones; búsqueda, módulo, fecha y detalle de solo lectura. |
| Configuración | Nombre e institución, zona horaria, tamaño de página e indicador de alertas nuevas. Se aplican a los módulos durante la sesión. |

Los datos y la sesión se mantienen solamente en memoria. Una recarga restaura los ejemplos y vuelve al login. No hay backend, autenticación real, base de datos, lectura NFC ni comunicación con dispositivos. Crear un empleado no crea una cuenta administrativa. “Nuevo usuario” permanece dentro del panel para que el administrador gestione empleados; no hay registro de cuentas desde el login. La ruta `/` conserva el directorio anterior; Dashboard está en `/dashboard`.

Las tarjetas, los permisos, las áreas y los dispositivos comparten estado con los perfiles y el Dashboard. Desactivar un área suspende sus permisos; revocar un permiso actualiza la matriz y el perfil. Los eventos históricos conservan sus datos de muestra y no se reescriben por cambios posteriores.

Los CSV se descargan desde web y se preparan para compartir en móvil. Para PDF, web abre el diálogo de impresión del navegador (elegir Guardar como PDF); Android/iOS generan el archivo con Expo Print y lo preparan para compartir. La exportación nativa sigue pendiente de comprobarse en un teléfono.

### Probar el inicio de sesión

- Usuario: `admin`
- Contraseña: `NexAccess2026!`

Estas credenciales son públicas, exclusivas de la demostración. La sesión no guarda contraseñas. `src/domain/auth.ts` contiene el adaptador que deberá reemplazarse con la API de autenticación del equipo. Las rutas protegidas del frontend no reemplazan los controles de autenticación y autorización del servidor.

## Criterios tomados de la documentación

Referencia: https://github.com/juliobernal92/NexAccess_docs, revisión `5e1955ab8803e46d2c38152a575795964119a97e`.

El SQL distingue `empleado` y `usuario` del portal, permite varios roles por empleado, exige cédula única y correo único cuando existe, y relaciona credenciales físicas/digitales con empleados. Este módulo administra empleados bajo el nombre visible “Usuarios”. Departamento es un campo provisional del frontend solicitado en el texto de requisitos, que deberá acordarse con la API antes de integrar.

Los eventos de acceso se distinguen de marcaciones de asistencia. Los permisos de muestra pueden asignarse por rol o persona; no existe evaluación de seguridad real. El ZIP `documentacion_rt06.zip` corresponde a Resell Analyzer y no se utilizó para definir NexAccess. El texto de requisitos y la imagen del menú se tomaron como referencia para ampliar la interfaz, conservando lo ya construido y la paleta clara.

La búsqueda del plugin Expo no devolvió resultados; se trabajó con la CLI oficial. Las dependencias Expo y React Native adicionales se instalaron con `npx expo install`, incluyendo los peers de Router y los iconos.

## Estructura

```text
src/app/              Rutas Expo Router
src/features/users/   Directorio, formulario y perfil
src/features/auth/    Inicio de sesión
src/features/access/  Historial y detalles
src/features/dashboard/ Resumen y accesos rápidos
src/features/management/ Tarjetas, áreas, lectores, permisos y matriz
src/features/alerts/  Seguimiento de incidentes
src/features/reports/ Gráficos, filtros y exportación
src/features/audit/   Trazabilidad de cambios
src/features/settings/ Preferencias de sesión
src/navigation/       Catálogo de módulos y grupos
src/utils/            Exportación por plataforma
src/components/       Pantalla, navegación y componentes reutilizables
src/domain/           Tipos, filtros y validaciones
src/data/             Empleados, credenciales, eventos y permisos de ejemplo
src/state/            Sesión y estado compartido entre módulos
src/theme.ts          Paleta y estilos compartidos
tests/                Pruebas de usuarios, login, relaciones y reportes
```

La paleta usa verde salvia, azul grisáceo, lavanda y superficies cálidas, sin blanco o negro puros en las áreas principales. Se personaliza desde `src/theme.ts`.

## Plugins y herramientas

No es obligatorio instalar un plugin adicional para terminar el frontend. Expo CLI, React Native, Expo Router, TypeScript y las herramientas de verificación ya están configurados en el proyecto.

- GitHub está disponible en esta conversación para trabajar con código, ramas y pull requests cuando el repositorio frontend del equipo esté definido.
- Figma figura instalado. Es opcional para trabajar con diseños compartidos, componentes y revisiones visuales del equipo; no bloquea la implementación local.
- Expo no apareció en la búsqueda de plugins. Se utiliza su CLI oficial, sin depender de un plugin de Codex.
- Expo Go es una aplicación que se instala en el teléfono, no un plugin de Codex. Permite completar las pruebas nativas pendientes.

Para integrar el login real se necesitan el contrato y los endpoints de autenticación del backend del equipo. Para esta etapa de interfaz no se añadió un proveedor externo de autenticación.

## Verificación

```powershell
npm test
npm run typecheck
npm run lint
npx expo install --check
npx expo-doctor
npx expo export --platform all
```

La evidencia y las limitaciones están en [VERIFICACION.md](VERIFICACION.md). La guía de instalación de Router consultada es https://docs.expo.dev/router/installation/ y la referencia de SDK utilizada es https://docs.expo.dev/versions/v57.0.0/.

Revisión del 20/10/2026: consultá [REVISION_REQUISITOS.md](REVISION_REQUISITOS.md) para cumplimiento, correcciones aplicadas y pendientes de integración. El directorio ahora se identifica como Empleados; conserva sus rutas anteriores.

