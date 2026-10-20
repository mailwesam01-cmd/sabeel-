# Project B (new) — **Sabeel** (سبيل)

> **Smart water monitoring and leak detection for a country that loses up to half its water in
> the pipes.**
> Suggested repo: `github.com/<you>/sabeel`
> Tagline: *"Know how much water you have. Know the moment you start losing it."*

**Stack:** ESP32 firmware (C/C++) + ASP.NET Core + TimescaleDB/PostgreSQL + MQTT + Flutter +
Angular + Docker
**Why this one:** it is the largest resource problem in Jordan, and it is the only project that
uses the degree you actually hold — **Smart Devices Computing**. Right now your embedded/IoT
education is invisible on your profile. This makes it your differentiator instead of a footnote.

---

## 1. The idea

Sabeel is an end-to-end water intelligence platform with three layers:

1. **A low-cost sensor node** (ESP32 + ultrasonic level sensor + optional flow meter) that mounts on
   a rooftop tank and reports level and flow over Wi-Fi/MQTT — total bill of materials under
   ~25 JOD, deliberately buildable by a student or a plumber.
2. **A backend** (ASP.NET Core + MQTT broker + TimescaleDB) that ingests high-frequency readings,
   stores them as time-series, and runs **anomaly detection**: continuous night flow, sudden level
   drops, tank overflow, pump running dry, supply-day predictions.
3. **Two front ends** — a **Flutter app** for households ("your tank is at 22 %, at your current
   usage you have 3 days left, supply is expected Tuesday") and an **Angular dashboard** for
   building managers, schools, mosques, farms or a utility district ("these 6 tanks show night
   flow — probable leaks; estimated loss 14 m³/week").

The novelty is not the sensor. It is the **software that turns level readings into decisions**:
leak classification, supply-schedule learning, consumption forecasting, and multi-tank fleet views.

---

## 2. The problem it solves

Jordan is one of the most water-scarce countries in the world, and the losses are enormous:
**an estimated 40 % to 60 % of the water supply is lost in the network**, depending on location
([Fanack Water](https://water.fanack.com/jordan/water-challenges-in-jordan/)). Water reaches most
households **intermittently** — pumped to a neighbourhood on a schedule, often once a week — which
is why nearly every building in Jordan has rooftop tanks.

That architecture creates a specific, universal set of daily problems:

| Problem | What actually happens |
|---|---|
| **You don't know how much water you have** | People climb to the roof and knock on the tank, or wait until the taps run dry mid-shower. |
| **You miss the supply window** | The pump comes on while you're at work; the tank valve was closed, or the float failed, and you get nothing for another week. |
| **Silent leaks** | A dripping toilet or a cracked underground feed drains the tank continuously. It is invisible until the tank empties days early. Continuous night flow is the classic signature — and nobody is looking for it. |
| **Overflow waste** | Float valve fails, the tank overflows onto the roof for hours. In a water-scarce country, this is the most painful failure of all. |
| **Pumps burn out** | Booster pumps run dry when the tank empties, and burn out. |
| **Landlords and building managers fly blind** | A 12-flat building has one shared feed and no idea which flat is consuming or leaking. |
| **Farms and schools** | Large tanks, high stakes, no monitoring, and water bought by tanker at real cost. |

**Why this is a genuine gap.** Commercial smart-water products exist internationally, but they are
expensive, cloud-locked, English-only, and built for continuous-supply countries — their models
assume water is always in the pipe. **Nothing on the market is designed around the
intermittent-supply + rooftop-tank pattern that defines Jordan and much of the region.** There is no
credible open-source option a Jordanian household, school, mosque, or small utility could actually
deploy.

**Why it makes you hireable:** it is a **full-stack systems project** — firmware, network protocol,
time-series data, anomaly detection, backend, mobile, dashboard — which almost no junior candidate
has. It also proves your degree is real: "Smart Devices Computing" stops being a line on a diploma
and becomes a working device you can put on the table in an interview.

---

## 3. How it works

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  SENSOR NODE  (ESP32, ~25 JOD BOM)                                       │
 │                                                                          │
 │   Ultrasonic distance sensor (JSN-SR04T, waterproof) → tank level        │
 │   Optional: hall-effect flow meter on the inlet/outlet → litres/min      │
 │   Optional: current sensor on the pump → pump on/off + dry-run detect    │
 │                                                                          │
 │   Firmware: median-filter readings, deep sleep between samples,          │
 │   store-and-forward when Wi-Fi drops, OTA update, MQTT over TLS          │
 └───────────────────────────┬──────────────────────────────────────────────┘
                             │  MQTT  sabeel/<siteId>/<deviceId>/telemetry
                             ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  INGESTION  (Mosquitto/EMQX → ASP.NET Core worker)                       │
 │   • authenticate device (per-device credential, mTLS or token)           │
 │   • validate + de-spike                                                  │
 │   • level (cm) → volume (litres) via the tank's calibrated geometry      │
 │   • write to TimescaleDB hypertable                                      │
 └───────────────────────────┬──────────────────────────────────────────────┘
                             ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  ANALYTICS ENGINE  (the part that matters)                               │
 │                                                                          │
 │  A1 Refill detection   level rising > threshold → a supply event         │
 │  A2 Schedule learning  cluster refill events by weekday/hour →           │
 │                        "your supply usually arrives Tue 02:00–06:00"     │
 │  A3 Consumption model  rolling litres/day, per-hour profile              │
 │  A4 Days-remaining     volume ÷ forecast daily use, vs next supply date  │
 │  A5 Leak: night flow   consumption during 01:00–05:00 that never drops   │
 │                        to ~0 for N consecutive nights → CONTINUOUS LEAK  │
 │  A6 Leak: step change  daily use jumps > X % with no behavioural cause   │
 │  A7 Overflow           level pinned at 100 % while inflow continues      │
 │  A8 Dry-run            pump current on while level ≈ 0 → cut alert       │
 │  A9 Sensor health      flat-line, out-of-range, stale → distrust the data│
 └───────────────────────────┬──────────────────────────────────────────────┘
                             ▼
 ┌───────────────────────────────┬──────────────────────────────────────────┐
 │  Flutter app (household)      │  Angular dashboard (fleet/utility)       │
 │  level · days left · alerts   │  map + table of sites, ranked by         │
 │  supply forecast · history    │  estimated loss, leak triage queue,      │
 │  push notifications           │  weekly loss report export               │
 └───────────────────────────────┴──────────────────────────────────────────┘
```

### The leak-detection logic in plain terms (this is your interview story)

A tank's level only ever goes **up** during a supply/refill event and **down** the rest of the time.
So the derivative of the level curve *is* the consumption signal — you get flow measurement for
free from a level sensor, without a flow meter.

Now: in a household, consumption between 01:00 and 05:00 should hit **zero** for at least a few
continuous minutes. If the level keeps falling all night, every night, water is leaving the system
with nobody using it. That is a leak, and its slope gives you the leak rate in litres/hour.

```
nightSlope   = median( Δvolume/Δt  over 01:00–05:00 )
if nightSlope < -MIN_LEAK_RATE for N consecutive nights
     and no scheduled irrigation/appliance window is registered
→ CONTINUOUS_LEAK,  estimatedLossLitresPerDay = |nightSlope| × 24
```

Simple, explainable, and it works. Deliberately *not* machine learning: an explainable rule that a
plumber can verify beats a black box that nobody trusts. Say that out loud in the interview — it is
a maturity signal.

---

## 4. Target audience

**Primary:** Jordanian households and landlords with rooftop tanks — effectively the entire
residential market.

**Secondary:** buildings with shared tanks and a manager — apartment blocks, schools, universities,
mosques, clinics, small hotels. These have budget, a responsible person, and measurable savings.

**Tertiary:** farms and greenhouses in the Jordan Valley, and small water utilities / water user
associations wanting district-level non-revenue-water visibility without a national SCADA contract.

**Regional:** the same intermittent-supply + rooftop-tank pattern exists across Palestine, Lebanon,
Iraq, Yemen, Egypt and much of South Asia. The problem is not Jordan-only, which is what makes an
open-source project worth publishing.

---

## 5. Skills used

| Skill | Where it shows up | Signal |
|---|---|---|
| **Embedded / IoT (your degree!)** | ESP32 firmware, sensors, power management, OTA | **The differentiator.** Turns your degree into evidence. |
| **C / C++** | Firmware | Low-level competence |
| **MQTT + networking** | Broker, topics, QoS, TLS, store-and-forward | Uses your Networking skill for something real |
| **Security** | Per-device credentials, mTLS, no shared secrets, signed OTA | Uses your Cybersecurity skill concretely |
| **ASP.NET Core / C#** | Ingestion worker, API, rules engine | Your #1 headline keyword |
| **PostgreSQL + TimescaleDB** | Hypertables, continuous aggregates, retention policies | Time-series data — a genuinely advanced skill |
| **Algorithms / signal processing** | Median filtering, derivative estimation, event detection, clustering | Real engineering |
| **Flutter** | Household app, push notifications, offline cache | Mobile keyword |
| **Angular** | Fleet dashboard, map, charts | Your new keyword, in the right use case |
| **Docker / Compose** | Broker + API + DB + dashboard in one command | Delivery |
| **Simulation & testing** | A device simulator that replays synthetic tanks, including leaks | **Lets you demo without hardware** — critical |

---

## 6. Design & visual identity

**Concept:** *water as a level.* Every screen answers one question first — *how much is left?* — and
the primary visual is a filling level, not a chart.

### Colour palette

| Role | Hex | Use |
|---|---|---|
| Primary | `#00507A` | Deep water blue. App bar, brand, headings. |
| Primary light | `#2E86AB` | Secondary buttons, chart lines. |
| Water fill | `#4CC9F0` | The animated tank fill. |
| Water fill deep | `#0077B6` | Gradient base of the fill. |
| Accent | `#F9C74F` | Sun yellow. Primary CTA, supply-day marker. |
| Level: healthy (>50 %) | `#2A9D8F` | Ring + status text. |
| Level: low (20–50 %) | `#F9C74F` | |
| Level: critical (<20 %) | `#E63946` | |
| Leak alert | `#9D0208` | Deep red — reserved **only** for leaks. |
| Overflow alert | `#F3722C` | Orange. |
| Surface | `#FFFFFF` | Cards. |
| Canvas | `#F2F7FA` | Background, faint blue tint. |
| Ink | `#04263A` | Text. |
| Muted | `#5B7A8C` | Secondary text. |

Rationale: the palette is a water gradient from `#04263A` down to `#4CC9F0`, so the product feels
like one material. Yellow is the only warm colour and it is used sparingly — for the sun/supply-day
marker and the single primary action. Leak red (`#9D0208`) is deliberately darker and different
from the "critical level" red (`#E63946`): *low water* and *losing water* are different emotions and
must not look the same.

### Typography

- **Latin:** `Inter` with tabular figures. **Arabic:** `IBM Plex Sans Arabic`.
- The headline number (percentage / days remaining) at **56 px semibold** — it must be readable at
  arm's length from a kitchen counter.
- Full RTL, Arabic-first. Numerals: Western digits.

### Key screens — Flutter household app

1. **Home** — a large animated tank: an outlined cylinder with an animated water fill, the
   percentage in the middle, and beneath it in plain language:
   *"≈ 1,240 litres · about 3 days left · next supply expected Tuesday"*.
   One accent-yellow button: **Alerts**.
2. **History** — level over the last 7/30 days. Refill events marked with a `#F9C74F` droplet,
   leak periods shaded `#9D0208` at 12 % opacity. The shape of this chart *teaches* the user how
   their household uses water — that is the real product.
3. **Alerts** — a feed: leak detected (with estimated litres/day lost and cost), overflow, low
   level, supply arriving, sensor offline. Each with a plain-language "what to do next".
4. **Tank setup** — a calibration wizard: tank shape, dimensions, sensor mount height. Show a live
   preview so the user can see the reading match reality. Getting this wizard right is what makes
   the whole product trustworthy.
5. **Settings** — language, notification thresholds, quiet hours, household size.

### Key screens — Angular fleet dashboard

- **Map** of sites, pin colour = level status, pin ring = leak flag.
- **Triage table** sorted by *estimated litres lost per day* — the manager's work queue.
- **Site detail** with the same level chart plus the leak evidence overlay (the night-flow window
  highlighted), so the finding is auditable, not magic.
- **Weekly loss report** exportable as PDF/CSV — this is what turns the tool into a purchase.

### Hardware / enclosure

Even the physical side should look considered: a 3D-printable enclosure (publish the STL), a
`#00507A` label with the `سبيل` wordmark, and a single RGB status LED — blue = ok, yellow = low,
red = leak, blinking = offline. Photograph the finished device on an actual rooftop tank. **That
photo is the top of your README** and it is worth more than any code screenshot.

---

## 7. Repository structure

```
sabeel/
├── README.md                        ← rooftop photo + app screenshot + 60-sec quickstart
├── LICENSE                          ← MIT (software) · CERN-OHL or CC-BY-SA (hardware)
├── docker-compose.yml               ← mosquitto + api + timescaledb + dashboard + simulator
├── docs/
│   ├── hardware.md                  ← BOM with prices, wiring diagram, assembly photos
│   ├── calibration.md               ← tank geometry → volume maths
│   ├── leak-detection.md            ← the algorithms, with real example charts
│   ├── mqtt-protocol.md             ← topics, payloads, QoS, security
│   └── deployment.md
├── firmware/
│   ├── platformio.ini
│   └── src/
│       ├── main.cpp
│       ├── sensor_ultrasonic.cpp    ← median filter, temperature compensation
│       ├── sensor_flow.cpp
│       ├── mqtt_client.cpp          ← TLS, LWT (last-will = offline)
│       ├── store_forward.cpp        ← ring buffer in flash while offline
│       ├── ota.cpp                  ← signed OTA
│       └── config_portal.cpp        ← Wi-Fi provisioning via captive portal
├── server/
│   ├── src/
│   │   ├── Sabeel.Ingest/           ← MQTT → DB worker
│   │   ├── Sabeel.Api/              ← REST + SignalR live updates
│   │   ├── Sabeel.Analytics/
│   │   │   ├── RefillDetector.cs
│   │   │   ├── ScheduleLearner.cs
│   │   │   ├── ConsumptionForecaster.cs
│   │   │   ├── LeakDetector.cs      ← night-flow + step-change
│   │   │   ├── OverflowDetector.cs
│   │   │   └── SensorHealth.cs
│   │   └── Sabeel.Domain/
│   └── tests/
│       └── Sabeel.Analytics.Tests/  ← replay recorded + synthetic traces, assert detections
├── simulator/                       ← ⭐ Node.js: simulates N tanks incl. leaks/overflow
│   └── src/{tank.ts,scenarios.ts,mqtt-publisher.ts}
├── apps/
│   ├── mobile/                      ← Flutter
│   └── dashboard/                   ← Angular
├── hardware/
│   ├── enclosure/*.stl
│   ├── wiring.svg
│   └── bom.csv
└── .github/workflows/{firmware.yml,server.yml,apps.yml}
```

---

## 8. Data model

```sql
CREATE TABLE sites (
  id            uuid PRIMARY KEY,
  name          text NOT NULL,
  owner_id      uuid NOT NULL REFERENCES users(id),
  governorate   text,
  latitude      double precision, longitude double precision,
  household_size int
);

CREATE TABLE tanks (
  id              uuid PRIMARY KEY,
  site_id         uuid NOT NULL REFERENCES sites(id),
  label           text NOT NULL,               -- 'Roof tank A'
  shape           text NOT NULL,               -- cylinder_vertical | cylinder_horizontal | box
  height_cm       numeric NOT NULL,
  diameter_cm     numeric,                     -- for cylinders
  width_cm        numeric, depth_cm numeric,   -- for boxes
  capacity_litres numeric NOT NULL,
  sensor_offset_cm numeric NOT NULL            -- sensor face → max water level
);

CREATE TABLE devices (
  id            uuid PRIMARY KEY,
  tank_id       uuid NOT NULL REFERENCES tanks(id),
  hardware_id   text NOT NULL UNIQUE,          -- ESP32 MAC
  firmware_ver  text,
  credential_hash text NOT NULL,
  last_seen_at  timestamptz,
  is_online     boolean NOT NULL DEFAULT false
);

-- TimescaleDB hypertable
CREATE TABLE readings (
  time          timestamptz NOT NULL,
  device_id     uuid NOT NULL REFERENCES devices(id),
  level_cm      numeric,
  volume_litres numeric,
  flow_lpm      numeric,
  pump_on       boolean,
  battery_mv    int,
  rssi          int
);
SELECT create_hypertable('readings', 'time');
SELECT add_retention_policy('readings', INTERVAL '2 years');

-- Pre-aggregated for fast charts
CREATE MATERIALIZED VIEW readings_hourly
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', time) AS bucket, device_id,
       avg(volume_litres) AS avg_volume,
       min(volume_litres) AS min_volume,
       max(volume_litres) AS max_volume
FROM readings GROUP BY bucket, device_id;

CREATE TABLE supply_events (               -- detected refills
  id            uuid PRIMARY KEY,
  tank_id       uuid NOT NULL REFERENCES tanks(id),
  started_at    timestamptz NOT NULL,
  ended_at      timestamptz,
  litres_gained numeric NOT NULL
);

CREATE TABLE alerts (
  id            uuid PRIMARY KEY,
  tank_id       uuid NOT NULL REFERENCES tanks(id),
  kind          text NOT NULL,               -- leak | overflow | low_level | dry_run |
                                             -- sensor_offline | supply_incoming
  severity      text NOT NULL,               -- info | warning | critical
  detected_at   timestamptz NOT NULL,
  resolved_at   timestamptz,
  evidence      jsonb NOT NULL,              -- window, slope, litres/day, chart range
  acknowledged_by uuid REFERENCES users(id)
);
CREATE INDEX ix_alerts_open ON alerts(tank_id, resolved_at) WHERE resolved_at IS NULL;
```

**Design note worth stating in the README:** `alerts.evidence` stores the exact data window that
triggered the detection, so every alert can be re-examined and the algorithm audited. Alerts that
cannot be explained are alerts that get ignored.

---

## 9. MQTT contract

```
sabeel/<siteId>/<deviceId>/telemetry     (device → server, QoS 1)
  { "ts": 1755225600, "levelCm": 118.4, "flowLpm": 0.0,
    "pumpOn": false, "batteryMv": 4020, "rssi": -63 }

sabeel/<siteId>/<deviceId>/status        (retained, LWT = {"online":false})
  { "online": true, "fw": "1.2.0", "uptimeS": 84213 }

sabeel/<siteId>/<deviceId>/cmd           (server → device, QoS 1)
  { "cmd": "set_interval", "seconds": 60 }
  { "cmd": "ota", "url": "...", "sha256": "...", "sig": "..." }

sabeel/<siteId>/<deviceId>/ack
```

Rules to document:
- Sampling every 60 s normally; every 10 s during a detected refill (higher resolution when it
  matters, battery saved the rest of the time).
- Device buffers up to 24 h of readings in flash while offline and replays them with their original
  timestamps — **the server must accept out-of-order historical data**.
- Last-Will-and-Testament marks the device offline automatically; never rely on a heartbeat alone.
- Every device has its own credential. One compromised device must never expose another.

---

## 10. Build plan

### Phase 1 — Simulator first, no hardware (week 1)  ⭐
- [ ] Node.js simulator that models a tank: capacity, consumption profile by hour, weekly refill,
      and injectable faults (slow leak, sudden leak, overflow, sensor flat-line).
- [ ] Publishes to MQTT exactly like real firmware.
- **Why first:** you can build and demo the entire backend, analytics and both front ends with
  **zero hardware**, and your CI can run detection tests deterministically. If the hardware is
  delayed, the project still ships.

### Phase 2 — Ingestion + storage (week 1–2)
- [ ] Mosquitto + ASP.NET Core worker + TimescaleDB in `docker-compose.yml`.
- [ ] Tank calibration maths (level → volume for each shape) with unit tests.
- [ ] Continuous aggregates + retention policy.

### Phase 3 — Analytics (week 2–3)  ← the core
- [ ] Refill detection, consumption model, days-remaining forecast.
- [ ] Leak detection (night flow + step change), overflow, dry-run, sensor health.
- [ ] **Tests that replay simulator traces and assert exactly which alerts fire and when.** Include
      negative cases (a household that irrigates at 3 a.m. must not be flagged).
- **Done when:** you can inject a 2 L/hour leak into the simulator and the system finds it within
  two nights, with the correct estimated loss.

### Phase 4 — Flutter app (week 4)
- [ ] Home tank visual, history chart with event overlays, alerts feed, calibration wizard.
- [ ] Push notifications, Arabic-first, full RTL.
- **Done when:** the home screen is good enough to be your README's second image.

### Phase 5 — Hardware (week 5)
- [ ] ESP32 + JSN-SR04T on a real tank (start with a bucket, then a real rooftop tank).
- [ ] Firmware: median filtering, deep sleep, Wi-Fi captive-portal provisioning, MQTT TLS,
      store-and-forward, signed OTA.
- [ ] 3D-printed enclosure, BOM with real prices from Amman suppliers.
- **Done when:** the device survives a week on a real tank and the app matches reality.

### Phase 6 — Angular fleet dashboard (week 6)
- [ ] Map, triage table ranked by estimated loss, site detail with leak evidence overlay.
- [ ] Weekly loss report export.

### Phase 7 — Publish (week 6–7)
- [ ] README: rooftop photo → app screenshot → "how leak detection works" chart → quickstart.
- [ ] `docs/hardware.md` complete enough that a stranger can build one for 25 JOD.
- [ ] Post it: Jordanian engineering and maker communities, your university, LinkedIn.
- [ ] **Deploy one real unit at home and publish a month of anonymised data** — real data from a
      real rooftop is the single most credible thing in the whole repo.

---

## 11. Honest scoping note

The hardware is optional for the portfolio. **Phases 1–4 alone** (simulator + backend + analytics +
app) already make a complete, demonstrable, impressive project — and they are pure software, which
is what you are being hired for. Build the device because it makes the story unforgettable, not
because the project needs it.

---

## 12. How to talk about it in an interview

> *"Jordan loses somewhere between 40 and 60 per cent of its water in the network, and every home
> has a rooftop tank because supply is intermittent. I built a monitoring platform around that
> reality. The insight is that a tank's level curve is already a flow signal — its derivative is
> consumption — so a cheap level sensor is enough to detect leaks. If night-time consumption never
> reaches zero for several consecutive nights, water is leaving with nobody using it, and the slope
> gives you the loss rate. I kept the rule explainable rather than using ML, because a plumber has
> to be able to verify it. The backend is ASP.NET Core on TimescaleDB, the firmware is ESP32 over
> MQTT, and I built a tank simulator first so the whole thing is testable in CI without hardware."*

---

## Sources

- [Water Challenges in Jordan — Fanack Water](https://water.fanack.com/jordan/water-challenges-in-jordan/) *(40–60 % network losses)*
- [Water supply and sanitation in Jordan — Wikipedia](https://en.wikipedia.org/wiki/Water_supply_and_sanitation_in_Jordan)
- [Jordan battles severe water crisis with managed distribution — Xinhua](https://english.news.cn/africa/20250923/5c87b818632740ceaedf96bc8116faaf/c.html)
- [Modelling scenarios for water supply and sanitation technologies in Jordan — npj Clean Water](https://www.nature.com/articles/s41545-024-00398-3)
