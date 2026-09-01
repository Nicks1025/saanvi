using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace Saanvi.Worker
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureAppConfiguration((hostingContext, config) =>
                {
                    var envFile = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "../../backend/.env"));
                    if (File.Exists(envFile))
                    {
                        foreach (var line in File.ReadAllLines(envFile))
                        {
                            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
                            var parts = line.Split('=', 2);
                            if (parts.Length == 2)
                            {
                                var key = parts[0].Trim();
                                var value = parts[1].Trim().Trim('"').Trim('\'');
                                Environment.SetEnvironmentVariable(key, value);
                            }
                        }
                    }
                    config.AddEnvironmentVariables();
                })
                .ConfigureServices((hostContext, services) =>
                {
                    services.AddSingleton<EmailActionHandler>();
                    services.AddSingleton<WorkflowEngine>();
                    services.AddHostedService<EventConsumer>();
                });
    }
}
