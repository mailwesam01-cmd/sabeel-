namespace Sabeel.Domain.Models;

public class Tank
{
    public Guid Id { get; set; }
    public Guid SiteId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Shape { get; set; } = string.Empty;
    public decimal HeightCm { get; set; }
    public decimal? DiameterCm { get; set; }
    public decimal? WidthCm { get; set; }
    public decimal? DepthCm { get; set; }
    public decimal CapacityLitres { get; set; }
    public decimal SensorOffsetCm { get; set; }
}

public class TelemetryReading
{
    public DateTime Time { get; set; }
    public Guid DeviceId { get; set; }
    public decimal LevelCm { get; set; }
    public decimal VolumeLitres { get; set; }
    public decimal FlowLpm { get; set; }
    public bool PumpOn { get; set; }
    public int BatteryMv { get; set; }
    public int Rssi { get; set; }
}
