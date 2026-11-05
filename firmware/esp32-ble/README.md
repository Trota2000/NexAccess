# ESP32-S3: NFC existente + Bluetooth LE NexAccess

Base: proyecto compartido por el equipo, con el ajuste HCE compatible con APK 1.2.1.
Agrega BLE NXB1 para APK Android 1.3.0. No necesita conectar otro módulo Bluetooth:
se usa la radio del ESP32-S3; el PN532 continúa dedicado a NFC.

## Instalar

1. Hacer copia del proyecto que actualmente funciona.
2. Abrir esta carpeta como proyecto PlatformIO (contiene `platformio.ini`).
3. Copiar desde el proyecto actual estos dos archivos privados a `src/`:
   - `config_secrets.h`: DEVICE_KEY y WIFI_PORTAL_PASSWORD.
   - `nexaccess_ca.h`: NEXACCESS_CA, certificado CA utilizado con el servidor.
     No reemplazar la clave del dispositivo ni desactivar la validación TLS.
4. Revisar en `src/main.cpp` API_BASE_URL, DEVICE_CODE y los pines del equipo.
   Se mantienen los del proyecto suministrado: PN532 8/9/10/11, OLED 17/18,
   buzzer 42 y botón 0. No se inventa un pin nuevo para un LED separado.
5. PlatformIO: Clean, Build y después Upload. Monitor: 115200.
6. Debe aparecer `[BLE] NexAccess NXB1 listo`, además de los mensajes NFC/Wi-Fi.
7. Preparar una credencial móvil vinculada a ese teléfono, instalar APK 1.3.0 y
   activar Acceso Bluetooth. Probar con la app abierta antes del segundo plano.

Los archivos privados están excluidos de Git y del ZIP de entrega. El archivo
`config_secrets.example.h` es solo una guía, no contiene una clave funcional.
No cargar binarios de CI: se compilan con configuración sintética sin acceso al backend.

## Cambios y comportamiento

- Se agregan `NexAccessBle.h` y `BleFrame.h`; servicio y características definidos
  en `docs/BLUETOOTH_PROTOTIPO.md` del repositorio.
- Los callbacks BLE solo reciben fragmentos y encolan una solicitud completa.
- El loop conserva prioridad NFC; procesa BLE cuando no hay una tarjeta NFC en ese ciclo.
- BLE llama a la misma `verificarAcceso`, con el código digital completo. Se mantiene
  la decisión `authorized` y los indicadores existentes mediante `mostrarResultado`.
- `verificarAcceso` devuelve ahora la decisión para notificar al teléfono: 1 permitido,
  0 rechazado, 2 error. Sus llamadas NFC siguen funcionando sin usar ese retorno.
- Se comparte el cooldown de 2,5 s para no consultar dos veces la misma credencial
  presentada simultáneamente por NFC y BLE. Cada credencial distinta se verifica normalmente.
- Durante configuración Wi-Fi, falta de red/hora o enrolamiento físico activo,
  BLE responde error y no enrola el teléfono como tarjeta física.
- Se conserva la biblioteca PN532 local del paquete anterior.
- PlatformIO se fija en espressif32 8.0.0. Se usa `huge_app.csv` para alojar Wi-Fi,
  TLS y BLE; no conserva una distribución de particiones para OTA. El proyecto
  suministrado no implementa actualización OTA.

No se borran Wi-Fi ni credenciales del servidor. Build no carga el equipo: Upload
debe ejecutarlo quien tenga el ESP32 conectado. Probar tarjetas físicas y enrolamiento
después de cargar, además de acceso permitido, rechazado y backend desconectado por BLE.

Si se sostiene una tarjeta NFC sobre el lector, BLE puede esperar debido a la
prioridad NFC. Alejar las tarjetas físicas para la primera prueba Bluetooth.
Si Windows falla al instalar dependencias por longitud de ruta, mover el proyecto
a una carpeta corta o definir PLATFORMIO_LIBDEPS_DIR / PLATFORMIO_BUILD_DIR.
