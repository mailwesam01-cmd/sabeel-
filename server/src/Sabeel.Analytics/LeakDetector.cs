using Sabeel.Domain.Models;

namespace Sabeel.Analytics;

public class LeakDetector
{
    private const decimal MinLeakRateLitresPerHour = 1.0m; // Example threshold
    
    // In a real application, this would query the DB for the historical data of the night window.
    // For this demonstration, we expose a method that takes a list of night readings.
    public (bool isLeak, decimal estimatedLossLitresPerDay) DetectContinuousNightLeak(List<TelemetryReading> nightReadings)
    {
        if (nightReadings == null || nightReadings.Count < 2)
            return (false, 0);

        // Sort by time
        var sorted = nightReadings.OrderBy(r => r.Time).ToList();
        
        // Calculate the rate of volume change (litres/hour)
        var first = sorted.First();
        var last = sorted.Last();
        
        var timeSpanHours = (decimal)(last.Time - first.Time).TotalHours;
        if (timeSpanHours <= 0) return (false, 0);

        var volumeChange = last.VolumeLitres - first.VolumeLitres; // Should be negative if dropping
        
        // If volume increased, it's not a leak, it's a refill
        if (volumeChange >= 0) return (false, 0);

        var ratePerHour = Math.Abs(volumeChange) / timeSpanHours;

        if (ratePerHour >= MinLeakRateLitresPerHour)
        {
            // Extrapolate to 24 hours
            var estimatedLossLitresPerDay = ratePerHour * 24;
            return (true, estimatedLossLitresPerDay);
        }

        return (false, 0);
    }
}
