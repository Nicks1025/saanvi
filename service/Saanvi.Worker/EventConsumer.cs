using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Saanvi.Worker
{
    public class EventConsumer : BackgroundService
    {
        private readonly ILogger<EventConsumer> _logger;
        private readonly IConfiguration _config;
        private readonly WorkflowEngine _workflowEngine;
        private ConnectionMultiplexer _redis;
        private IDatabase _db;
        private readonly string _streamName = "saanvi_events";
        private readonly string _groupName = "saanvi_worker_group";
        private readonly string _consumerName = "worker_" + Guid.NewGuid().ToString("N");

        public EventConsumer(ILogger<EventConsumer> logger, IConfiguration config, WorkflowEngine workflowEngine)
        {
            _logger = logger;
            _config = config;
            _workflowEngine = workflowEngine;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            string redisUrl = _config["REDIS_URL"];
            if (string.IsNullOrEmpty(redisUrl))
            {
                _logger.LogWarning("REDIS_URL not configured. Event consumer disabled.");
                return;
            }

            try
            {
                if (redisUrl.StartsWith("redis://") || redisUrl.StartsWith("rediss://"))
                {
                    bool useSsl = redisUrl.StartsWith("rediss://");
                    var uri = new Uri(redisUrl);
                    string host = uri.Host;
                    int port = uri.Port > 0 ? uri.Port : (useSsl ? 6380 : 6379);
                    string password = uri.UserInfo.Split(':').LastOrDefault();
                    
                    redisUrl = $"{host}:{port}";
                    if (!string.IsNullOrEmpty(password))
                    {
                        redisUrl += $",password={password}";
                    }
                    if (useSsl)
                    {
                        redisUrl += ",ssl=True";
                    }
                }

                _redis = await ConnectionMultiplexer.ConnectAsync(redisUrl);
                _db = _redis.GetDatabase();
                _logger.LogInformation("Connected to Redis.");

                // Ensure stream and group exist
                try
                {
                    await _db.StreamCreateConsumerGroupAsync(_streamName, _groupName, "0-0", true);
                }
                catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
                {
                    // Group already exists
                }

                _logger.LogInformation($"Started listening to stream {_streamName} as {_consumerName}");

                while (!stoppingToken.IsCancellationRequested)
                {
                    // Read 10 messages at a time, block for 2 seconds if none available
                    var messages = await _db.StreamReadGroupAsync(
                        _streamName, _groupName, _consumerName, ">", count: 10);

                    if (messages.Any())
                    {
                        foreach (var msg in messages)
                        {
                            var evt = new SaanviEvent
                            {
                                EventId = msg.Values.FirstOrDefault(v => v.Name == "eventId").Value.ToString(),
                                EventType = msg.Values.FirstOrDefault(v => v.Name == "eventType").Value.ToString(),
                                AggregateId = msg.Values.FirstOrDefault(v => v.Name == "aggregateId").Value.ToString(),
                                PayloadJson = msg.Values.FirstOrDefault(v => v.Name == "payload").Value.ToString()
                            };

                            _logger.LogInformation($"Received event {evt.EventType} ({evt.EventId})");

                            try
                            {
                                await _workflowEngine.ProcessEventAsync(evt);
                                // Acknowledge message if successful
                                await _db.StreamAcknowledgeAsync(_streamName, _groupName, msg.Id);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, $"Failed to process event {evt.EventId}");
                                // If it failed permanently, it won't be acked, and can be claimed by another consumer later
                            }
                        }
                    }
                    else
                    {
                        await Task.Delay(1000, stoppingToken);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fatal error in EventConsumer");
            }
        }
    }
}
