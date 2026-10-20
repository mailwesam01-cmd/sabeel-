using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Extensions.ManagedClient;
using System.Text.Json;
using System.Text;
using Dapper;
using Npgsql;
using Sabeel.Domain.Models;
using Sabeel.Analytics;

namespace Sabeel.Ingest;

public class MqttIngestWorker : BackgroundService
{
    private readonly ILogger<MqttIngestWorker> _logger;
    private readonly IConfiguration _configuration;
    private IManagedMqttClient _mqttClient;
    private readonly string _dbConnectionString;

    public MqttIngestWorker(ILogger<MqttIngestWorker> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _dbConnectionString = _configuration.GetConnectionString("DefaultConnection") 
            ?? "Host=localhost;Database=sabeel;Username=postgres;Password=sabeelpassword";
        
        var mqttFactory = new MqttFactory();
        _mqttClient = mqttFactory.CreateManagedMqttClient();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var mqttBrokerUrl = _configuration["MQTT_BROKER"] ?? "localhost";
        
        var mqttClientOptions = new MqttClientOptionsBuilder()
            .WithClientId($"Sabeel-Ingest-{Guid.NewGuid()}")
            .WithTcpServer(mqttBrokerUrl, 1883)
            .Build();

        var managedMqttClientOptions = new ManagedMqttClientOptionsBuilder()
            .WithClientOptions(mqttClientOptions)
            .Build();

        _mqttClient.ApplicationMessageReceivedAsync += async e =>
        {
            var topic = e.ApplicationMessage.Topic;
            var payload = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);
            
            _logger.LogInformation($"Received message on {topic}");

            if (topic.StartsWith("sabeel/") && topic.EndsWith("/telemetry"))
            {
                await ProcessTelemetryMessageAsync(topic, payload);
            }
        };

        await _mqttClient.StartAsync(managedMqttClientOptions);

        await _mqttClient.SubscribeAsync(new[]
        {
            new MqttTopicFilterBuilder().WithTopic("sabeel/+/+/telemetry").Build()
        });

        _logger.LogInformation("MQTT Worker connected and subscribed.");

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(1000, stoppingToken);
        }
    }

    private async Task ProcessTelemetryMessageAsync(string topic, string payload)
    {
        try
        {
            var parts = topic.Split('/');
            if (parts.Length < 4) return;
            
            var siteId = parts[1];
            var deviceHardwareId = parts[2];

            using var document = JsonDocument.Parse(payload);
            var root = document.RootElement;
            
            var ts = root.GetProperty("ts").GetInt64();
            var levelCm = root.GetProperty("levelCm").GetDecimal();
            var flowLpm = root.GetProperty("flowLpm").GetDecimal();
            var pumpOn = root.GetProperty("pumpOn").GetBoolean();
            var batteryMv = root.GetProperty("batteryMv").GetInt32();
            var rssi = root.GetProperty("rssi").GetInt32();
            
            var time = DateTimeOffset.FromUnixTimeSeconds(ts).UtcDateTime;

            using var connection = new NpgsqlConnection(_dbConnectionString);
            
            // In a real app, you would cache this. For now, fetch to do the math
            var tankQuery = @"
                SELECT t.id as Id, t.capacity_litres as CapacityLitres, t.height_cm as HeightCm, t.sensor_offset_cm as SensorOffsetCm, d.id as DeviceId
                FROM tanks t
                JOIN devices d ON t.id = d.tank_id
                WHERE d.hardware_id = @HardwareId";
            
            var tankInfo = await connection.QueryFirstOrDefaultAsync<dynamic>(tankQuery, new { HardwareId = deviceHardwareId });
            
            if (tankInfo == null)
            {
                _logger.LogWarning($"Unknown device hardware ID: {deviceHardwareId}");
                return;
            }

            // Calculate Volume based on LevelCm
            // levelCm is the distance from the sensor to the water surface
            decimal totalTankHeightToSensor = (decimal)tankInfo.heightcm + (decimal)tankInfo.sensoroffsetcm;
            decimal waterHeight = totalTankHeightToSensor - levelCm;
            
            // Make sure water height is within bounds
            if (waterHeight < 0) waterHeight = 0;
            if (waterHeight > (decimal)tankInfo.heightcm) waterHeight = (decimal)tankInfo.heightcm;

            // Simple linear volume calculation (assuming uniform vertical shape like cylinder_vertical or box)
            decimal volumeLitres = (waterHeight / (decimal)tankInfo.heightcm) * (decimal)tankInfo.capacitylitres;

            var insertQuery = @"
                INSERT INTO readings (time, device_id, level_cm, volume_litres, flow_lpm, pump_on, battery_mv, rssi)
                VALUES (@Time, @DeviceId, @LevelCm, @VolumeLitres, @FlowLpm, @PumpOn, @BatteryMv, @Rssi)";
                
            await connection.ExecuteAsync(insertQuery, new 
            {
                Time = time,
                DeviceId = tankInfo.deviceid,
                LevelCm = levelCm,
                VolumeLitres = volumeLitres,
                FlowLpm = flowLpm,
                PumpOn = pumpOn,
                BatteryMv = batteryMv,
                Rssi = rssi
            });

            _logger.LogInformation($"Saved reading for device {deviceHardwareId}: {volumeLitres:F2}L");

            // --- Analytics Engine Integration ---
            var refillDetector = new RefillDetector();
            var lastReadingQuery = @"
                SELECT time as Time, device_id as DeviceId, volume_litres as VolumeLitres
                FROM readings 
                WHERE device_id = @DeviceId AND time < @CurrentTime
                ORDER BY time DESC LIMIT 1";
            
            var lastReading = await connection.QueryFirstOrDefaultAsync<TelemetryReading>(lastReadingQuery, new { DeviceId = tankInfo.deviceid, CurrentTime = time });

            if (lastReading != null)
            {
                var currentReading = new TelemetryReading { VolumeLitres = volumeLitres };
                if (refillDetector.IsRefillEvent(lastReading, currentReading))
                {
                    _logger.LogWarning($"💧 REFILL DETECTED for Tank {tankInfo.Id}! Volume increased from {lastReading.VolumeLitres:F1}L to {volumeLitres:F1}L");
                    
                    var insertAlertQuery = @"
                        INSERT INTO alerts (id, tank_id, kind, severity, detected_at, evidence)
                        VALUES (@Id, @TankId, 'supply_incoming', 'info', @DetectedAt, @Evidence::jsonb)";
                        
                    await connection.ExecuteAsync(insertAlertQuery, new {
                        Id = Guid.NewGuid(),
                        TankId = tankInfo.Id,
                        DetectedAt = time,
                        Evidence = JsonSerializer.Serialize(new { PreviousVolume = lastReading.VolumeLitres, CurrentVolume = volumeLitres })
                    });
                }
            }
            // ------------------------------------

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing telemetry message");
        }
    }
}
