using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Dapper;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using Npgsql;

namespace Saanvi.Worker
{
    public class EmailActionHandler
    {
        private readonly ILogger<EmailActionHandler> _logger;
        private readonly string _smtpHost;
        private readonly int _smtpPort;
        private readonly string _smtpUser;
        private readonly string _smtpPass;
        private readonly string _fromEmail;
        private readonly string _sessionSecret;

        public EmailActionHandler(IConfiguration config, ILogger<EmailActionHandler> logger)
        {
            _logger = logger;
            _smtpHost = config["EMAIL_HOST"];
            _smtpPort = int.TryParse(config["EMAIL_PORT"], out int p) ? p : 587;
            _smtpUser = config["EMAIL_USERNAME"];
            _smtpPass = config["EMAIL_PASSWORD"];
            _fromEmail = config["EMAIL_FROM"] ?? "noreply@saanvi.com";
            _sessionSecret = config["SESSION_SECRET"];
        }

        public async Task ExecuteAsync(WorkflowAction action, SaanviEvent evt, NpgsqlConnection connection)
        {
            var config = JsonNode.Parse(action.Configuration);
            string templateKey = config["template_key"]?.ToString();
            string recipientField = config["recipient_field"]?.ToString();
            
            if (string.IsNullOrEmpty(templateKey) || string.IsNullOrEmpty(recipientField))
            {
                throw new Exception("Invalid SEND_EMAIL configuration: missing template_key or recipient_field");
            }

            string recipientEmail = WorkflowEngine.ExtractValue(evt.Payload, recipientField);
            if (string.IsNullOrEmpty(recipientEmail))
            {
                throw new Exception($"Could not extract recipient email from path {recipientField}");
            }

            var template = await connection.QueryFirstOrDefaultAsync<EmailTemplate>(
                "SELECT uuid AS Uuid, template_key AS TemplateKey, name AS TemplateName, subject AS Subject, html_body AS HtmlContent FROM sph_email_templates WHERE template_key = @TemplateKey",
                new { TemplateKey = templateKey }
            );

            if (template == null)
            {
                throw new Exception($"Email template not found: {templateKey}");
            }

            // Substitute variables
            string htmlBody = template.HtmlContent;
            string subject = template.Subject;
            
            // 1. Fetch global dynamic variables
            var dynamicVariables = await connection.QueryAsync<dynamic>(
                @"SELECT dv.variable_name, dv.value 
                  FROM sph_dynamic_variables dv"
            );

            var resolvedVars = new Dictionary<string, string>();

            foreach (var dynVar in dynamicVariables)
            {
                resolvedVars[dynVar.variable_name.ToString()] = dynVar.value?.ToString() ?? "";
            }

            // 2. Resolve explicit runtime mappings (highest precedence)
            var variables = config["variables"] as JsonObject;
            
            if (variables != null)
            {
                foreach (var kvp in variables)
                {
                    string varName = kvp.Key;
                    string path = kvp.Value?.ToString();
                    string val = WorkflowEngine.ExtractValue(evt.Payload, path) ?? "";

                    // Security: If the field is an encrypted password, decrypt it
                    if (path.Contains("encryptedPassword", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(val))
                    {
                        try
                        {
                            val = CryptoHelper.Decrypt(val, _sessionSecret);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to decrypt password payload");
                            val = "[ENCRYPTED]";
                        }
                    }

                    string token = varName.StartsWith("$$") ? varName : $"$${varName}$$";
                    resolvedVars[token] = val;
                }
            }

            // 3. Apply variables to HTML and Subject
            foreach (var kvp in resolvedVars)
            {
                htmlBody = htmlBody.Replace(kvp.Key, kvp.Value);
                subject = subject?.Replace(kvp.Key, kvp.Value);
            }

            // Send via SMTP
            await SendEmailAsync(recipientEmail, subject, htmlBody);
            
            _logger.LogInformation($"Email sent successfully to {recipientEmail} using template {templateKey}");
        }

        private async Task SendEmailAsync(string to, string subject, string html)
        {
            var message = new MimeMessage();
            string fromName = Environment.GetEnvironmentVariable("EMAIL_FROM_NAME")?.Trim('"')?.Trim('\'') ?? "Saanvi";
            message.From.Add(new MailboxAddress(fromName, _fromEmail));
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = html
            };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            try
            {
                if (string.IsNullOrEmpty(_smtpHost))
                {
                    _logger.LogWarning("SMTP credentials not fully configured. Simulating email send.");
                    return;
                }

                await client.ConnectAsync(_smtpHost, _smtpPort, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_smtpUser, _smtpPass);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMTP Send failed");
                throw; // rethrow to trigger retry/failure logic in WorkflowEngine
            }
        }
    }
}
