# PDF de la web: membrete y disposición

Reportes genera su PDF en el navegador con los datos estructurados de
`POST /reports/generate` (JSON). No necesita modificar la plantilla del backend.
Usa `pdf-lib`, ya instalado: no se agregan dependencias.

## Disposición

- Un único membrete por página, sin el segundo cabecero NexAccess del PDF del servidor.
- Título del reporte, fechas y metadatos a la izquierda; filtros a la derecha.
- Resúmenes y agrupaciones calculados por el backend, sin recalcular contadores.
- Todas las filas y columnas seleccionadas, en el orden recibido. Sin selección,
  las mismas cinco columnas predeterminadas del servidor actual.
- Paginación automática, cabecera de tabla repetida y continuación de celdas largas.
- Pie Control de asistencia o Control de accesos, con número de página.
- Fechas UTC convertidas a America/Asuncion; se conserva la zona en los metadatos.
- Texto WinAnsi seleccionable. Las líneas con otros caracteres se dibujan con
  la fuente del navegador, sin sustituir ni eliminar caracteres.

Asistencia e Historial mantienen su exportación HTML y usan la misma identidad:
fechas y total a la izquierda, filtros a la derecha, pie según el módulo, sin la
nota técnica sobre los horarios del CSV.

## Identidad

1. Empresa y logo configurados: se usan ambos.
2. Empresa sin logo: datos empresariales con logo NexAccess de respaldo.
3. Empresa no configurada (`EMPRESA_NOT_CONFIGURED`): logo NexAccess incluido.

Errores de autenticación, permisos, red o descarga del logo no se interpretan
como ausencia de empresa. Un membrete demasiado extenso produce un error explícito.

## Auditoría y consistencia

El backend registra REPORT_EXPORT únicamente al generar PDF, no JSON.
Para conservarlo, la exportación web realiza estas solicitudes con los mismos
filtros, columnas, agrupaciones y opciones:

1. JSON: obtener y validar el conjunto de datos completo.
2. Preparar el PDF localmente; si falla, no solicitar la auditoría.
3. PDF: mantener la solicitud original que verifica permisos y registra REPORT_EXPORT.
   Ese archivo no se usa para el diseño del documento descargado.
4. JSON: verificar que filas, total y agrupaciones no cambiaron durante el proceso.
   Si cambiaron, no descargar y pedir reintentar.

Esto implica tres consultas y más tiempo y tráfico que la descarga original.
No es una transacción atómica: el frontend no puede garantizar el mismo snapshot
entre solicitudes. Para una garantía transaccional estricta, el backend necesitaría
un identificador de snapshot o una exportación/auditoría basada en ese identificador.
Si falla la comprobación final puede existir una entrada de auditoría, porque el
backend sí generó correctamente su PDF.

La descarga JSON del usuario mantiene una sola solicitud. La descarga administrativa
nativa conserva el PDF del servidor; la app Android personal no contiene este módulo.
No hace falta reconstruir el APK personal.

## Archivos

- `reportSnapshot.ts`: validación, solicitudes y comprobación de cambios.
- `reportPdf.ts`: maquetación, tablas, resúmenes y paginación.
- `serverReportPdf.web.ts`: membrete y representación Unicode en el navegador.
- `reportBranding.ts`, `letterhead.ts`: identidad empresarial compartida.
- `ServerReports.tsx`: integración en la exportación web existente.

Las pruebas cubren contrato, datos incompletos, auditoría, cambios concurrentes,
fallos y paginación. La revisión visual utiliza datos sintéticos.
No se ha verificado una exportación autenticada en producción.
