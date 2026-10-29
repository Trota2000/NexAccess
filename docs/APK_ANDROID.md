# APK de prueba con GitHub Actions

La compilación parte del código actual de mobile y genera Android mediante Expo CNG. No se versionan ni se editan manualmente los directorios nativos. No requiere cuenta ni token de Expo.

## Compilación

El workflow `Build NexAccess Android APK` se ejecuta al subir cambios móviles a `feature/android-apk-build`. También declara `workflow_dispatch`, utilizable desde Actions si el workflow se integra a la rama por defecto.

1. Instala el package-lock existente con npm ci.
2. Ejecuta TypeScript, pruebas y lint.
3. Genera Android con npx expo prebuild --platform android --no-install.
4. Compila assembleRelease, incluyendo el JavaScript/Hermes y los recursos.
5. Verifica la firma con apksigner y la presencia del bundle en el APK.
6. Publica `NexAccess-APK-prueba` con APK, SHA-256, manifiesto y commit.

Se compila en Linux porque el entorno Windows aislado impidió escribir el bytecode Hermes temporal. No se deshabilita Hermes ni se cambia la lógica de la app para eludir esa restricción.

## Instalación

1. Abrir el run exitoso de Actions y descargar el artefacto NexAccess-APK-prueba (se requiere sesión GitHub).
2. Extraer el ZIP y copiar NexAccess-prueba.apk al teléfono.
3. Abrirlo en Android y autorizar la instalación desde esa fuente si el teléfono lo solicita.
4. Iniciar sesión con una cuenta existente del backend. No hay registro público.

El APK es para dispositivos Android ARM de 64 y 32 bits (arm64-v8a y armeabi-v7a). No incluye binarios de emulador x86. No necesita Expo Go, una computadora ni Metro; sí conexión al backend.

API incorporada en la actualización 1.1.0: https://nx.rattenkoenig.net/api/v1. No se incorporan cuentas, contraseñas ni tokens al APK. Android versionCode: 2. El workflow ignora archivos .env locales para no incorporar el fixture de desarrollo.

## Firma y alcance

Esta es una compilación de prueba: utiliza la firma provisional que genera la plantilla Android de Expo. No contiene una clave privada de producción y no es apta para publicar en Play Store. No se suben keystores como artefactos. Para una distribución definitiva y actualizaciones se debe configurar y conservar una clave de firma propia o las credenciales administradas de EAS.

El identificador Android existente es com.nexaccess.mobile.demo; se conserva. Si hay otra instalación con ese identificador y distinta firma, Android no permitirá actualizarla directamente. El artefacto de Actions se conserva siete días.

Validaciones de compilación y firma no equivalen a ejecutar la app en un teléfono: confirmar login de empleado → Mi tarjeta → copiar instalación → emisión administrativa → actualizar tarjeta → historial → logout y restauración de sesión. La app móvil anterior ya no forma parte de la navegación. HCE y apertura NFC física continúan pendientes y se indican en pantalla. Ver [el flujo de integración](INTEGRACION_MANUAL_V1.md).
