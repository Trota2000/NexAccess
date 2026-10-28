> **App personal (28/10/2026):** la entrada m�vil ahora muestra exclusivamente login del empleado, Mi tarjeta, Historial, cierre de sesi�n y tema. Ver [gu�a vigente de la app personal](../docs/APP_MOVIL_PERSONAL.md) para ejecutar, revisar el dise�o con un fixture y consultar el contrato pendiente de backend/NFC. Las rutas administrativas y la demo anteriores est�n deshabilitadas en la navegaci�n; lo que sigue se conserva como documentaci�n hist�rica del prototipo.

# NexAccess Mobile

Frontend m�vil independiente con React Native, TypeScript, Expo SDK 57 y Expo Router. No reemplaza el portal anterior de `outputs/nexaccess`. No se modificaron los repositorios de referencia.

## Ejecutar

Requisitos: Node.js con npm (verificado con Node 24.19.0), tel�fono con Expo Go compatible con SDK 57, misma red que la computadora. No se necesita PostgreSQL ni el backend.

```powershell
cd C:\Users\diego\Documents\Codex\2026-10-14\use-the-expo-plugin-to-build\outputs\nexaccess-mobile
npm.cmd ci
npx.cmd expo start --go
```

Escane� el QR con Expo Go en Android o con C�mara/Expo Go en iOS. Para navegador: presion� `w` o ejecut� `npm.cmd run web`.

En este equipo tambi�n pod�s usar el asistente PowerShell que detecta el Node disponible y configura sus cach�s dentro del proyecto:

```powershell
.\run.ps1 -Target web
# O para tel�fono:
.\run.ps1 -Target go
```

Si PowerShell bloquea scripts, us� los comandos npm anteriores. Si dice que `node` no se reconoce, instal� Node.js con npm y abr� una terminal nueva. El script prueba adem�s el runtime de Codex disponible en este equipo; esa ruta no es un requisito para otros compa�eros.

## Entrar en la demo

Seleccion� un perfil e ingres� su usuario. Contrase�a ficticia com�n: `NexAccess2026!`.

| Perfil | Usuario | Herramientas |
|---|---|---|
| Empleado | `empleado` | Solo sus datos personales |
| Seguridad | `seguridad` | Accesos generales, credenciales, �reas, lectores, roles y permisos |
| Recursos Humanos | `rrhh` | Empleados, asistencia y correcciones justificadas |
| Administrador | `admin` | Todos los m�dulos, usuarios del sistema y auditor�a |

No hay registro p�blico. Recuperar contrase�a muestra una explicaci�n de demostraci�n. El selector de Perfil permite explorar otros roles; esta capacidad es exclusiva del prototipo.

## Pantallas y acciones

- **Inicio:** saludo, credencial, �ltima entrada/salida, acceso reciente, marcaciones del d�a, pendientes y accesos r�pidos.
- **Credencial:** tarjetas f�sica y digital, estados ACTIVA/INACTIVA/VENCIDA/REVOCADA derivados, identificador enmascarado, vencimiento y detalle. Sin NFC real.
- **Actividad:** historial personal, filtros de fechas, resultado y �rea; detalles de solo lectura.
- **Asistencia:** calendario mensual navegable, selecci�n por d�a, resumen, filtros por per�odo y detalle de cada marcaci�n.
- **Notificaciones:** filtros por tipo/lectura, detalle, lectura individual y masiva, contador por perfil.
- **Perfil:** documento enmascarado, datos de contacto, roles separados, preferencias, cambio de perfil, informaci�n, cierre de sesi�n y restablecimiento local.
- **Seguridad:** panel, eventos generales por empleado/�rea/fecha/resultado, �reas, lectores, credenciales, roles f�sicos y permisos.
- **RRHH:** panel, consulta/b�squeda de empleados, creaci�n/edici�n local con validaci�n, cambios de estado, asistencia general y correcci�n manual confirmada.
- **Administraci�n:** usuarios del sistema, empleados, roles f�sicos, �reas, credenciales, dispositivos, permisos y auditor�a de solo lectura.
- **Permisos:** creaci�n y edici�n con rol f�sico, �rea, d�as, horas y estado; filtros por rol y �rea. Rechaza duplicados rol/�rea y horarios inv�lidos.
- **Auditor�a:** fecha, actor, acci�n, recurso, resultado y detalle, con b�squeda y filtros. Las mutaciones locales agregan registros SIMULADO.

En las colecciones administrativas se priorizan consulta, detalle y cambios r�pidos de estado. Los formularios de alta/edici�n est�n disponibles para empleados y permisos; las altas de usuarios, �reas, dispositivos, credenciales y roles f�sicos quedan para la integraci�n del portal/API. No hay botones que anuncien operaciones no implementadas.

## Persistencia y restricciones

Zustand conserva datos ficticios y preferencias con AsyncStorage. La sesi�n y el campo contrase�a **no se persisten**. Al recargar se vuelve al login; los cambios locales se mantienen hasta restablecer la demo desde Perfil. No ingresar informaci�n real: el almacenamiento no est� cifrado y es �nicamente para datos ficticios.

Las autorizaciones se comprueban en rutas y acciones del store. Las pantallas personales filtran por empleado. Esto sirve para el prototipo y no sustituye la autorizaci�n de la API.

Las correcciones exigen empleado activo, fecha/hora v�lidas y motivo. Se rechaza cualquier fecha futura y toda marcaci�n a menos de 60 segundos de otra del mismo empleado. No se calculan tardanzas, horas extras, descuentos ni cumplimiento laboral.

Los timestamps de la demo se muestran en la zona horaria del dispositivo; los datos iniciales representan Paraguay (`-03:00`). En la integraci�n debe acordarse la zona institucional con la API.

## C�digo

```text
src/app/                 Expo Router: login, pesta�as, stacks y rutas protegidas
src/components/          Contenedores, tarjetas, formularios, filtros y di�logos
src/features/            Pantallas personales y m�dulos de trabajo
src/data/mocks/          Datos ficticios relacionados
src/stores/              Estado y acciones locales con autorizaci�n
src/types/               Modelos de dominio
src/theme/               Tokens sustituibles de color, espaciado y estilos
src/utils/               Fechas, estados de credenciales y validaciones
src/services/            Contratos para futura integraci�n
tests/                   Jest + React Native Testing Library
```

Tecnolog�as: Lucide React Native + SVG, React Hook Form + Zod, Zustand, AsyncStorage y date-fns. Expo Reanimated est� disponible; las transiciones actuales usan Stack y modales nativos. No necesita servicios externos ni un plugin adicional para funcionar. Las dependencias se instalaron con `npx expo install`.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npx.cmd expo install --check
npx.cmd expo-doctor
```

Ver [INTEGRACION.md](INTEGRACION.md) para contratos y diferencias con la API y [VERIFICACION.md](VERIFICACION.md) para el alcance real de las pruebas.
