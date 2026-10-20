CREATE TABLE users (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL
);

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
-- Requires timescale enterprise or standard with appropriate configs, we will add retention policy:
SELECT add_retention_policy('readings', INTERVAL '2 years');

-- Pre-aggregated for fast charts
CREATE MATERIALIZED VIEW readings_hourly
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', time) AS bucket, device_id,
       avg(volume_litres) AS avg_volume,
       min(volume_litres) AS min_volume,
       max(volume_litres) AS max_volume
FROM readings GROUP BY bucket, device_id;

CREATE TABLE supply_events (               
  id            uuid PRIMARY KEY,
  tank_id       uuid NOT NULL REFERENCES tanks(id),
  started_at    timestamptz NOT NULL,
  ended_at      timestamptz,
  litres_gained numeric NOT NULL
);

CREATE TABLE alerts (
  id            uuid PRIMARY KEY,
  tank_id       uuid NOT NULL REFERENCES tanks(id),
  kind          text NOT NULL,               
  severity      text NOT NULL,               
  detected_at   timestamptz NOT NULL,
  resolved_at   timestamptz,
  evidence      jsonb NOT NULL,              
  acknowledged_by uuid REFERENCES users(id)
);
CREATE INDEX ix_alerts_open ON alerts(tank_id, resolved_at) WHERE resolved_at IS NULL;
