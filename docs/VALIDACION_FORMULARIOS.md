# Validación de formularios

Los formularios administrativos comparten reglas en `integration/source/resources.ts`, sincronizadas con web y móvil. Se conservan los endpoints, DTO, permisos y confirmaciones existentes.

- Documento de empleado: de 3 a 20 dígitos, sin separadores. Se conserva como texto para no perder ceros iniciales. El formulario actual representa documento numérico; si se incorporan pasaportes alfanuméricos, deben distinguirse mediante un tipo de documento y una regla acordada con backend.
- Teléfono de empleado/empresa: de 6 a 15 dígitos. Admite formato local o internacional, `+` inicial, espacios, guiones y paréntesis equilibrados; no admite letras. No se cambia el número ni se elimina contenido pegado silenciosamente.
- Correo de empleado/empresa: dirección completa con un solo `@`, parte local válida y dominio con extensión. Admite dominios distintos de Gmail y subdominios. Rechaza espacios, puntos consecutivos, dominios incompletos y etiquetas de dominio inválidas. Valida formato; no comprueba la existencia de la casilla.
- Nombres y apellidos: letras Unicode, tildes, espacios, puntos, apóstrofes y guiones. No se cambia su capitalización.
- RUC de empresa: números y un guion opcional seguido de un dígito verificador. No se calcula ni se afirma validar su checksum fiscal.
- Códigos, usuarios, IDs, opciones, fechas, horarios y longitudes: se mantienen los formatos y límites existentes y se muestran errores por campo. Los textos libres de direcciones, motivos y descripciones no se limitan a letras. Las contraseñas no se recortan ni se filtran.

Los campos opcionales vacíos siguen enviándose como `null`. Los campos numéricos rechazan cambios con caracteres incompatibles, incluido pegado. Los errores se muestran al salir del campo o revisar/guardar; un formulario inválido no llega a la confirmación ni envía una escritura a la API. Las respuestas de error del servidor se conservan.

## Backend

En el backend revisado (`sof2702/NexAccess@f4dc357`), `EmployeeRequest` valida longitudes y correo, pero no restringe documento/teléfono. `EmpresaRequest` tampoco restringe teléfono/RUC. El frontend no sustituye la validación del servidor: replicar las reglas acordadas en los DTO/validadores de creación y edición, devolviendo `VALIDATION_ERROR` y errores por campo. No se modificó el repositorio del backend ni se corrigieron datos existentes automáticamente.

## Verificación

Las pruebas cubren escritura y pegado de caracteres inválidos, formatos de correo, teléfonos locales/internacionales, ceros iniciales, nombres con Unicode, campos opcionales, RUC y bloqueo de escrituras inválidas en crear/editar empleado y datos empresariales. Los casos de interfaz se ejecutan en temas claro y oscuro con datos sintéticos.
