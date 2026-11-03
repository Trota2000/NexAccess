# NexAccess Android 1.3.0 — Bluetooth LE NXB1

Alternativa a NFC para el prototipo: el ESP32-S3 anuncia un servicio BLE y el
teléfono se conecta automáticamente al detectar señal cercana. El ESP32 reutiliza
su conexión Wi-Fi y `POST /api/v1/access/verify`. La app muestra autorización
únicamente al recibir la respuesta del lector. No hay botones que pulsar en cada acceso.

## Preparación

1. Instalar el APK 1.3.0 (versionCode 5) e iniciar sesión como empleado.
2. En Mi tarjeta, copiar el identificador de instalación. Mantener la sesión abierta.
3. En la web, emitir una credencial digital para ese empleado y esa instalación.
   Actualizar Mi tarjeta y seleccionar esa credencial si hay varias.
4. Debe desaparecer cualquier error de vinculación. El error «Credencial con
   identificador ... no existe» también indica credencial de otra instalación;
   activar Bluetooth no resuelve ese error del backend.
5. En Acceso Bluetooth, activar el interruptor y conceder dispositivos cercanos
   y notificaciones. En Android 11/anterior se necesita permiso de ubicación y
   puede ser necesario activar Ubicación del sistema para descubrir lectores.
6. Primera prueba: elegir Solo con la app abierta y dejar el teléfono desbloqueado.
7. Acercarse al ESP32 con firmware `firmware/esp32-ble` configurado. Tras detectar
   señal suficiente, la app conecta, presenta la tarjeta y espera el resultado.
8. Comprobar el resultado en el lector y el historial personal. Para otro intento,
   alejarse y volver a acercarse; permanecer al lado no debe generar accesos continuos.

La sesión no almacena la contraseña. La credencial se obtiene usando el Bearer
de la sesión móvil en `GET /me/credentials/{id}/nfc`, existente en el backend.
El código no se muestra ni se copia. Al cerrar sesión se eliminan las credenciales
locales NFC y BLE y se detiene el servicio Bluetooth.

## Modos y límites de Android

- Foreground: solo app visible y pantalla desbloqueada.
- Unlocked: también en segundo plano, con pantalla encendida y desbloqueada.
- Always: puede usar pantalla bloqueada; depende de Android y del fabricante.

El servicio Android es de tipo `connectedDevice` y muestra una notificación con
acción Detener. Se activa desde la app, con consentimiento. No es un servicio
oculto. No se garantiza funcionamiento después de Forzar detención, reinicio,
restricciones de batería, permisos revocados o apagado del teléfono/Bluetooth.
Reabrir la app y desactivar/activar Bluetooth de NexAccess si Android detuvo el
servicio. Los modos en segundo plano deben probarse especialmente en Android
11/anterior; la primera validación se realiza en primer plano.

No requiere emparejar desde Ajustes Bluetooth. Expo Go y navegador no incluyen
el módulo; hay que instalar el APK compilado con los plugins CNG de NFC y BLE.
No se añadieron dependencias npm: se utilizan las APIs nativas de Android.

## Protocolo compartido con el ESP32

| Elemento                           | UUID / valor                                                        |
| ---------------------------------- | ------------------------------------------------------------------- |
| Servicio anunciado                 | `f04e4558-4143-4001-8000-000000000001`                              |
| Credencial: WRITE con respuesta    | `f04e4558-4143-4001-8000-000000000002`                              |
| Resultado: READ + NOTIFY, CCC 2902 | `f04e4558-4143-4001-8000-000000000003`                              |
| Frame                              | ASCII `NXB1`, longitud uint16 big-endian, credencial ASCII completa |
| Longitud                           | 1 a 160 bytes, sin cambios de mayúsculas, hash ni recortes          |
| Fragmentación GATT                 | bloques de hasta 20 bytes; esperar callback de cada WRITE           |
| Resultado                          | 3 bytes ASCII: `NXA` autorizado, `NXD` rechazado, `NXE` error       |
| Estado inicial                     | `NXW`, pendiente; nunca interpretar como autorización               |

La app habilita notificaciones antes de escribir. No necesita negociar un MTU
mayor. El ESP32 arma el frame, lo encola y hace HTTPS desde el loop, nunca desde
un callback BLE. Una conexión admite una presentación; se reconecta para la siguiente.
La respuesta se entrega a la misma conexión que presentó la credencial.

Detección inicial: dos anuncios al menos a -58 dBm, separados por 150 ms y dentro
de 2,5 s. Rehabilitar después de 3 s por debajo de -68 dBm o 15 s sin anuncios.
RSSI no mide distancia exacta: ajustar esos umbrales en `BleProtocol.Gate` tras
probar el teléfono, orientación y montaje. BLE no replica la zona de centímetros
de NFC; puede detectar a través de una pared o desde más lejos de lo deseado.

## Backend

No se agregan endpoints, roles ni cambios de base de datos. Se reutilizan la emisión
por installationId, obtención de la credencial digital y verificación del lector.
El ESP32 conserva X-DEVICE-KEY; jamás se entrega a la app. La cuenta, instalación,
credencial, lector y permiso de área deben estar activos. El historial conservará
el origen/dispositivo que actualmente registra el backend; distinguir BLE de NFC
como un origen nuevo requeriría acordar otro cambio de contrato.

Es un prototipo de credencial estática sin cifrado/autenticación BLE de aplicación.
No incluye protección contra un lector falso ni copia/retransmisión. No se presenta
como implementación segura para producción.

## Firmware y validación

Ver `firmware/esp32-ble/README.md`. La base es el código ESP32-S3 suministrado y
ajustado anteriormente para APK 1.2.1, no una descarga nueva de un repositorio de
firmware. Se conservan PN532, enrolamiento físico, WiFiManager, OLED y buzzer.

Pruebas automatizadas: frame exacto y fragmentado, decisiones explícitas, proximidad
y reentrada, permisos/estados de interfaz, y regresión de la app. El workflow APK
compila Android, inspecciona ambos servicios nativos y ejecuta pruebas Java; otro
job prueba el parser C++ y compila el firmware con claves sintéticas.

La compilación y los fixtures no verifican radio BLE, latencia, distancia, consumo,
modo bloqueado, permisos reales ni el equipo físico. La validación completa requiere
teléfono + ESP32 + backend con una credencial correctamente vinculada.
