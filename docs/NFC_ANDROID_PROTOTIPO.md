# Android NFC — prototipo NexAccess 1.2.1

## Alcance

Solo se modifica la app Android y su compilación. No se modifica el backend ni se entrega firmware del ESP32. La pantalla OLED y el buzzer existentes pueden mostrar la autorización; no hay control de cerradura.

La app implementa HCE nativo mediante un config plugin Expo (fuentes en `mobile/plugins/nexaccess-hce`). Expo Go y el navegador no contienen este servicio: requieren instalar el nuevo APK.

## Prueba de compatibilidad 1.2.1 con el prototipo del compañero

La app conserva NX01 (AID de 8 bytes y lectura por fragmentos) y agrega el AID de 7 bytes `F04E4558414301` del ZIP `NexAccess_HCE_prototipo.zip` y del `main.cpp` compartido. No se incorpora el módulo Kotlin ni el script del ZIP: se mantienen la sesión, almacenamiento, vencimiento y los tres modos del módulo existente.

Para ese lector, la app admite exactamente `00 A4 04 00 07 F0 4E 45 58 41 43 01`, también con `00` final. Responde `[credencial completa en ASCII][90 00]`, sin marcador NX01, prefijo de longitud, recortes ni cambios del código. No hace falta enviar READ en este modo. Sin credencial o si el modo/fecha no permite presentarla devuelve `69 85`.

El backend revisado genera 32 bytes aleatorios codificados en hexadecimal: 64 caracteres. La respuesta directa ocupa 66 bytes. El búfer de 220 bytes declarado por el firmware no amplía el búfer interno de la biblioteca Adafruit PN532. Su responsable debe comprobar que su versión/transporte reciba la respuesta completa; de lo contrario habrá que ajustar el lector o usar NX01 por fragmentos. También sigue pendiente inicializar el target de `inDataExchange()` correctamente. Estos problemas del lector no se pueden resolver recortando o codificando de otra forma la credencial desde la app, porque el backend espera su valor exacto.

Para probar: actualizar el APK sin desinstalar la versión anterior, activar NFC, abrir Mi tarjeta y comprobar que la credencial se haya preparado. Usar primero modo desbloqueado y app abierta con el firmware compartido del compañero. Si falla, recoger el estado/error de selección e intercambio del PN532 y el estado HTTP del backend, sin imprimir el código de la credencial. Un mensaje verde de preparación en la app no prueba recepción ni autorización en el ESP32.

La compatibilidad de protocolo se prueba con el SELECT literal del compañero y con un código sintético de 64 caracteres, reproduciendo su parser ASCII/estado tras un transporte NFC correcto. No se ha probado el equipo físico. No se modificó firmware ni backend.

## Preparar el teléfono

1. Instalar APK 1.2.1, activar NFC e iniciar sesión como empleado habilitado para móvil.
2. Copiar el identificador de instalación desde Mi tarjeta.
3. Un administrador emite la credencial DIGITAL para ese empleado y ese identificador. El empleado debe tener los permisos del área del lector.
4. Actualizar Mi tarjeta y seleccionar la tarjeta correspondiente si hay varias. La app solicita `GET /api/v1/me/credentials/{id}/nfc` con Bearer y prepara automáticamente el servicio HCE.
5. Debe aparecer **Tarjeta preparada para NFC**. Esto confirma preparación local, no autorización del acceso ni comunicación probada con el lector.
6. Para la primera prueba usar pantalla desbloqueada y app abierta. Acercar la antena NFC del teléfono al PN532 y mantenerla cerca hasta el resultado.

La credencial no aparece en pantalla, historial, portapapeles ni estado React. El servicio nativo conserva el código para responder sin JavaScript en segundo plano. Logout lo elimina. También comprueba su fecha de vencimiento local, cuando existe. El backend conserva la decisión final.

Los modos foreground/unlocked se comprueban en el servicio nativo. Always permite responder bloqueado si Android lo admite; NFC seguro, pantalla apagada, force-stop y restricciones del fabricante pueden impedirlo. No se promete lectura con teléfono apagado.

## Qué falta en el ESP32 (sin cambios de firmware incluidos)

El `main.cpp` compartido solo toma el UID mediante `readPassiveTargetID()` y llama a `verificarAcceso(uidTexto)`. Su compañero debe agregar lectura ISO-DEP/APDU para obtener el código DIGITAL y pasar ese código a la misma función, conservando la rama física por UID.

Contrato experimental NX01 (se conserva para lectores que usen fragmentos):

- AID: `F04E455841434301` (prototipo privado; no es un AID registrado).
- SELECT: `00 A4 04 00 08 F0 4E 45 58 41 43 43 01 00` (también se admite sin el último `00`).
- Respuesta SELECT: `4E 58 01 90 00`. Solo identifica el protocolo; puede aparecer aunque no haya credencial disponible.
- Leer fragmento: `80 CA OFFSET_HI OFFSET_LO 00`. Primer offset 0; siguientes 32, 64, 96, 128.
- Respuesta: `[longitud total, 2 bytes big-endian][fragmento de hasta 32 bytes ASCII][90 00]`.
- Máximo total 160 bytes. Concatenar fragmentos hasta esa longitud, verificando longitud constante y respuesta exacta por fragmento. El código se envía sin transformarlo a hexadecimal, sin separadores ni cambios de mayúsculas.
- `69 85`: tarjeta no preparada, vencida, modo no permitido, logout o credencial cambiada durante la lectura. No enviar el UID como sustituto de una credencial NexAccess reconocida.
- `6B 00`: offset inválido; `67 00`: longitud inválida; `6D 00`: comando desconocido.
- Tras detectar el teléfono, seleccionar la app y leer todos los fragmentos durante el mismo acercamiento. No hacer consultas HTTP durante ese intercambio: realizar la consulta al backend después de obtener el código completo.
- La librería Adafruit usa `_inListedTag` en `inDataExchange()`. El código oficial inicializa ese valor en `inListPassiveTarget()`, no en `readPassiveTargetID()`; el firmware debe inicializar correctamente el target antes del intercambio.
- Aplicar cooldown por código digital, porque el UID Android no identifica permanentemente la instalación.
- No enrolar el UID del teléfono como tarjeta física; la emisión DIGITAL se realiza en la web.

Con el código recibido, reutilizar exactamente:

```http
POST https://nx.rattenkoenig.net/api/v1/access/verify
X-DEVICE-KEY: <clave que ya posee el ESP32>
Content-Type: application/json

{"deviceCode":"ESP_TI","credential":"<codigo completo recibido por APDU>"}
```

Solo indicar autorizado cuando la respuesta HTTP/JSON válida tenga `authorized: true` y `action: "OPEN"`, como hace hoy el firmware. La app no almacena X-DEVICE-KEY ni se comunica con ese endpoint.

## Backend

Según el contrato revisado, ya existen login móvil con installationId, emisión DIGITAL por instalación, obtención NFC por credencial y verificación de acceso. Para este prototipo de código estático no se propone un endpoint adicional.

Comprobar en el servidor publicado que: la credencial pertenece al empleado y a la instalación de la sesión; el endpoint NFC devuelve `{credentialId, credential, expiresAt}`; `/access/verify` acepta ese código DIGITAL; la cuenta, credencial, instalación/sesión y permisos están activos.

`/me/credentials` puede listar tarjetas de otras instalaciones del mismo empleado. Si hay varias, el endpoint NFC debe rechazar las no vinculadas y la app mostrará su error. Mejora pendiente de backend: filtrar por instalación o devolver un indicador de vinculación para elegir automáticamente sin ambigüedad.

Este prototipo transmite un código estático. No implementa desafío/respuesta ni protección contra copia/retransmisión, según el alcance solicitado.

## Verificación

Pruebas del cliente: provisión del código correcto, rechazo de respuesta de otra tarjeta, ausencia del código en sesión/UI y respuesta tardía después de logout. Pruebas Java del protocolo: selección, fragmentación, modos, revocación/cambio y APDU inválido. CI compila el APK y comprueba servicio/AID en su manifiesto.

La compilación y estas pruebas no sustituyen la prueba física PN532 + teléfono + backend. No se ha probado físicamente en este entorno. El firmware original todavía no implementa este contrato; instalar solo el APK no completa el recorrido.
