# Empresa, membrete PDF y pantalla inicial

Integración basada en la documentación de Empresas v1 proporcionada el 28/10/2026. Una empresa por instalación; no se incorpora selección multiempresa.

## Uso

1. Iniciar sesión: la primera pantalla es Dashboard para ADMIN, RRHH y SEGURIDAD.
2. Abrir Configuración → Datos de la empresa.
3. ADMIN puede guardar razón social, nombre de fantasía, RUC, dirección, teléfono y correo. El estado `activo`, el ID y `tieneLogo` son de lectura y no se envían al PUT.
4. Guardar la empresa antes de subir un PNG/JPEG de hasta 2 MiB. Se validan tamaño, MIME y firma básica; la validación definitiva corresponde al backend.
5. Reemplazar o eliminar el logo; eliminar requiere confirmación y conserva los datos empresariales.
6. En Historial de accesos o Asistencia, aplicar Desde/Hasta con calendario y usar Exportar PDF. El documento incluye datos empresariales y el logo recuperados nuevamente del servidor, junto con todos los registros del CSV y los filtros vigentes.
7. RRHH y SEGURIDAD pueden consultar la empresa y el logo, sin botones de escritura. Sus módulos de exportación mantienen los permisos existentes.

El RUC tiene límite de longitud; no se afirma validar su dígito verificador. Si la API devuelve 404 EMPRESA_NOT_CONFIGURED se muestra formulario vacío a ADMIN y aviso a los demás perfiles. Un PDF sin empresa configurada conserva el encabezado NexAccess. Los errores de red/permisos/contrato al obtener una empresa o un logo configurado detienen la exportación; no se sustituye silenciosamente una identidad fallida.

## API y autenticación

| Operación | Solicitud | Respuesta |
|---|---|---|
| Consultar | GET /empresa | JSON empresarial |
| Crear/actualizar | PUT /empresa | JSON empresarial confirmado |
| Subir/reemplazar | POST /empresa/logo | FormData con campo logo; JSON empresarial |
| Leer logo | GET /empresa/logo | Binario PNG/JPEG autenticado |
| Eliminar logo | DELETE /empresa/logo | 204, seguido de GET /empresa para verificar tieneLogo=false |

Todas las solicitudes usan el ApiClient existente y bearer en el encabezado, nunca en una URL ni en el PDF. Multipart deja Content-Type/boundary al cliente HTTP. La imagen se convierte en data URL en memoria para vista previa e impresión, sin persistirla en localStorage ni depender de una URL pública o del token en img.src. La sesión, cancelación, tiempo de espera y descarte de respuestas antiguas del cliente se mantienen. Los errores de escritura de resultado incierto bloquean repeticiones hasta una actualización satisfactoria.

Web continúa usando /api/v1 con el proxy existente; no cambia la URL del backend. El Nginx del contenedor admite cuerpos de hasta 3 MiB en /api/ para cubrir archivos de 2 MiB más multipart. **El proxy externo del servidor también debe admitir al menos 3 MiB**; su configuración está fuera de este repositorio. El backend conserva la validación del archivo de hasta 2 MiB.

El membrete se incorpora al HTML/PDF generado por este frontend desde el CSV autenticado. No modifica los PDF que se descarguen directamente de otros endpoints del backend ni su implementación QuestPDF. No modifica backend, PostgreSQL, filtros ni datos de reportes.

## Dependencias y ejecución

Se agregó únicamente expo-document-picker ~57.0.3 mediante npx expo install en web y mobile. Usa expo-file-system ya instalado para leer el archivo en móvil. DocumentPicker está incluido en Expo Go SDK 57; no exige un dev client para probar este módulo. Un APK existente necesita una nueva compilación si no incluía el módulo.

```powershell
cd web
npm ci
npm run web:api
```

La URL local es http://localhost:8091/login; desde el login se entra a Dashboard. Conservar la configuración existente del gateway cuando corresponda. Para móvil, dentro de mobile: npm ci y npx expo start --go; mantener EXPO_PUBLIC_API_URL configurada con el backend HTTPS.

## Validación realizada

- 52 pruebas de integración, incluyendo cinco endpoints, roles, JWT, multipart sin Content-Type manual, lectura binaria, 204, sesión expirada, descarte tras logout, límites/tipos/firma y escaping del membrete.
- 52 pruebas de interfaz: módulos existentes, inicio en Dashboard y administración empresarial en claro/oscuro, permisos, creación inicial, carga, cancelación/confirmación de eliminación y bloqueo de escritura incierta.
- 32 pruebas del prototipo web existente.
- TypeScript, lint y sincronización de ambas aplicaciones.
- Exportación Expo web de producción.
- Navegador con fixture local: inicio en Dashboard (ADMIN y RRHH), guardado de datos, carga autenticada de imagen real PNG, consulta por RRHH sin acciones de escritura, confirmación/cancelación y eliminación con conservación de datos; vista de 390 px sin desborde y consola sin errores.
- Exportar PDF con fechas elegidas por calendario se invocó hasta el diálogo nativo de impresión. Ese diálogo impidió inspección automatizada: se revisó visualmente el mismo HTML de impresión generado con empresa, logo y CSV recuperados de la API sintética. La imagen carga correctamente; el reporte mantiene el registro y el rango de fechas.
- GET /empresa sin token devuelve 401 tanto en https://nx.rattenkoenig.net/api/v1 como a través de https://nexaccess.rattenkoenig.net/api/v1 (28/10/2026). No se efectuaron escrituras ni login de prueba en producción.

## Pendiente de verificación manual

- Probar con cuentas reales de los tres perfiles contra el backend publicado.
- Guardar físicamente un PDF en los navegadores objetivo y revisar paginación de reportes extensos; la vista HTML revisada no reemplaza esa verificación.
- Subir/reemplazar imágenes cerca de 2 MiB a través del proxy externo para confirmar sus límites.
- Probar selección de archivos, impresión y compartir en Expo Go/dispositivo Android/iOS. No se ejecutó un APK, simulador ni EAS durante este cambio.
- El servidor sigue siendo responsable de permisos, validación final y persistencia de logos entre despliegues.
