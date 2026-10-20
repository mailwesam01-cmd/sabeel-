#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- Configuration ---
const char* mqtt_server = "broker.hivemq.com"; // Change to your broker
const int mqtt_port = 1883;
const char* site_id = "site-123";
const char* device_id = "esp32-abc"; // Or use WiFi.macAddress()

// Sensor Pins (JSN-SR04T)
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

WiFiClient espClient;
PubSubClient client(espClient);

// Function Declarations
float getMedianDistance();
void reconnectMQTT();

void setup() {
  Serial.begin(115200);
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Hardcoded WiFi for demo, use WiFiManager in production
  WiFi.begin("Your_SSID", "Your_PASSWORD");
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");

  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // Read Sensor
  float distanceCm = getMedianDistance();
  
  // Build JSON Payload
  StaticJsonDocument<200> doc;
  doc["ts"] = 0; // ESP32 doesn't have RTC by default without NTP, backend should stamp it if 0
  doc["levelCm"] = distanceCm;
  doc["flowLpm"] = 0;
  doc["pumpOn"] = false;
  doc["batteryMv"] = 3300;
  doc["rssi"] = WiFi.RSSI();

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  // Publish
  char topic[100];
  sprintf(topic, "sabeel/%s/%s/telemetry", site_id, device_id);
  
  client.publish(topic, jsonBuffer);
  Serial.print("Published: ");
  Serial.println(jsonBuffer);

  // Deep Sleep for 60 seconds (simulated by delay for testing)
  delay(60000); 
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    char lwt_topic[100];
    sprintf(lwt_topic, "sabeel/%s/%s/status", site_id, device_id);
    const char* lwt_payload = "{\"online\": false}";

    if (client.connect(device_id, NULL, NULL, lwt_topic, 1, true, lwt_payload)) {
      Serial.println("connected");
      // Publish online status
      client.publish(lwt_topic, "{\"online\": true, \"fw\": \"1.0.0\"}", true);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

// Simple Median Filter for Ultrasonic Sensor
float getMedianDistance() {
  const int numReadings = 5;
  float readings[numReadings];
  
  for(int i=0; i<numReadings; i++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);
    
    long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
    readings[i] = (duration * 0.0343) / 2;
    delay(50);
  }

  // Sort array
  for (int i = 0; i < numReadings - 1; i++) {
    for (int j = i + 1; j < numReadings; j++) {
      if (readings[i] > readings[j]) {
        float temp = readings[i];
        readings[i] = readings[j];
        readings[j] = temp;
      }
    }
  }
  
  return readings[numReadings / 2]; // Return median
}
