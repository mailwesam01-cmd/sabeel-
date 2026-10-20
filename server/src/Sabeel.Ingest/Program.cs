using Sabeel.Ingest;

IHost host = Host.CreateDefaultBuilder(args)
    .ConfigureServices((hostContext, services) =>
    {
        services.AddHostedService<MqttIngestWorker>();
    })
    .Build();

host.Run();
