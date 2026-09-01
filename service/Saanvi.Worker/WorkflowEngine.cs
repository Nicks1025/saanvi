using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Saanvi.Worker
{
    public class WorkflowEngine
    {
        private readonly string _connectionString;
        private readonly ILogger<WorkflowEngine> _logger;
        private readonly EmailActionHandler _emailHandler;

        public WorkflowEngine(IConfiguration configuration, ILogger<WorkflowEngine> logger, EmailActionHandler emailHandler)
        {
            string url = configuration.GetConnectionString("DefaultConnection") ?? configuration["DATABASE_URL"];
            
            Console.WriteLine($"[DEBUG] Loaded URL: {url}");
            
            if (!string.IsNullOrEmpty(url) && url.StartsWith("postgres"))
            {
                var uri = new Uri(url);
                string host = uri.Host;
                int port = uri.Port > 0 ? uri.Port : 5432;
                string[] userInfo = uri.UserInfo.Split(':');
                string username = userInfo.Length > 0 ? userInfo[0] : "";
                string password = userInfo.Length > 1 ? userInfo[1] : "";
                
                // URL decode password if necessary
                password = Uri.UnescapeDataString(password);
                
                string database = uri.LocalPath.TrimStart('/');
                
                _connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password};";
            }
            else
            {
                _connectionString = url;
            }

            _logger = logger;
            _emailHandler = emailHandler;
        }

        public async Task ProcessEventAsync(SaanviEvent evt)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var workflows = (await connection.QueryAsync<Workflow>(
                "SELECT id, trigger_event_key AS TriggerEventKey, name FROM sph_workflows WHERE trigger_event_key = @EventType AND active = true ORDER BY priority DESC",
                new { evt.EventType })).ToList();

            if (!workflows.Any())
            {
                _logger.LogInformation($"No active workflows found for event type: {evt.EventType}");
                return;
            }

            foreach (var workflow in workflows)
            {
                try
                {
                    // 1. Idempotency Check
                    bool alreadyExecuted = await connection.ExecuteScalarAsync<bool>(
                        "SELECT EXISTS(SELECT 1 FROM sph_workflow_executions WHERE event_id = @EventId AND workflow_id = @WorkflowId)",
                        new { EventId = Guid.Parse(evt.EventId), WorkflowId = workflow.Id }
                    );

                    if (alreadyExecuted)
                    {
                        _logger.LogInformation($"Workflow {workflow.Name} already executed for event {evt.EventId}. Skipping.");
                        continue;
                    }

                    // 2. Evaluate Conditions
                    var conditions = (await connection.QueryAsync<WorkflowCondition>(
                        "SELECT id, workflow_id AS WorkflowId, field_path AS FieldPath, operator, expected_value AS ExpectedValue FROM sph_workflow_conditions WHERE workflow_id = @WorkflowId ORDER BY execution_order ASC",
                        new { WorkflowId = workflow.Id })).ToList();

                    bool conditionsMet = EvaluateConditions(conditions, evt.Payload);
                    if (!conditionsMet)
                    {
                        _logger.LogInformation($"Conditions not met for workflow {workflow.Name}.");
                        continue;
                    }

                    // Mark as pending
                    await connection.ExecuteAsync(
                        "INSERT INTO sph_workflow_executions (event_id, workflow_id, status) VALUES (@EventId, @WorkflowId, 'PENDING') ON CONFLICT DO NOTHING",
                        new { EventId = Guid.Parse(evt.EventId), WorkflowId = workflow.Id }
                    );

                    // 3. Execute Actions
                    var actions = (await connection.QueryAsync<WorkflowAction>(
                        "SELECT id, workflow_id AS WorkflowId, action_type AS ActionType, configuration FROM sph_workflow_actions WHERE workflow_id = @WorkflowId AND active = true ORDER BY execution_order ASC",
                        new { WorkflowId = workflow.Id })).ToList();

                    foreach (var action in actions)
                    {
                        if (action.ActionType == "SEND_EMAIL")
                        {
                            await _emailHandler.ExecuteAsync(action, evt, connection);
                        }
                        else
                        {
                            _logger.LogWarning($"Unknown action type: {action.ActionType}");
                        }
                    }

                    // Mark as completed
                    await connection.ExecuteAsync(
                        "UPDATE sph_workflow_executions SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE event_id = @EventId AND workflow_id = @WorkflowId",
                        new { EventId = Guid.Parse(evt.EventId), WorkflowId = workflow.Id }
                    );
                    _logger.LogInformation($"Successfully completed workflow {workflow.Name}");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error executing workflow {workflow.Name}");
                    await connection.ExecuteAsync(
                        "UPDATE sph_workflow_executions SET status = 'FAILED', error_details = @Error, completed_at = CURRENT_TIMESTAMP WHERE event_id = @EventId AND workflow_id = @WorkflowId",
                        new { Error = ex.Message, EventId = Guid.Parse(evt.EventId), WorkflowId = workflow.Id }
                    );
                }
            }
        }

        private bool EvaluateConditions(List<WorkflowCondition> conditions, JsonNode payload)
        {
            if (!conditions.Any()) return true;

            foreach (var cond in conditions)
            {
                if (cond.Operator == "ALWAYS") continue;

                // Simple JSON path extraction (e.g. "event.data.email" -> we just have payload directly)
                // If it's a flat object, we can just use the key.
                string fieldValue = ExtractValue(payload, cond.FieldPath);

                switch (cond.Operator)
                {
                    case "EXISTS":
                        if (string.IsNullOrEmpty(fieldValue)) return false;
                        break;
                    case "EQUALS":
                        if (fieldValue != cond.ExpectedValue) return false;
                        break;
                    case "NOT_EQUALS":
                        if (fieldValue == cond.ExpectedValue) return false;
                        break;
                    default:
                        _logger.LogWarning($"Unknown operator {cond.Operator}");
                        return false;
                }
            }
            return true;
        }

        public static string ExtractValue(JsonNode payload, string path)
        {
            if (string.IsNullOrEmpty(path)) return null;
            
            // Clean up path if it starts with "event.data."
            path = path.Replace("event.data.", "");
            
            try
            {
                var parts = path.Split('.');
                JsonNode current = payload;
                foreach (var p in parts)
                {
                    if (current is JsonObject obj && obj.ContainsKey(p))
                    {
                        current = current[p];
                    }
                    else
                    {
                        return null;
                    }
                }
                return current?.ToString();
            }
            catch
            {
                return null;
            }
        }
    }
}
