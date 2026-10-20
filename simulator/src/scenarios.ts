import { Tank } from './tank';

export type ScenarioType = 'normal' | 'continuous_leak' | 'sudden_leak' | 'overflow';

export class SimulatorScenario {
  private tank: Tank;
  private timeOffsetMinutes: number = 0;
  private scenarioType: ScenarioType;
  
  constructor(tank: Tank, scenarioType: ScenarioType = 'normal') {
    this.tank = tank;
    this.scenarioType = scenarioType;
  }

  public step(minutes: number = 1): { volume: number, levelCm: number } {
    this.timeOffsetMinutes += minutes;
    
    let consumptionRate = this.getBaseConsumptionRate(this.timeOffsetMinutes);
    
    switch(this.scenarioType) {
      case 'continuous_leak':
        consumptionRate += (2 / 60); // 2 L/hr leak
        break;
      case 'sudden_leak':
        if (this.timeOffsetMinutes > 2880) { // after 2 days
          consumptionRate += (50 / 60);
        }
        break;
      case 'overflow':
        if (this.isRefillWindow(this.timeOffsetMinutes)) {
          this.tank.refill(15 * minutes);
        }
        break;
    }

    if (this.scenarioType !== 'overflow' && this.isRefillWindow(this.timeOffsetMinutes)) {
        this.tank.refill(10 * minutes);
    }

    this.tank.consume(consumptionRate * minutes);
    
    return {
      volume: this.tank.getVolume(),
      levelCm: this.tank.getSensorReadingCm()
    };
  }

  private isRefillWindow(minutesTotal: number): boolean {
    const timeInWeek = minutesTotal % 10080;
    const day = Math.floor(timeInWeek / (24 * 60));
    const timeInDay = timeInWeek % (24 * 60);
    // Refill happens on day 2 (Tuesday), between 120 mins (2 AM) and 360 mins (6 AM)
    return day === 2 && timeInDay >= 120 && timeInDay <= 360;
  }

  private getBaseConsumptionRate(minutesTotal: number): number {
    const timeInDay = minutesTotal % (24 * 60);
    const hour = Math.floor(timeInDay / 60);
    
    if (hour >= 1 && hour < 5) return 0.0;
    if (hour >= 6 && hour < 9) return 2.0;
    if (hour >= 18 && hour < 22) return 1.5;
    return 0.2;
  }
}
