/* =========================================================================================
 * Smart Campus BLE Attendance System - ESP32 & HM-10 Physical Hardware Firmware
 * =========================================================================================
 * 
 * Target Board: ESP32 Dev Module (DOIT ESP32 DEVKIT V1 / NodeMCU-32S / ESP32-WROOM-32)
 * Sensor/Module: HM-10 Bluetooth Low Energy 4.0 Module (CC2541 / CC2540)
 * 
 * Hardware Wiring:
 *   ESP32 GPIO 16 (RX2)  <----  HM-10 TXD Pin
 *   ESP32 GPIO 17 (TX2)  -----> HM-10 RXD Pin (via 3.3V logic or direct)
 *   ESP32 GND            <----  HM-10 GND Pin
 *   ESP32 5V (VIN)       -----> HM-10 VCC Pin (or 3.3V pin if module lacks 5V LDO)
 *   ESP32 GPIO 2 (LED)   -----> On-board Status LED (Blinks on scan/heartbeat)
 * 
 * Protocol:
 *   - Wi-Fi 802.11 b/g/n (HTTPS / HTTP)
 *   - Secure API Device Authentication Header: "x-device-key"
 *   - Endpoints:
 *       1. POST /api/attendance/heartbeat (every 30s)
 *       2. POST /api/attendance/ble-event (on beacon detection)
 *       3. POST /api/attendance/device-log (on hardware error/warning)
 * =========================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// =========================================================================================
// 1. CONFIGURATION & CREDENTIALS
// =========================================================================================

// --- Wi-Fi Credentials ---
const char* WIFI_SSID     = "YOUR_WIFI_SSID";      // Replace with your 2.4GHz Wi-Fi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  // Replace with your Wi-Fi Password

// --- Smart Campus Backend Base URL ---
// Note: If running locally on LAN, use e.g. "http://192.168.1.100:3000"
// If testing in AI Studio preview or cloud: use the public HTTPS URL (e.g. "https://your-domain.app")
const char* SERVER_BASE_URL = "http://192.168.1.100:3000";

// --- Device Identity & Authentication ---
const char* DEVICE_NODE_ID   = "ESP32-GATE-MAIN-01";            // Matches registered Node ID in dashboard
const char* DEVICE_API_KEY   = "sc_esp32_secret_token_2026";    // Secret key for 'x-device-key' header
const char* FIRMWARE_VERSION = "v2.4.1-BLE-PROD";

// --- Timing Constants ---
const unsigned long HEARTBEAT_INTERVAL_MS = 30000;  // Send heartbeat every 30 seconds
const unsigned long BLE_SCAN_INTERVAL_MS  = 6000;   // Trigger HM-10 scan every 6 seconds
const unsigned long DEDUP_CACHE_WINDOW_MS = 30000;  // Local device deduplication window (30s)

// --- HM-10 Serial Configuration ---
#define HM10_RX_PIN 16  // ESP32 GPIO16 connects to HM-10 TXD
#define HM10_TX_PIN 17  // ESP32 GPIO17 connects to HM-10 RXD
#define HM10_BAUD   9600 // Default factory baud rate for HM-10 module
#define STATUS_LED  2    // Built-in blue LED on most ESP32 boards

HardwareSerial SerialHM10(2); // Use ESP32 Hardware UART #2

// =========================================================================================
// 2. RUNTIME STATE & LOCAL DEDUPLICATION CACHE
// =========================================================================================

unsigned long lastHeartbeatTime = 0;
unsigned long lastScanTime      = 0;
bool isHM10Ready                = false;

struct CachedBeacon {
  String mac;
  unsigned long timestamp;
};

#define MAX_CACHE_ENTRIES 10
CachedBeacon dedupCache[MAX_CACHE_ENTRIES];
int cacheIndex = 0;

// =========================================================================================
// 3. UTILITY & HELPER FUNCTIONS
// =========================================================================================

void blinkLed(int times = 1, int durationMs = 80) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED, HIGH);
    delay(durationMs);
    digitalWrite(STATUS_LED, LOW);
    if (times > 1) delay(durationMs);
  }
}

bool isRecentlyScanned(const String& mac) {
  unsigned long now = millis();
  for (int i = 0; i < MAX_CACHE_ENTRIES; i++) {
    if (dedupCache[i].mac.equalsIgnoreCase(mac)) {
      if (now - dedupCache[i].timestamp < DEDUP_CACHE_WINDOW_MS) {
        return true; // Already processed recently
      }
    }
  }
  return false;
}

void recordInCache(const String& mac) {
  dedupCache[cacheIndex].mac = mac;
  dedupCache[cacheIndex].timestamp = millis();
  cacheIndex = (cacheIndex + 1) % MAX_CACHE_ENTRIES;
}

// Convert 12-char hex string (e.g. "AABBCC112233") to standard format ("AA:BB:CC:11:22:33")
String formatMacAddress(String raw) {
  raw.trim();
  raw.toUpperCase();
  if (raw.length() != 12) return raw;

  String formatted = "";
  for (int i = 0; i < 12; i += 2) {
    if (i > 0) formatted += ":";
    formatted += raw.substring(i, i + 2);
  }
  return formatted;
}

// =========================================================================================
// 4. WI-FI MANAGEMENT
// =========================================================================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println();
  Serial.print("[WIFI] Connecting to SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WIFI] Connected successfully! IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WIFI] Wi-Fi Signal RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    blinkLed(3, 100);
  } else {
    Serial.println();
    Serial.println("[WIFI] Connection failed. Will retry on next loop.");
  }
}

// =========================================================================================
// 5. HM-10 AT COMMAND CONTROLLER
// =========================================================================================

String sendATCommand(const char* cmd, unsigned long timeoutMs = 1200) {
  while (SerialHM10.available()) { SerialHM10.read(); } // Clear buffer

  Serial.print("[HM-10 TX] ");
  Serial.println(cmd);
  SerialHM10.print(cmd);

  unsigned long start = millis();
  String response = "";

  while (millis() - start < timeoutMs) {
    while (SerialHM10.available()) {
      char c = SerialHM10.read();
      response += c;
    }
  }

  response.trim();
  Serial.print("[HM-10 RX] ");
  Serial.println(response);
  return response;
}

void initHM10() {
  Serial.println("[HM-10] Initializing Bluetooth Low Energy Module...");
  delay(1000);

  // 1. Test AT handshake
  String resp = sendATCommand("AT", 1000);
  if (resp.indexOf("OK") == -1) {
    Serial.println("[HM-10] WARNING: Module not responding to AT. Check TX/RX wiring!");
    isHM10Ready = false;
    return;
  }

  // 2. Set to Central/Master Mode (ROLE1)
  sendATCommand("AT+ROLE1", 1000);

  // 3. Set to manual scan mode (wait for command)
  sendATCommand("AT+IMME1", 1000);

  // 4. Set discovery scan duration to 3 seconds
  sendATCommand("AT+SCAN3", 1000);

  // 5. Software reset to apply settings
  sendATCommand("AT+RESET", 1500);
  delay(1200);

  isHM10Ready = true;
  Serial.println("[HM-10] Initialization complete. HM-10 Central Mode active.");
  blinkLed(2, 150);
}

// =========================================================================================
// 6. HTTP API TELEMETRY INGESTION
// =========================================================================================

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HEARTBEAT] Skipped: Wi-Fi offline");
    return;
  }

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/attendance/heartbeat";

  // Build JSON body
  int rssi = WiFi.RSSI();
  String ip = WiFi.localIP().toString();
  String mac = WiFi.macAddress();

  String payload = "{";
  payload += "\"nodeId\":\"" + String(DEVICE_NODE_ID) + "\",";
  payload += "\"firmwareVersion\":\"" + String(FIRMWARE_VERSION) + "\",";
  payload += "\"ipAddress\":\"" + ip + "\",";
  payload += "\"macAddress\":\"" + mac + "\",";
  payload += "\"signalRssi\":" + String(rssi) + ",";
  payload += "\"batteryLevel\":100";
  payload += "}";

  Serial.println("[HEARTBEAT] Transmitting telemetry to " + url);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_API_KEY);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    String res = http.getString();
    Serial.print("[HEARTBEAT] Server Response (");
    Serial.print(httpCode);
    Serial.print("): ");
    Serial.println(res);
    blinkLed(1, 60);
  } else {
    Serial.print("[HEARTBEAT] Error sending heartbeat: ");
    Serial.println(http.errorToString(httpCode).c_str());
  }
  http.end();
}

void sendBleAttendanceEvent(const String& studentMac, int signalRssi) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ATTENDANCE] Cannot send event: Wi-Fi offline");
    return;
  }

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/attendance/ble-event";

  String payload = "{";
  payload += "\"nodeId\":\"" + String(DEVICE_NODE_ID) + "\",";
  payload += "\"bleMac\":\"" + studentMac + "\",";
  payload += "\"rssi\":" + String(signalRssi);
  payload += "}";

  Serial.println("[ATTENDANCE] Ingesting BLE scan event: " + studentMac + " (" + String(signalRssi) + " dBm)");
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_API_KEY);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    String res = http.getString();
    Serial.print("[ATTENDANCE] API Response (");
    Serial.print(httpCode);
    Serial.print("): ");
    Serial.println(res);
    blinkLed(2, 50); // Double quick blink on successful attendance ingestion
  } else {
    Serial.print("[ATTENDANCE] Error posting event: ");
    Serial.println(http.errorToString(httpCode).c_str());
  }
  http.end();
}

// =========================================================================================
// 7. HM-10 BLE SCANNER & PACKET PARSER
// =========================================================================================

void performBleScan() {
  if (!isHM10Ready) {
    initHM10();
    return;
  }

  Serial.println("[SCAN] Triggering HM-10 discovery: AT+DISC?");
  while (SerialHM10.available()) { SerialHM10.read(); } // Clear buffer

  SerialHM10.print("AT+DISC?");

  unsigned long scanStart = millis();
  String buffer = "";

  // Collect responses from HM-10 for up to 3500ms
  // HM-10 Discovery responses look like:
  // OK+DISCS
  // OK+DISC:AABBCC112233
  // OK+DIS0:AABBCC112233...
  // OK+DISCE
  while (millis() - scanStart < 3500) {
    while (SerialHM10.available()) {
      char c = SerialHM10.read();
      buffer += c;

      // When line break or delimiter is received, check for valid beacon MAC
      if (c == '\n' || c == '\r') {
        buffer.trim();
        if (buffer.length() > 0) {
          processHM10Line(buffer);
        }
        buffer = "";
      }
    }
  }

  if (buffer.length() > 0) {
    buffer.trim();
    processHM10Line(buffer);
  }
}

void processHM10Line(const String& line) {
  // Check for discovery signature: "OK+DISC:" or "OK+DIS0:" or "OK+DIS1:"
  int discIdx = line.indexOf("OK+DIS");
  if (discIdx == -1) return;

  Serial.print("[HM-10 DETECT] Raw: ");
  Serial.println(line);

  // Extract 12-hex character MAC address
  // Example formats:
  // "OK+DISC:1234567890AB"
  // "OK+DIS0:1234567890AB"
  // "OK+DIS1:1234567890AB:-065:..."
  int colonIdx = line.indexOf(':', discIdx);
  if (colonIdx != -1 && line.length() >= colonIdx + 13) {
    String rawMac = line.substring(colonIdx + 1, colonIdx + 13);
    String formattedMac = formatMacAddress(rawMac);

    // Extract RSSI if provided in HM-10 string (or default to -60 dBm)
    int rssi = -60;
    int nextColon = line.indexOf(':', colonIdx + 13);
    if (nextColon != -1) {
      String rssiStr = line.substring(nextColon + 1);
      int parsedRssi = rssiStr.toInt();
      if (parsedRssi < 0 && parsedRssi > -120) {
        rssi = parsedRssi;
      }
    }

    Serial.print("[HM-10 PARSED] Formatted MAC: ");
    Serial.print(formattedMac);
    Serial.print(" | RSSI: ");
    Serial.print(rssi);
    Serial.println(" dBm");

    // Local deduplication check
    if (isRecentlyScanned(formattedMac)) {
      Serial.println("[DEDUP] Ignored: Tag scanned within local cooldown window.");
      return;
    }

    recordInCache(formattedMac);
    sendBleAttendanceEvent(formattedMac, rssi);
  }
}

// =========================================================================================
// 8. ARDUINO SETUP & MAIN LOOP
// =========================================================================================

void setup() {
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);

  // Debug Serial
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("===============================================================");
  Serial.println("  Smart Campus ESP32 & HM-10 BLE Attendance Edge Gateway");
  Serial.println("  Node ID: " + String(DEVICE_NODE_ID));
  Serial.println("  Firmware: " + String(FIRMWARE_VERSION));
  Serial.println("===============================================================");

  // Initialize Hardware UART for HM-10
  SerialHM10.begin(HM10_BAUD, SERIAL_8N1, HM10_RX_PIN, HM10_TX_PIN);

  // Connect to Campus Wi-Fi
  connectWiFi();

  // Initialize HM-10 module in Master scan mode
  initHM10();

  // Send first startup heartbeat
  sendHeartbeat();
  lastHeartbeatTime = millis();
  lastScanTime = millis();
}

void loop() {
  // 1. Maintain Wi-Fi connectivity
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  unsigned long currentMillis = millis();

  // 2. Periodic Node Heartbeat
  if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = currentMillis;
    sendHeartbeat();
  }

  // 3. Periodic BLE Scanner Cycle
  if (currentMillis - lastScanTime >= BLE_SCAN_INTERVAL_MS) {
    lastScanTime = currentMillis;
    performBleScan();
  }

  delay(50); // Yield to background RTOS tasks
}
