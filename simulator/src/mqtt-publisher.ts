import * as mqtt from 'mqtt';
import { Tank } from './tank';
import { SimulatorScenario, ScenarioType } from './scenarios';

const BROKER_URL = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const SITE_ID = 'site-123';
const DEVICE_ID = 'esp32-abc';

console.log(`Connecting to MQTT broker at ${BROKER_URL}...`);
const client = mqtt.connect(BROKER_URL);

const tank = new Tank({
  id: 'tank-1',
  capacityLitres: 2000,
  heightCm: 150,
  sensorOffsetCm: 10
}, 1500);

const scenarioType = (process.env.SCENARIO as ScenarioType) || 'normal';
const sim = new SimulatorScenario(tank, scenarioType);

console.log(`Starting simulation with scenario: ${scenarioType}`);

client.on('connect', () => {
  console.log('Connected to MQTT broker.');
  
  client.publish(`sabeel/${SITE_ID}/${DEVICE_ID}/status`, JSON.stringify({ online: true, fw: "sim-1.0", uptimeS: 0 }), { retain: true });

  let virtualTime = 0; // minutes since start of simulation week (Sunday 00:00)

  // Simulation loop: 1 second real = 1 minute simulation
  setInterval(() => {
    virtualTime += 1; 
    
    const state = sim.step(1);
    
    const payload = {
      ts: Math.floor(Date.now() / 1000) + (virtualTime * 60), 
      levelCm: state.levelCm,
      flowLpm: 0,
      pumpOn: false,
      batteryMv: 4000,
      rssi: -60,
      _virtualVol: state.volume 
    };

    const topic = `sabeel/${SITE_ID}/${DEVICE_ID}/telemetry`;
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) {
        console.error('Publish error', err);
      } else {
        const day = Math.floor((virtualTime % 10080) / 1440);
        const hour = Math.floor((virtualTime % 1440) / 60);
        const min = virtualTime % 60;
        console.log(`[Day ${day} ${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}] Published -> Level: ${state.levelCm}cm | Vol: ${state.volume}L`);
      }
    });

  }, 1000); 
});
