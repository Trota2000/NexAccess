# Verificación de NexAccess

Fecha: 14 de octubre de 2026 (America/Asuncion).

## Ruta seguida

1. `npx expo start --go --port 8081`: primer intento de servidor para Expo Go. El entorno restringido bloqueó la caché de Expo/herramientas de desarrollo. Se reutilizó una caché dentro del workspace mediante la opción de entorno de la CLI; no se creó un build personalizado.
2. `npx expo start --go --android --port 8082`: Metro arrancó y se intentó abrir Android con Expo Go. Falló porque no existe el SDK Android en la ubicación detectada y `adb` no está disponible. No hubo un teléfono conectado accesible ni un emulador disponible; no se afirma verificación nativa en dispositivo.
3. `npx expo start --go --web --port 8083`: servidor web iniciado. Verificación funcional en el navegador integrado de Codex, con viewport de escritorio 1366×900 y móvil 390×844. El tamaño móvil es una prueba web adaptable; no sustituye Expo Go en teléfono.
4. `npx expo export --platform all`: exportación de paquetes web, Android e iOS; no implica instalación o ejecución de la aplicación en esos sistemas.

No se usó dev client, simulador iOS ni EAS. El warning de descarga de React Native DevTools utilizó la versión de respaldo y no impidió el servidor ni las exportaciones.

## Comprobaciones

- 24 pruebas de dominio aprobadas: 8 del directorio, 4 de login y 12 de gestión/reportes (unicidad, relaciones, estados, permisos efectivos, fechas opcionales, límites de zona horaria y generación segura de CSV/HTML).
- TypeScript: sin errores.
- Lint de Expo: sin errores ni advertencias de código.
- Expo Doctor: 21/21 comprobaciones aprobadas.
- `expo install --check`: dependencias compatibles.
- Web, Android e iOS: paquetes generados por Metro/Hermes.

## Recorrido probado en navegador

- Enviar un formulario vacío: muestra errores y permanece en el formulario.
- Completar un alta con cédula `4.200.100`: rechaza el documento ya registrado.
- Cambiar a `7654321`, seleccionar Empleado y RRHH y guardar a Laura Pérez: abre `EMP-013` y muestra los dos roles.
- Editar el departamento a Recursos Humanos: conserva el registro y actualiza el perfil.
- Desactivar desde el perfil: muestra confirmación, cambia a Inactivo y mantiene sus datos.
- Consultar permisos: presenta las autorizaciones como Suspendido para la persona inactiva.
- Buscar Laura y filtrar Inactivos: un resultado; los contadores globales se actualizan a 13 registrados, 10 activos y 3 sin credencial.
- Buscar un término sin coincidencias: estado vacío y opción para limpiar filtros.
- Vista móvil: perfil adaptable y estado vacío de credenciales del usuario nuevo.
- Historial general: filtro Denegados devuelve 4 eventos; detalle EV-0003 muestra persona, área, fecha, lector, UID enmascarado y motivo.
- Recargar: vuelve a los 12 empleados de ejemplo, según el alcance de estado local.
- Carga de iconos: indicador visible antes de presentar la navegación.

## Pendiente de validación por el equipo

Abrir `npx expo start --go` con Expo Go compatible en un teléfono, escanear el QR y repetir login → alta → edición → desactivación → consulta del perfil → cerrar sesión. Revisar teclado, safe areas y botón/gesto de volver en Android/iOS reales. La conexión a API, autenticación real y NFC quedan fuera de esta entrega frontend.

## Verificación del login agregado

- Entrada sin sesión: se presenta `/login` con usuario y contraseña, sin botón ni enlace de registro.
- Envío vacío: se muestran los dos errores obligatorios.
- Credenciales incorrectas: el usuario permanece en login con un error general.
- Mostrar contraseña: alterna la visibilidad y el texto accesible cambia a “Ocultar contraseña”.
- Abrir directamente `/usuarios/EMP-001` sin sesión: redirige a `/login`.
- Ingresar con `admin` / `NexAccess2026!`: abre el directorio.
- Abrir un perfil después del ingreso: conserva la navegación y los datos del usuario.
- Cerrar sesión desde el perfil: solicita confirmación y regresa al login con los campos vacíos.
- Volver en el navegador después de cerrar sesión: el panel no se muestra y el login sigue siendo la pantalla disponible.
- Vista adaptable: captura de escritorio 1366×900 y teléfono 390×844, incluyendo el formulario completo en móvil.
- TypeScript, lint y las 12 pruebas pasan. Se vuelve a exportar web, Android e iOS con las nuevas rutas.

La sesión es simulada y no persistente. No representa un mecanismo de seguridad para producción.

## Ampliación de los apartados del menú

Se conservaron login, usuarios, perfiles e historial. Se agregaron Dashboard, Tarjetas RFID/NFC, Áreas y salas, Lectores y dispositivos, Permisos de acceso, Alertas, Reportes, Auditoría y Configuración. El menú se agrupa como la referencia y mantiene la paleta clara.

Recorrido comprobado en navegador (escritorio 1440×1000 y teléfono 390×844):

1. El menú presenta los once apartados, con selección activa y grupos General, Administración, Monitoreo y Sistema.
2. Dashboard calcula 12 personas, 11 credenciales activas, 5 áreas y 2/3 lectores conectados antes de las operaciones, y representa la actividad del 14 de octubre como datos de muestra.
3. Un alta de tarjeta sin identificador muestra validación. Se creó `CR-013`, asignada a Santiago Martínez, sin vencimiento. El listado y el perfil reflejaron la tarjeta; el contador de personas sin credencial cambió de 2 a 1.
4. Se comprobó el perfil con fecha de emisión local y la leyenda “Sin vencimiento”. Se corrigió un error detectado al renderizar fechas opcionales y se agregó una prueba de regresión.
5. Se creó “Sala de reuniones” (`AR-006`), que quedó disponible en el estado compartido. Dashboard pasó a mostrar 6 áreas.
6. Se editó `LE-3` de Desconectado a Conectado; el contador de lectores pasó a 3/3, únicamente como simulación.
7. Se revocó `PE-1` con confirmación. El contador de permisos habilitados bajó a 5 y la matriz cambió la celda de Empleado/Recepción a Restringido.
8. Se marcó `AL-001` como Resuelta. Las alertas nuevas bajaron de 2 a 1 y el indicador del panel se actualizó.
9. En Reportes se filtró RECHAZADO desde `2026-10-14`: quedaron 2 eventos. El CSV descargado se inspeccionó y contiene exactamente el encabezado más `EV-0003` y `EV-0008`.
10. Auditoría incorporó las operaciones de tarjeta, área, lector, permiso, alerta y exportación con administrador, fecha y referencia.
11. Configuración guardó una institución de prueba y 6 registros por página; la cabecera reflejó la institución. El tamaño de página se comparte con los listados.
12. Se abrió el menú móvil y se comprobaron los once apartados, incluido Configuración al final, con desplazamiento disponible. Se navegó a Dashboard desde ese menú.

Se validaron TypeScript, lint, las 24 pruebas, compatibilidad de dependencias y exportación de paquetes web/Android/iOS. Expo Doctor mantiene 21/21 comprobaciones aprobadas.

La plantilla HTML de impresión tiene pruebas de escape y la opción PDF está implementada por plataforma. El guardado final del PDF depende del diálogo del navegador; no se verificó un archivo PDF guardado ni el flujo de compartir archivos en Android/iOS. El SDK Android/adb y un dispositivo siguen sin estar disponibles en este entorno. No se utilizó EAS ni un build personalizado.

## Revisión web del 20/10/2026

- Requisitos contrastados con el documento web original y el backend en el commit 8b9f0ce122e269e7df9bc78a4405df4445d05f20. Resultado detallado: REVISION_REQUISITOS.md.
- 32 pruebas de dominio aprobadas (24 existentes y ocho nuevas), TypeScript sin errores y ESLint sin advertencias.
- Servidor Expo web en el puerto 8092, probado en navegador a 1280 × 900 y 390 × 844.
- Login administrativo y directorio identificado como Empleados, conservando las rutas anteriores.
- Historial: combinación de fecha 2026-10-14, horas 09:00–09:59, Datacenter, Lector 03 y RECHAZADO produjo exactamente EV-0003.
- CSV descargado y leído: una fila de datos, Lucía Fernández, credencial enmascarada, Datacenter, Lector 03 y RECHAZADO. Copia de evidencia en docs/revision-historial.csv.
- Fecha 2026-02-30: error visible, cero resultados y exportación deshabilitada.
- Auditoría: exportación registrada y filtro Historial exportado redujo la lista de tres a un registro.
- Capturas del historial en docs/revision-historial-escritorio.png y docs/revision-historial-movil.png. Sin errores de consola observados en esta revisión.
- No se publicaron cambios en GitHub, no se modificaron el backend ni la app móvil, y no se introdujeron endpoints, JWT ni dispositivos reales.
- La ejecución visual no cubre exhaustivamente todos los módulos, perfiles o criterios de accesibilidad. Los pendientes quedan expresados en la matriz, sin afirmar cumplimiento total.
