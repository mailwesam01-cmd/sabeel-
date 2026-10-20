export interface TankConfig {
  id: string;
  capacityLitres: number;
  heightCm: number;
  sensorOffsetCm: number; // Distance from sensor to max water level
}

export class Tank {
  public config: TankConfig;
  public currentVolume: number;
  
  constructor(config: TankConfig, initialVolume: number = config.capacityLitres) {
    this.config = config;
    this.currentVolume = Math.min(Math.max(initialVolume, 0), config.capacityLitres);
  }

  public consume(litres: number) {
    this.currentVolume = Math.max(this.currentVolume - litres, 0);
  }

  public refill(litres: number) {
    this.currentVolume = Math.min(this.currentVolume + litres, this.config.capacityLitres);
  }

  public getSensorReadingCm(): number {
    const filledRatio = this.currentVolume / this.config.capacityLitres;
    const waterHeight = this.config.heightCm * filledRatio;
    const totalTankHeightToSensor = this.config.heightCm + this.config.sensorOffsetCm;
    const reading = totalTankHeightToSensor - waterHeight;
    return Number(reading.toFixed(1));
  }

  public getVolume(): number {
    return Number(this.currentVolume.toFixed(2));
  }
}
