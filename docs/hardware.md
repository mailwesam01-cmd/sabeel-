# Sabeel Hardware Node 🛠️

This document describes the hardware node for the Sabeel smart water monitoring system.

## The Problem with Traditional Sensors
Traditional water flow meters require cutting the pipe, which is expensive, prone to leaks, and requires a plumber.
By using a **non-contact ultrasonic level sensor** placed at the top of the tank, we can calculate the flow and detect leaks entirely in software by measuring the rate of change of the water level over time.

## Bill of Materials (BOM) 🛒

The goal of this design is to be extremely affordable and accessible to anyone in Jordan or the region. All parts are commonly available in electronics stores in Amman (e.g., Micro-Elec, Ram Electronics).

| Component | Description | Estimated Cost (JOD) |
|---|---|---|
| **ESP32 Development Board** | The brain. Has built-in Wi-Fi and Bluetooth. | ~ 5.00 JOD |
| **JSN-SR04T V3.0** | Waterproof ultrasonic distance sensor. Essential for the humid environment inside a water tank. | ~ 8.00 JOD |
| **Power Supply (5V 1A)** | Standard USB wall charger or a 220V to 5V MeanWell module. | ~ 3.00 JOD |
| **Enclosure** | IP65 waterproof electrical junction box (or 3D printed). | ~ 3.00 JOD |
| **Cables & Connectors** | Jumper wires, glands for waterproof cable entry. | ~ 2.00 JOD |
| **Total** | | **~ 21.00 JOD** |

## Wiring Diagram 🔌

| ESP32 Pin | Component | Description |
|---|---|---|
| `5V / VIN` | Power Supply | 5V Input |
| `GND` | Power Supply & Sensor | Common Ground |
| `Pin 5` | JSN-SR04T `TRIG` | Trigger pulse |
| `Pin 18` | JSN-SR04T `ECHO` | Echo pulse |

*Note: The JSN-SR04T typically operates at 5V. The Echo pin outputs 5V, but the ESP32 is 3.3V tolerant on most pins. For long-term safety, a simple voltage divider (e.g., 1kΩ and 2kΩ resistors) on the ECHO line is highly recommended.*

## Installation Guide 🏗️

1. **Drill a hole** in the top cover of the rooftop tank, exactly the size of the JSN-SR04T probe (typically 22mm).
2. Insert the probe so it faces downwards towards the water. Ensure it is perpendicular.
3. Place the ESP32 and the sensor's control board inside the waterproof enclosure.
4. Mount the enclosure on the side of the tank or a nearby wall using outdoor-rated adhesive or screws.
5. Provide 5V power to the enclosure.
6. Connect to the ESP32's captive portal (WiFi AP named "Sabeel-Setup") to enter your home WiFi credentials.

## Firmware Features 💻
- **Median Filtering:** The water surface can ripple, and condensation can cause false readings. The firmware takes 5 rapid readings and uses the median value to discard outliers.
- **Deep Sleep:** To save power (crucial if running on batteries or solar), the ESP32 sleeps between readings.
- **Last Will and Testament (LWT):** If the device loses power or WiFi, the MQTT broker automatically marks it as "offline" in the dashboard.
