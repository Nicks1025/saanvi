const BaseService = require('../../../base/baseService');
const { enqueueEmailJob } = require('../../../services/jobQueueService');

class EmailTemplateService extends BaseService {

  async getAllTemplates() {
    return await this.repository.getAllTemplates();
  }

  async getTemplate(uuid) {
    const template = await this.repository.getTemplateByUuid(uuid);
    if (!template) throw new Error('Template not found.');
    return template;
  }

  async createTemplate(data, userUuid) {
    if (!data.template_key || !data.name || !data.subject || !data.html_body) {
      throw new Error('Key, name, subject, and html_body are required.');
    }

    const existing = await this.repository.getTemplateByKey(data.template_key);
    if (existing) throw new Error('Template with this key already exists.');

    const payload = {
      uuid: this.generateUuid(),
      template_key: data.template_key,
      name: data.name,
      description: data.description || null,
      subject: data.subject,
      html_body: data.html_body,
      plain_text_body: data.plain_text_body || null,
      status: data.status || 'ACTIVE',
      available_variables: data.available_variables ? JSON.stringify(data.available_variables) : '[]',
      editor_mode: data.editor_mode || 'VISUAL',
      design_json: data.design_json ? JSON.stringify(data.design_json) : null,
      linked_table: data.linked_table || null,
      linked_table_key: data.linked_table_key || 'email',
      version: 1,
      created_by: userUuid,
      updated_by: userUuid
    };

    await this.repository.createTemplate(payload);
    return payload;
  }

  async updateTemplate(uuid, data, userUuid) {
    const template = await this.repository.getTemplateByUuid(uuid);
    if (!template) throw new Error('Template not found.');

    const payload = {
      updated_by: userUuid,
      version: (template.version || 1) + 1
    };

    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.subject !== undefined) payload.subject = data.subject;
    if (data.html_body !== undefined) payload.html_body = data.html_body;
    if (data.plain_text_body !== undefined) payload.plain_text_body = data.plain_text_body;
    if (data.status !== undefined) payload.status = data.status;
    if (data.available_variables !== undefined) payload.available_variables = JSON.stringify(data.available_variables);
    if (data.editor_mode !== undefined) payload.editor_mode = data.editor_mode;
    if (data.design_json !== undefined) payload.design_json = data.design_json ? JSON.stringify(data.design_json) : null;
    if (data.linked_table !== undefined) payload.linked_table = data.linked_table || null;
    if (data.linked_table_key !== undefined) payload.linked_table_key = data.linked_table_key || 'email';

    await this.repository.updateTemplate(uuid, payload);
    return await this.repository.getTemplateByUuid(uuid);
  }

  async previewTemplate(data) {
    if (!data.html_body || !data.subject) throw new Error('HTML and subject are required for preview.');
    
    // Very basic regex-based variable replacement for preview
    const replaceVars = (str, vars) => {
      if (!str) return '';
      return str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, p1) => {
        return vars[p1] !== undefined ? vars[p1] : match;
      });
    };

    const vars = data.preview_variables || {};
    
    return {
      subject: replaceVars(data.subject, vars),
      html_body: replaceVars(data.html_body, vars)
    };
  }

  async testTemplate(uuid, { recipient_email, test_variables = {} }) {
    const template = await this.getTemplate(uuid);
    if (!template) throw new Error('Template not found.');

    // We enqueue a job using jobQueueService (BullMQ), which the emailWorker will process 
    // or the .NET worker can process if it's listening to this queue.
    // The requirement states to test via the centralized email infrastructure.
    const jobId = await enqueueEmailJob(template.template_key, recipient_email, test_variables);
    return { success: true, message: 'Test email queued successfully.', job_id: jobId };
  }

  async getEmailLogs() {
    return await this.repository.getEmailLogs();
  }

  async deleteTemplate(uuid) {
    const template = await this.repository.getTemplateByUuid(uuid);
    if (!template) throw new Error('Template not found.');

    const linkedWorkflows = await this.repository.getLinkedWorkflows(template.template_key);
    if (linkedWorkflows && linkedWorkflows.length > 0) {
      throw new Error(`Cannot delete template. It is currently linked to the following workflows: ${linkedWorkflows.join(', ')}`);
    }

    await this.repository.deleteTemplate(uuid);
  }

  async getTableColumns(tableName) {
    if (!tableName) throw new Error('tableName is required.');
    return await this.repository.getTableColumns(tableName);
  }
}

module.exports = EmailTemplateService;
