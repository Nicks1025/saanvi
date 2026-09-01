using System;
using System.Text.Json.Nodes;

namespace Saanvi.Worker
{
    public class SaanviEvent
    {
        public string EventId { get; set; }
        public string EventType { get; set; }
        public string AggregateId { get; set; }
        public string PayloadJson { get; set; }
        public JsonNode Payload => JsonNode.Parse(PayloadJson);
    }

    public class Workflow
    {
        public Guid Id { get; set; }
        public string TriggerEventKey { get; set; }
        public string Name { get; set; }
    }

    public class WorkflowCondition
    {
        public Guid Id { get; set; }
        public Guid WorkflowId { get; set; }
        public string FieldPath { get; set; }
        public string Operator { get; set; }
        public string ExpectedValue { get; set; }
    }

    public class WorkflowAction
    {
        public Guid Id { get; set; }
        public Guid WorkflowId { get; set; }
        public string ActionType { get; set; }
        public string Configuration { get; set; }
    }

    public class EmailTemplate
    {
        public Guid Uuid { get; set; }
        public string TemplateKey { get; set; }
        public string TemplateName { get; set; }
        public string Subject { get; set; }
        public string HtmlContent { get; set; }
    }
}
