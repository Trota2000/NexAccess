#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <ESPmDNS.h>

#include <Adafruit_PN532.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include "config_secrets.h"
#include "nexaccess_ca.h"
#include "NexAccessBle.h"

NexAccessBle bluetoothAccess;
String lastVerifiedCredential;
unsigned long lastVerifiedAt = 0;
int lastVerifiedDecision = 2;

// ==========================================
// NEXACCESS - ESP32-S3
// NFC + OLED + BUZZER + WIFI MANAGER + API
// ==========================================

// PN532
#define SDA_PIN 8
#define SCL_PIN 9
#define PN532_IRQ 10
#define PN532_RESET 11

// OLED
#define OLED_SDA 17
#define OLED_SCL 18
#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_ADDRESS 0x3C

// BUZZER
#define BUZZER_PIN 42

// Boton BOOT de la mayoria de ESP32-S3
#define CONFIG_BUTTON_PIN 0

const int WIFI_RSSI_MIN = -80;
const unsigned long WIFI_WEAK_TIMEOUT_MS = 15000;

unsigned long wifiWeakSince = 0;

// ==========================================
// CONFIGURACION
// ==========================================

const char *API_BASE_URL =
    "https://nx.rattenkoenig.net";

const char *DEVICE_CODE =
    "ESP_TI";
// const char *DEVICE_CODE =
//   "NEXACCESS-ESP32-01";

const char *AP_NAME = "NexAccess";

const unsigned long COMMAND_INTERVAL_MS = 3500;
const unsigned long WIFI_RETRY_MS = 15000;
const unsigned long SAME_UID_COOLDOWN_MS = 2500;
const unsigned long RESULT_DISPLAY_MS = 3000;
const unsigned long CONFIG_BUTTON_HOLD_MS = 5000;

const int HTTP_TIMEOUT_MS = 4000;

// ==========================================
// HARDWARE
// ==========================================

TwoWire WireOLED = TwoWire(1);

Adafruit_PN532 nfc(
    PN532_IRQ,
    PN532_RESET,
    &Wire);

Adafruit_SSD1306 display(
    OLED_WIDTH,
    OLED_HEIGHT,
    &WireOLED,
    -1);

WiFiManager wifiManager;

// ==========================================
// ESTADO
// ==========================================

unsigned long lastCommandCheck = 0;
unsigned long lastWifiAttempt = 0;
unsigned long lastUidAt = 0;
unsigned long resultUntil = 0;
unsigned long configButtonStart = 0;

String lastUid = "";

long enrollmentId = 0;

bool clockReady = false;
bool pantallaResultadoActiva = false;
bool portalActivo = false;
bool botonConfigProcesado = false;

// ==========================================
// BUZZER
// ==========================================

void beep(int frequency, int durationMs)
{
    tone(BUZZER_PIN, frequency);
    delay(durationMs);
    noTone(BUZZER_PIN);
}

void sonidoInicio()
{
    beep(1500, 100);
}

void sonidoPermitido()
{
    beep(1800, 100);
    delay(80);
    beep(2400, 150);
}

void sonidoDenegado()
{
    beep(450, 300);
}

// ==========================================
// OLED
// ==========================================
void mostrarOLED(
    const String &titulo,
    const String &centro,
    const String &pie)
{
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextWrap(false);

    int16_t x1, y1;
    uint16_t w, h;

    // ======================================
    // ENCABEZADO NEXACCESS
    // ======================================

    display.setTextSize(1);

    display.getTextBounds(
        "NEXACCESS", 0, 0,
        &x1, &y1, &w, &h);

    display.setCursor((OLED_WIDTH - w) / 2, 0);
    display.print("NEXACCESS");

    display.drawLine(
        0, 12, OLED_WIDTH - 1, 12,
        SSD1306_WHITE);

    // ======================================
    // TITULO: BIENVENIDO / HASTA LUEGO
    // ======================================

    display.setTextSize(1);

    display.getTextBounds(
        titulo, 0, 0,
        &x1, &y1, &w, &h);

    display.setCursor(
        max(0, (OLED_WIDTH - (int)w) / 2),
        19);

    display.print(titulo);

    // ======================================
    // NOMBRE / MENSAJE PRINCIPAL
    // ======================================

    display.setTextSize(2);

    display.getTextBounds(
        centro, 0, 0,
        &x1, &y1, &w, &h);

    // Reducir el tamaño si no entra
    if (w > OLED_WIDTH - 4)
    {
        display.setTextSize(1);

        display.getTextBounds(
            centro, 0, 0,
            &x1, &y1, &w, &h);
    }

    int posicionX =
        max(0, (OLED_WIDTH - (int)w) / 2);

    // Centrado vertical de la línea principal
    int posicionY =
        35 + (16 - (int)h) / 2;

    display.setCursor(posicionX, posicionY);
    display.print(centro);

    // ======================================
    // PIE: ENTRADA / SALIDA REGISTRADA
    // ======================================

    display.setTextSize(1);

    display.getTextBounds(
        pie, 0, 0,
        &x1, &y1, &w, &h);

    display.setCursor(
        max(0, (OLED_WIDTH - (int)w) / 2),
        55);

    display.print(pie);

    display.display();
}
void pantallaEspera()
{
    if (portalActivo)
    {
        mostrarOLED(
            "CONFIGURAR WIFI",
            "NexAccess",
            "192.168.4.1");
    }
    else if (
        WiFi.status() != WL_CONNECTED ||
        !clockReady)
    {
        mostrarOLED(
            "SIN CONEXION",
            "OFFLINE",
            "Acceso bloqueado");
    }
    else if (enrollmentId > 0)
    {
        mostrarOLED(
            "ENROLAMIENTO",
            "ACERQUE",
            "Tarjeta nueva");
    }
    else
    {
        mostrarOLED(
            "Sistema listo",
            "ACERQUE",
            "su tarjeta NFC");
    }
}

void mostrarResultado(
    const String &titulo,
    const String &centro,
    const String &detalle,
    bool permitido)
{
    mostrarOLED(titulo, centro, detalle);

    if (permitido)
    {
        sonidoPermitido();
    }
    else
    {
        sonidoDenegado();
    }

    pantallaResultadoActiva = true;
    resultUntil = millis() + RESULT_DISPLAY_MS;
}

// ==========================================
// WIFI MANAGER
// ==========================================

// Se ejecuta cuando WiFiManager abre el AP.
void alIniciarPortal(WiFiManager *manager)
{
    portalActivo = true;
    clockReady = false;

    Serial.println();
    Serial.println("========================");
    Serial.println("[WIFI] PORTAL ACTIVADO");
    Serial.println("[WIFI] SSID: NexAccess");

    Serial.print("[WIFI] IP: ");
    Serial.println(WiFi.softAPIP());

    Serial.println(
        "[WIFI] Abrir http://192.168.4.1");

    Serial.println("========================");

    pantallaEspera();
}

// Preparacion comun del portal Wi-Fi.
void configurarWiFiManager()
{
    wifiManager.setAPCallback(alIniciarPortal);

    // Segundos, no milisegundos.
    wifiManager.setConnectTimeout(10);
    wifiManager.setSaveConnectTimeout(15);

    // El portal se cierra tras 3 minutos
    // sin completar la configuracion.
    wifiManager.setConfigPortalTimeout(180);

    wifiManager.setDebugOutput(false);
}

// Primera conexion al iniciar.
bool iniciarWiFi()
{
    portalActivo = false;
    clockReady = false;

    Serial.println("[WIFI] Iniciando WiFiManager");

    mostrarOLED(
        "Conectando...",
        "WIFI",
        "Espere...");

    WiFi.mode(WIFI_STA);

    wifiManager.setHostname("nexaccess");

    bool conectado = wifiManager.autoConnect(
        AP_NAME,
        WIFI_PORTAL_PASSWORD);

    portalActivo = false;

    if (!conectado ||
        WiFi.status() != WL_CONNECTED)
    {
        Serial.println("[WIFI] Sin conexion configurada");
        pantallaEspera();
        return false;
    }

    Serial.println("[WIFI] CONECTADO");

    Serial.print("[WIFI] Red: ");
    Serial.println(WiFi.SSID());

    Serial.print("[WIFI] IP: ");
    Serial.println(WiFi.localIP());

    Serial.print("[WIFI] RSSI: ");
    Serial.println(WiFi.RSSI());

    // ======================================
    // MDNS - nexaccess.local
    // ======================================

    if (MDNS.begin("nexaccess"))
    {
        Serial.println("[MDNS] Iniciado");
        Serial.println("[MDNS] http://nexaccess.local");

        MDNS.addService("http", "tcp", 80);
    }
    else
    {
        Serial.println("[MDNS] Error al iniciar");
    }

    // ======================================
    // PORTAL WEB DE WIFI MANAGER
    // ======================================

    wifiManager.setConfigPortalBlocking(false);

    wifiManager.startWebPortal();

    Serial.println("[WIFI] Portal web iniciado");
    Serial.println("[WIFI] http://nexaccess.local");

    pantallaEspera();

    return true;
}
// Permite seleccionar otra red mediante AP.
void abrirPortalManual()
{
    Serial.println(
        "[WIFI] Configuracion manual solicitada");

    // Sin acceso NFC mientras esta abierto.
    portalActivo = true;
    clockReady = false;
    enrollmentId = 0;
    pantallaResultadoActiva = false;

    pantallaEspera();

    // Desconectar de la red anterior,
    // conservando credenciales guardadas.
    WiFi.disconnect(false, false);

    bool conectado = wifiManager.startConfigPortal(
        AP_NAME,
        WIFI_PORTAL_PASSWORD);

    portalActivo = false;

    if (
        conectado &&
        WiFi.status() == WL_CONNECTED)
    {
        Serial.println(
            "[WIFI] Nueva red conectada");

        Serial.print("[WIFI] IP: ");
        Serial.println(WiFi.localIP());
    }
    else
    {
        Serial.println(
            "[WIFI] Portal cerrado sin conexion");
    }

    // Volver a consultar comandos y hora.
    lastCommandCheck = 0;
    lastUid = "";
    lastWifiAttempt = millis();

    pantallaEspera();
}

// Deteccion de pulsacion prolongada.
void revisarBotonConfiguracion()
{
    bool presionado =
        digitalRead(CONFIG_BUTTON_PIN) == LOW;

    if (!presionado)
    {
        configButtonStart = 0;
        botonConfigProcesado = false;
        return;
    }

    if (botonConfigProcesado)
    {
        return;
    }

    if (configButtonStart == 0)
    {
        configButtonStart = millis();
        return;
    }

    if (
        millis() - configButtonStart >=
        CONFIG_BUTTON_HOLD_MS)
    {
        botonConfigProcesado = true;
        abrirPortalManual();
    }
}

// Reconectar sin abrir constantemente un AP.
void revisarWiFi()
{
    if (portalActivo)
        return;

    if (WiFi.status() == WL_CONNECTED)
    {
        int rssi = WiFi.RSSI();

        if (rssi < WIFI_RSSI_MIN)
        {
            if (wifiWeakSince == 0)
                wifiWeakSince = millis();

            if (millis() - wifiWeakSince >= WIFI_WEAK_TIMEOUT_MS)
            {
                Serial.printf(
                    "[WIFI] Señal debil: %d dBm\n",
                    rssi);

                WiFi.disconnect(false, false);

                clockReady = false;
                wifiWeakSince = 0;
                lastWifiAttempt = millis();

                pantallaEspera();
            }
        }
        else
        {
            wifiWeakSince = 0;
        }

        return;
    }

    wifiWeakSince = 0;
    clockReady = false;

    if (millis() - lastWifiAttempt < WIFI_RETRY_MS)
        return;

    lastWifiAttempt = millis();

    Serial.println("[WIFI] Reconectando...");
    WiFi.reconnect();
}
// ==========================================
// HORA NTP
// ==========================================

bool sincronizarHora()
{
    if (
        clockReady &&
        time(nullptr) > 1700000000)
    {
        return true;
    }

    if (WiFi.status() != WL_CONNECTED)
    {
        return false;
    }

    Serial.println("[NTP] Sincronizando...");

    configTime(
        0,
        0,
        "pool.ntp.org",
        "time.google.com");

    unsigned long inicio = millis();

    while (
        time(nullptr) < 1700000000 &&
        millis() - inicio < 10000)
    {
        delay(200);
    }

    clockReady =
        time(nullptr) > 1700000000;

    Serial.println(
        clockReady ? "[NTP] OK" : "[NTP] ERROR");

    return clockReady;
}

// ==========================================
// API HTTPS
// ==========================================

bool peticionAPI(
    const String &metodo,
    const String &ruta,
    const String &cuerpo,
    JsonDocument &respuesta)
{
    if (
        portalActivo ||
        WiFi.status() != WL_CONNECTED ||
        !clockReady)
    {
        Serial.println("[API] Sin conexion");
        return false;
    }

    unsigned long inicioTotal = millis();

    Serial.printf(
        "[API] INICIANDO %s %s\n",
        metodo.c_str(),
        ruta.c_str());

    WiFiClientSecure cliente;

    // HTTPS con validacion de certificado.
    cliente.setCACert(NEXACCESS_CA);
    cliente.setTimeout(HTTP_TIMEOUT_MS / 1000);

    HTTPClient http;

    http.setConnectTimeout(HTTP_TIMEOUT_MS);
    http.setTimeout(HTTP_TIMEOUT_MS);

    http.setFollowRedirects(
        HTTPC_DISABLE_FOLLOW_REDIRECTS);

    String url =
        String(API_BASE_URL) + ruta;

    if (!http.begin(cliente, url))
    {
        Serial.println("[API] ERROR begin()");
        return false;
    }

    http.addHeader(
        "X-DEVICE-KEY",
        DEVICE_KEY);

    int codigo = -1;

    if (metodo == "POST")
    {
        http.addHeader(
            "Content-Type",
            "application/json");

        codigo = http.POST(cuerpo);
    }
    else
    {
        codigo = http.GET();
    }

    Serial.printf(
        "[API] %s | HTTP %d | %lu ms\n",
        metodo.c_str(),
        codigo,
        millis() - inicioTotal);

    if (codigo != HTTP_CODE_OK)
    {
        if (codigo < 0)
        {
            Serial.print("[API] Error: ");
            Serial.println(
                http.errorToString(codigo));
        }

        http.end();
        return false;
    }

    // Leer completamente la respuesta HTTP
    String json = http.getString();

    http.end();

    // Diagnostico temporal
    Serial.print("[API] JSON recibido: ");
    Serial.println(json);

    // Convertir el JSON
    DeserializationError error =
        deserializeJson(respuesta, json);

    http.end();

    if (
        error ||
        !respuesta.is<JsonObject>())
    {
        Serial.print("[API] JSON invalido: ");
        Serial.println(error.c_str());
        return false;
    }

    Serial.printf(
        "[API] Total: %lu ms\n",
        millis() - inicioTotal);

    return true;
}

// ==========================================
// UID NFC
// ==========================================

String convertirUID(
    uint8_t *uid,
    uint8_t longitud)
{
    String resultado = "";

    for (uint8_t i = 0; i < longitud; i++)
    {
        if (uid[i] < 0x10)
        {
            resultado += "0";
        }

        resultado += String(uid[i], HEX);

        if (i < longitud - 1)
        {
            resultado += ":";
        }
    }

    resultado.toUpperCase();
    return resultado;
}

// ==========================================
// CONSULTAR COMANDOS DE ENROLAMIENTO
// ==========================================

void consultarComandos()
{
    if (
        millis() - lastCommandCheck <
        COMMAND_INTERVAL_MS)
    {
        return;
    }

    lastCommandCheck = millis();

    JsonDocument doc;

    String ruta =
        String("/api/v1/devices/") +
        DEVICE_CODE +
        "/commands";

    if (!peticionAPI(
            "GET",
            ruta,
            "",
            doc))
    {
        return;
    }

    const char *comando =
        doc["command"] | "";

    if (
        strcmp(comando, "ENROLL_CARD") == 0)
    {
        long id = doc["enrollmentId"] | 0L;

        if (
            id > 0 &&
            id != enrollmentId)
        {
            enrollmentId = id;

            Serial.printf(
                "[ENROLL] Orden: %ld\n",
                enrollmentId);

            pantallaResultadoActiva = false;
            pantallaEspera();
        }
    }
    else if (
        strcmp(comando, "NONE") == 0 &&
        enrollmentId != 0)
    {
        enrollmentId = 0;

        Serial.println(
            "[ENROLL] Modo finalizado");

        pantallaEspera();
    }
}

// ==========================================
// REGISTRAR TARJETA
// ==========================================

void registrarTarjeta(const String &uid)
{
    unsigned long inicio = millis();

    long id = enrollmentId;

    JsonDocument request;
    request["codigo_credencial"] = uid;

    String cuerpo;
    serializeJson(request, cuerpo);

    JsonDocument response;

    String ruta =
        "/api/v1/enrollments/" +
        String(id) +
        "/card";

    Serial.printf(
        "[ENROLL] UID: %s\n",
        uid.c_str());

    mostrarOLED(
        "ENROLAMIENTO",
        "ENVIANDO",
        "Consultando API");

    bool correcto = peticionAPI(
        "POST",
        ruta,
        cuerpo,
        response);

    Serial.printf(
        "[ENROLL] Total: %lu ms\n",
        millis() - inicio);

    if (!correcto)
    {
        mostrarResultado(
            "ENROLAMIENTO",
            "ERROR",
            "Reintentar",
            false);
        return;
    }

    const char *estado =
        response["status"] | "";

    if (strcmp(estado, "COMPLETADO") == 0)
    {
        enrollmentId = 0;

        Serial.println(
            "[ENROLL] CREDENCIAL REGISTRADA");

        Serial.print("[ENROLL] ID: ");
        Serial.println(
            response["credentialId"] | 0);

        mostrarResultado(
            "ENROLAMIENTO",
            "REGISTRADA",
            "NexAccess OK",
            true);
    }
    else
    {
        mostrarResultado(
            "ENROLAMIENTO",
            "ERROR",
            "No registrada",
            false);
    }
}

String obtenerPrimerNombre(String nombreCompleto)
{
    nombreCompleto.trim();

    int espacio = nombreCompleto.indexOf(' ');

    if (espacio > 0)
    {
        return nombreCompleto.substring(0, espacio);
    }

    return nombreCompleto.length() > 0
               ? nombreCompleto
               : "USUARIO";
}
// ==========================================
// VERIFICAR ACCESO EN BACKEND
// ==========================================

int verificarAcceso(const String &credencial)
{
    // Share the existing 2.5s presentation cooldown between BLE and NFC.
    if (credencial == lastVerifiedCredential && millis() - lastVerifiedAt < SAME_UID_COOLDOWN_MS)
        return lastVerifiedDecision;
    lastVerifiedCredential = credencial;
    JsonDocument request;
    request["deviceCode"] = DEVICE_CODE;
    request["credential"] = credencial;

    String cuerpo;
    serializeJson(request, cuerpo);

    JsonDocument response;

    mostrarOLED(
        "VERIFICANDO",
        "NEXACCESS",
        "Consultando API");

    bool correcto = peticionAPI(
        "POST",
        "/api/v1/access/verify",
        cuerpo,
        response);

    if (!correcto)
    {
        mostrarResultado(
            "ERROR",
            "SIN CONEXION",
            "Acceso denegado",
            false);
        lastVerifiedAt = millis();
        lastVerifiedDecision = 2;
        return 2;
    }

    bool autorizado = response["authorized"] | false;
    lastVerifiedAt = millis();
    lastVerifiedDecision = autorizado ? 1 : 0;

    if (autorizado)
    {
        String nombre = obtenerPrimerNombre(
            response["employeeName"] | "Usuario");

        nombre.toUpperCase();

        mostrarResultado(
            "AUTORIZADO",
            nombre,
            "ACCESO PERMITIDO",
            true);
    }
    else
    {
        mostrarResultado(
            "ACCESO",
            "DENEGADO",
            "NO AUTORIZADO",
            false);
    }
    return lastVerifiedDecision;
}

bool leerCredencialAndroid(String &credencial)
{
    // APK 1.2.1: este AID devuelve la credencial ASCII completa + 90 00.
    // El AID de 8 bytes es NX01 y requiere comandos READ adicionales.
    uint8_t selectAid[] = {
        0x00, 0xA4, 0x04, 0x00, 0x07,
        0xF0, 0x4E, 0x45, 0x58, 0x41, 0x43, 0x01,
        0x00};

    uint8_t respuesta[220] = {0};
    uint8_t longitud = sizeof(respuesta);

    Serial.println("[HCE] Enviando SELECT AID...");

    bool correcto = nfc.inDataExchange(
        selectAid,
        sizeof(selectAid),
        respuesta,
        &longitud);

    if (!correcto)
    {
        Serial.println("[HCE] ERROR: inDataExchange fallo");
        return false;
    }

    Serial.printf("[HCE] Bytes recibidos: %u\n", longitud);

    Serial.print("[HCE] Respuesta HEX: ");

    for (uint8_t i = 0; i < longitud; i++)
    {
        Serial.printf("%02X ", respuesta[i]);
    }

    Serial.println();

    if (longitud < 3)
    {
        Serial.println("[HCE] Respuesta demasiado corta");
        return false;
    }

    if (
        respuesta[longitud - 2] != 0x90 ||
        respuesta[longitud - 1] != 0x00)
    {
        Serial.printf("[HCE] Estado APDU: %02X %02X\n",
                      respuesta[longitud - 2], respuesta[longitud - 1]);
        Serial.println("[HCE] AID rechazado o respuesta invalida");
        return false;
    }

    credencial = "";

    for (uint8_t i = 0; i < longitud - 2; i++)
    {
        if (respuesta[i] < 0x21 || respuesta[i] > 0x7E)
        {
            Serial.println("[HCE] Caracter no ASCII");
            return false;
        }

        credencial += char(respuesta[i]);
    }

    Serial.println("[HCE] Credencial recibida correctamente");

    return !credencial.isEmpty();
}
// ==========================================
// LEER NFC
// ==========================================

bool revisarNFC()
{
    uint8_t uid[7] = {0};
    uint8_t uidLength = 0;

    bool detectada =
        nfc.readPassiveTargetID(
            PN532_MIFARE_ISO14443A,
            uid,
            &uidLength,
            1000);

    if (
        !detectada ||
        uidLength == 0 ||
        uidLength > 7)
    {
        return false;
    }

    Serial.println("[HCE] INICIANDO LECTURA ANDROID");
    String credencialAndroid;
    bool esAndroid = leerCredencialAndroid(credencialAndroid);

    Serial.printf("[NFC] Tipo detectado: %s\n", esAndroid ? "ANDROID HCE" : "UID FISICO / HCE NO DETECTADO");

    String uidTexto = esAndroid
                          ? credencialAndroid
                          : convertirUID(uid, uidLength);
    // Evitar procesar muchas veces la
    // misma tarjeta durante pocos segundos.
    if (
        uidTexto == lastUid &&
        millis() - lastUidAt <
            SAME_UID_COOLDOWN_MS)
    {
        return true;
    }

    lastUid = uidTexto;
    lastUidAt = millis();

    Serial.printf(
        "[PN532] TARJETA: %s\n",
        uidTexto.c_str());

    // Sin internet: siempre rechazar.
    if (
        WiFi.status() != WL_CONNECTED ||
        !clockReady ||
        portalActivo)
    {
        mostrarResultado(
            "SIN CONEXION",
            "DENEGADO",
            "Acceso bloqueado",
            false);

        return true;
    }

    if (enrollmentId > 0)
    {
        registrarTarjeta(uidTexto);
    }
    else
    {
        verificarAcceso(uidTexto);
    }

    lastCommandCheck = millis();
    return true;
}

// BLE is processed on the main loop, using the same backend and indicators.
void revisarBluetooth()
{
    NexAccessBle::Request request;
    if (!bluetoothAccess.receive(request)) return;
    if (!bluetoothAccess.current(request)) { memset(request.credential, 0, sizeof(request.credential)); return; }
    if (portalActivo || enrollmentId > 0 || WiFi.status() != WL_CONNECTED || !clockReady)
    {
        bluetoothAccess.reply(request, 'E');
        memset(request.credential, 0, sizeof(request.credential));
        return;
    }
    Serial.println("[BLE] Verificando credencial digital");
    const int decision = verificarAcceso(String(request.credential));
    bluetoothAccess.reply(request, decision == 1 ? 'A' : decision == 0 ? 'D' : 'E');
    Serial.println(decision == 1 ? "[BLE] AUTORIZADO" : decision == 0 ? "[BLE] RECHAZADO" : "[BLE] ERROR DE VERIFICACION");
    memset(request.credential, 0, sizeof(request.credential));
}

// ==========================================
// SETUP
// ==========================================

void setup()
{
    Serial.begin(115200);
    delay(1500);

    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    pinMode(
        CONFIG_BUTTON_PIN,
        INPUT_PULLUP);

    Serial.println();
    Serial.println("========================");
    Serial.println("       NEXACCESS");
    Serial.println(" ESP32-S3 + WIFI MANAGER");
    Serial.println("========================");

    // I2C del PN532
    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(100000);

    // Segundo I2C para OLED
    WireOLED.begin(OLED_SDA, OLED_SCL);
    WireOLED.setClock(100000);

    if (!display.begin(
            SSD1306_SWITCHCAPVCC,
            OLED_ADDRESS))
    {
        Serial.println(
            "[OLED] ERROR");

        while (true)
        {
            delay(1000);
        }
    }

    mostrarOLED(
        "Iniciando...",
        "NEXACCESS",
        "ESP32-S3");

    Serial.println("[OLED] OK");

    // PN532
    nfc.begin();

    uint32_t version =
        nfc.getFirmwareVersion();

    if (!version)
    {
        Serial.println(
            "[PN532] NO DETECTADO");

        mostrarOLED(
            "ERROR",
            "PN532",
            "No detectado");

        sonidoDenegado();

        while (true)
        {
            delay(1000);
        }
    }

    nfc.SAMConfig();

    Serial.println("[PN532] OK");

    // Configurar WiFiManager
    configurarWiFiManager();

    // Conectar o abrir portal AP
    if (iniciarWiFi())
    {
        sincronizarHora();
    }

    bluetoothAccess.begin(DEVICE_CODE);
    pantallaEspera();
    sonidoInicio();

    Serial.printf(
        "[DEVICE] %s\n",
        DEVICE_CODE);

    Serial.println(
        "[NFC] Esperando tarjetas...");
}

// ==========================================
// LOOP
// ==========================================

void loop()
{
    // 0. Procesar portal WiFiManager
    wifiManager.process();

    // 1. Boton de configuracion
    revisarBotonConfiguracion();

    // 2. Comprobar conectividad
    revisarWiFi();

    if (
        WiFi.status() == WL_CONNECTED &&
        !clockReady)
    {
        sincronizarHora();
        pantallaEspera();
    }

    // 3. Priorizar NFC
    bool tarjetaDetectada = revisarNFC();

    // Preserve NFC priority; drain a BLE request on the next available cycle.
    if (!tarjetaDetectada) revisarBluetooth();

    // 4. Restaurar OLED
    if (
        pantallaResultadoActiva &&
        (long)(millis() - resultUntil) >= 0)
    {
        pantallaResultadoActiva = false;
        pantallaEspera();
    }

    // 5. Consultar enrolamientos
    if (
        !tarjetaDetectada &&
        WiFi.status() == WL_CONNECTED &&
        clockReady &&
        !portalActivo)
    {
        consultarComandos();
    }

    delay(10);
}
