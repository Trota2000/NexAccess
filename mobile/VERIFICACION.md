# Verificación — 20/10/2026

Entorno: Windows, Node 24.19.0, Expo 57.0.30, Expo Router 57.0.28, React 19.2.3 y React Native 0.86.3.

## Comprobaciones completadas

- TypeScript: `tsc --noEmit`, sin errores.
- ESLint: se ejecutó el chequeo de `src` y `tests` con la configuración de Expo, sin errores ni advertencias en la versión final.
- Jest + React Native Testing Library: **16 pruebas aprobadas**, dos suites. Incluyen estados de credencial, relaciones de datos, separación de roles, login, acceso restringido, validación del formulario, mostrar/ocultar contraseña, búsqueda vacía, notificaciones ajenas, ventana de duplicación, fecha futura, motivo, auditoría de correcciones y permisos de escritura.
- `expo install --check`: dependencias actualizadas y compatibles.
- `expo-doctor`: **21/21 comprobaciones aprobadas**.
- Exportación final **aprobada para web, Android e iOS**: JS web de 5,3 MB y bundles Hermes de 7,3 MB para Android y 7 MB para iOS, más 52 assets. Resultado local: `work/mobile-bundles-final`, fuera del paquete de código fuente.

El renderer de pruebas está fijado en `test-renderer@1.2.0`, compatible con React 19.2. Los iconos se sustituyen por vistas en los tests de comportamiento. Jest almacena su caché dentro del proyecto para evitar problemas con temporales de Windows.

## Revisión visual e interactiva

Se ejecutó primero `npx expo start --go --web --port 8090`. Se probó la interfaz en el navegador integrado con viewport de teléfono de 390 × 844:

- Inicio de sesión con usuario de demostración.
- Cinco pestañas personales y tarjeta de credencial.
- Perfil y cambio de Empleado a Recursos Humanos.
- Menú de herramientas limitado al rol.
- Panel de RRHH y asistencia general.
- Formulario de corrección, motivo, confirmación y resultado local.
- Una corrección de prueba aumentó el historial de 40 a 41 registros y apareció en el calendario.
- En la revisión final con datos restablecidos, tocar el día 19 en Mi asistencia redujo la lista de diez a dos marcaciones; el calendario se revisó a 390 píxeles sin desbordamiento.

Se corrigió un espacio de JSX fuera de Text detectado durante esta revisión, se ajustaron los días del calendario para teléfonos estrechos y se utilizó un solo modal para el flujo de corrección, adecuado también para iOS.

## Expo Go y plataformas nativas

Se intentó `npx expo start --go --android --port 8091`. Metro inició, pero la apertura de Android falló porque este equipo no tiene Android SDK ni `adb`. No hubo dispositivo físico ni emulador disponible.

**No se afirma verificación de ejecución nativa en Android o iOS.** La prueba de hardware pendiente es abrir Expo Go compatible con SDK 57 y escanear el QR de `npm start` en la misma red. No se creó un dev client, build personalizado ni trabajo EAS.

El comando de exportación de JS y assets para las tres plataformas es:

```powershell
npx expo export --platform all --max-workers 2 --output-dir ../../work/mobile-bundles-final
```

La exportación comprueba compilación, no sustituye una prueba en dispositivo.

El sandbox de Windows bloqueó inicialmente la escritura del bytecode en su carpeta temporal. Se resolvió apuntando `TEMP` y `TMP` a `work/mobile-temp` y se repitió la exportación completa con éxito. El servidor web final quedó en `http://localhost:8090`. Las capturas de revisión están en `docs/screenshots`.

## Límites de esta entrega

Prototipo con datos ficticios y persistencia local. Sin solicitudes HTTP, JWT real, backend, PostgreSQL, ESP32, push ni NFC real. Los módulos administrativos priorizan consulta, cambios de estado y formularios de empleados/permisos. Las diferencias de contratos y las funciones móviles propuestas están en [INTEGRACION.md](INTEGRACION.md).

El instalador reporta avisos de seguridad en dependencias transitivas del árbol de desarrollo. No se forzaron actualizaciones mayores fuera de la compatibilidad del SDK. La aplicación requiere una revisión de dependencias y seguridad antes de producción.
