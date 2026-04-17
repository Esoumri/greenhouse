/*
 * GreenWatch ESP32 Firmware
 * Sends sensor data to the GreenWatch API every 30 seconds.
 *
 * Hardware:
 *   - DHT22 sensor (temp + humidity) on pin 4
 *   - Reed switch / door sensor on pin 14 (open/close)
 *   - PIR motion sensor on pin 27 (intrusion)
 *   - LDR / photoresistor on pin 34 (day/night detection)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─── CONFIGURATION ────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL       = "http://YOUR_SERVER_IP:5000/api/data";
const char* GREENHOUSE_ID = "GH-001";   // Unique ID for this unit

// ─── PIN DEFINITIONS ──────────────────────────────────────────────
#define DHT_PIN       4
#define DHT_TYPE      DHT22
#define DOOR_PIN      14   // LOW = open, HIGH = closed (with pull-up)
#define PIR_PIN       27   // HIGH = motion detected
#define LDR_PIN       34   // Analog: LOW value = dark (night)
#define LED_PIN       2    // Built-in LED for status

#define SEND_INTERVAL 30000  // ms between readings
#define LDR_THRESHOLD 1500   // ADC value below this = night

// ─── GLOBALS ──────────────────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastSend = 0;

// ─── SETUP ────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(DOOR_PIN, INPUT_PULLUP);
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);

  dht.begin();

  Serial.println("\n🌿 GreenWatch ESP32 starting...");
  Serial.printf("   Greenhouse ID: %s\n", GREENHOUSE_ID);

  connectWiFi();
}

// ─── LOOP ─────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost. Reconnecting...");
    connectWiFi();
  }

  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();
    sendSensorData();
  }
}

// ─── FUNCTIONS ────────────────────────────────────────────────────
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ WiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\n❌ WiFi failed. Will retry.");
    digitalWrite(LED_PIN, LOW);
  }
}

void sendSensorData() {
  // Read sensors
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("⚠️  DHT sensor read failed, skipping.");
    return;
  }

  bool doorOpen = (digitalRead(DOOR_PIN) == LOW);
  bool intrusion = (digitalRead(PIR_PIN) == HIGH);
  bool night = (analogRead(LDR_PIN) < LDR_THRESHOLD);

  // Build JSON
  StaticJsonDocument<256> doc;
  doc["greenhouse_id"] = GREENHOUSE_ID;
  doc["temp"]          = round(temp * 10.0) / 10.0;
  doc["hum"]           = round(hum * 10.0) / 10.0;
  doc["open"]          = doorOpen;
  doc["intrusion"]     = intrusion;
  doc["night"]         = night;

  String payload;
  serializeJson(doc, payload);

  // Send HTTP POST
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  Serial.printf("📡 Sending: %s\n", payload.c_str());
  int httpCode = http.POST(payload);

  if (httpCode == 201) {
    Serial.printf("✅ Data sent OK [%d] temp=%.1f°C hum=%.1f%%\n", httpCode, temp, hum);
    // Blink LED to confirm
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.printf("❌ HTTP error: %d\n", httpCode);
    String response = http.getString();
    Serial.println(response);
  }

  http.end();
}
