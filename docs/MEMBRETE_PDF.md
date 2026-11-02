# Membrete de los PDF de la web

Reportes añade el membrete al PDF recibido de `/reports/generate`, reservando un
espacio por encima de cada página. El contenido original se conserva como PDF
vectorial, ajustado proporcionalmente para no tapar tablas, resúmenes o pies.
Se mantienen filtros, agrupaciones, columnas, rango de fechas, páginas y formato
JSON. No se modifica el backend ni se vuelve a consultar el detalle del reporte.

Asistencia e Historial reutilizan la misma identidad empresarial en sus PDF HTML.

## Prioridad de identidad

1. Empresa y logo configurados: se usan ambos.
2. Empresa configurada sin logo: se conservan razón social y demás datos, usando
   el logo de NexAccess como respaldo.
3. Empresa no configurada (`EMPRESA_NOT_CONFIGURED`): membrete NexAccess con el
   logo incluido en la aplicación.

Un error de autenticación, permisos, red o descarga de un logo configurado no se
interpreta como ausencia de empresa: se muestra el error para poder reintentar.
Los logos se incorporan al documento como datos de imagen, sin URLs con tokens.

## Implementación y alcance

- `integration/source/letterhead.ts`: identidad y encabezado HTML compartidos.
- `reportBranding.ts`: selección de logo empresarial o asset NexAccess.
- `serverReportPdf.web.ts`: encabezado rasterizado a alta resolución, con ajuste
  de texto y soporte de los caracteres de la empresa proporcionado por el navegador.
- `stampPdf.ts`: composición del encabezado y cada página del PDF original.
- `serverReportPdf.ts`: conserva la descarga administrativa nativa existente; esta
  mejora de Reportes se aplica a la web. La app Android personal no contiene este módulo.

`pdf-lib` se carga en el paquete web para componer PDF existentes y `expo-asset`
resuelve el logo empaquetado, también cuando cambia la URL del sitio. Ambas apps
declaran las dependencias porque el repositorio sincroniza el código API y verifica
los archivos web en ambos proyectos. No hace falta reconstruir el APK personal.

Los reportes son documentos generados, sin formularios interactivos ni firmas.
La composición mantiene texto y gráficos del cuerpo, pero no se ofrece como editor
de anotaciones, adjuntos o firmas PDF. Un membrete que no cabe legiblemente en la
página produce un error explícito, sin recortar sus datos.

## Verificación

- Pruebas de selección de identidad: con empresa/logo, empresa sin logo y empresa
  ausente. Se conservan errores de acceso, red y logo.
- Validación de logo y escape de campos HTML.
- Composición multipágina, horizontal, vertical y con rotación, sin modificar la
  entrada ni perder páginas.
- Pruebas existentes de filtros, fechas, permisos y transporte PDF/JSON.
- Revisión visual en Chromium con datos sintéticos y nombres/direcciones largos;
  comprobación de última fila de cada página mediante extracción de texto.

No se ha realizado una descarga autenticada contra producción con datos reales.
