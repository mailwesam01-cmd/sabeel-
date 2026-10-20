using Sabeel.Domain.Models;

namespace Sabeel.Analytics;

public class RefillDetector
{
    private const decimal MinRefillThresholdLitres = 50.0m;

    public bool IsRefillEvent(TelemetryReading previous, TelemetryReading current)
    {
        if (previous == null || current == null) return false;
        
        var volumeGained = current.VolumeLitres - previous.VolumeLitres;
        
        // If volume went up significantly, it's a refill event
        return volumeGained >= MinRefillThresholdLitres;
    }
}
