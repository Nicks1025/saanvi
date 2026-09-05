const { v4: uuidv4 } = require('uuid');
const QueryHelper = require('../database/queryHelper');
const { sendEmail } = require('../providers/emailProvider');
const { getEmailQueue } = require('./jobQueueService');
const { decrypt } = require('./cryptoService');

class EmailService {
  /**
   * Main API for sending emails asynchronously via the queue.
   */
  async sendAsync(options) {
    const {
      to,
      subject,
      template,
      variables = {},
      encryptedVariables = {},
      html,
      text,
      type = 'TRANSACTIONAL',
      campaign_uuid = null
    } = options;

    if (!to) throw new Error('Recipient email "to" is required.');
    if (!template && !html) throw new Error('Either "template" or "html" must be provided.');
    if (template && html) throw new Error('Cannot provide both "template" and "html". Please use one.');
    
    // Create the queue job payload
    const payload = {
      to,
      subject,
      template,
      variables,
      encryptedVariables,
      html,
      text,
      type,
      campaign_uuid,
      queuedAt: new Date().toISOString()
    };

    const queue = getEmailQueue();
    if (!queue) {
      console.warn('[EmailService] Queue not initialized. Falling back to direct send.');
      return await this.sendDirect(payload);
    }

    const job = await queue.add('sendEmail', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false
    });

    if (job && job.id) {
      // Record initial PENDING status
      try {
        const qh = new QueryHelper();
        await qh.from('sph_email_logs')
          .insert({
            uuid: uuidv4(),
            recipient: to,
            template_key: template || null,
            job_id: job.id,
            status: 'PENDING',
            type
          })
          .execute();
      } catch (e) {
        console.error('[EmailService] Failed to log initial email state to DB:', e.message);
      }
      return job.id;
    }
    
    return null;
  }

  /**
   * Internal method used by workers to process the actual sending.
   * Can also be called directly for synchronous sending.
   */
  async sendDirect(options, existingJobId = null) {
    const {
      to,
      subject: defaultSubject,
      template,
      variables = {},
      encryptedVariables = {},
      html: directHtml,
      text: directText,
      type = 'TRANSACTIONAL',
      campaign_uuid = null
    } = options;

    let finalSubject = defaultSubject;
    let finalHtml = directHtml;
    let finalText = directText;
    const qh = new QueryHelper();

    // 1. Process Template if provided
    if (template) {
      // Decrypt any encrypted variables
      if (encryptedVariables) {
        for (const [key, value] of Object.entries(encryptedVariables)) {
          try {
            variables[key] = decrypt(value);
          } catch (err) {
            console.error(`[EmailService] Failed to decrypt variable ${key}:`, err.message);
          }
        }
      }

      // Fetch template
      const result = await qh.from('sph_email_templates')
        .where('template_key', 'eq', template)
        .where('status', 'eq', 'ACTIVE')
        .execute();
        
      const templateData = result[0];
      if (!templateData) {
        throw new Error(`Template '${template}' not found or inactive.`);
      }

      // Resolve global dynamic variables
      const dynVarRows = await qh.from('sph_dynamic_variables').execute();
      const dynamicVarMap = {};
      for (const row of dynVarRows) {
        const key = row.variable_name.replace(/^\$\$/, '').replace(/\$\$$/, '');
        dynamicVarMap[key] = row.value;
      }

      // Resolve linked table columns
      const linkedTable = templateData.linked_table || null;
      let tableVars = {};

      if (linkedTable) {
        try {
          const userRows = await qh.db('users').where('email', to).select('*');
          const userRow = userRows && userRows.length > 0 ? userRows[0] : null;

          if (userRow) {
            const idCol = linkedTable === 'users' ? 'uuid' : 'user_uuid';
            const linkedRows = await qh.db(linkedTable).where(idCol, userRow.uuid).select('*');
            if (linkedRows && linkedRows.length > 0) {
              tableVars = { ...linkedRows[0] };
            }
          }
        } catch (linkedErr) {
          console.warn(`[EmailService] Could not fetch linked table '${linkedTable}':`, linkedErr.message);
        }
      }

      const resolvedVars = { ...dynamicVarMap, ...tableVars, ...variables };

      const replaceVars = (str, vars) => {
        if (!str) return '';
        let output = str;
        output = output.replace(/\{\{\s*\$\$(.+?)\$\$\s*\}\}/g, (match, p1) => {
          const key = p1.trim();
          return vars[key] !== undefined ? vars[key] : match;
        });
        output = output.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, p1) => {
          return vars[p1] !== undefined ? vars[p1] : match;
        });
        return output;
      };

      finalSubject = replaceVars(templateData.subject, resolvedVars) || defaultSubject;
      finalHtml = replaceVars(templateData.html_body, resolvedVars);
      finalText = replaceVars(templateData.plain_text_body, resolvedVars);
    }

    if (!finalSubject) throw new Error('Subject is required.');
    if (!finalHtml && !finalText) throw new Error('Content (HTML or Text) is required.');

    const logUuid = uuidv4();
    
    // Create log if this wasn't called via a queue job (which logs upon enqueue)
    if (!existingJobId) {
      try {
        await qh.from('sph_email_logs').insert({
          uuid: logUuid,
          recipient: to,
          template_key: template || null,
          status: 'PENDING',
          type
        }).execute();
      } catch (e) {
        console.error('[EmailService] Failed to log direct email:', e.message);
      }
    }

    try {
      // 2. Call Provider
      const info = await sendEmail({
        to,
        subject: finalSubject,
        html: finalHtml,
        text: finalText
      });
      
      const providerMessageId = info?.messageId || null;

      // 3. Update Log on Success
      const updateQh = new QueryHelper();
      const logQuery = updateQh.from('sph_email_logs');
      if (existingJobId) {
        logQuery.where('job_id', 'eq', existingJobId);
      } else {
        logQuery.where('uuid', 'eq', logUuid);
      }
      
      await logQuery.update({
        status: 'COMPLETED',
        sent_at: new Date().toISOString()
      }).execute();

      // If marketing campaign, update recipient status
      if (campaign_uuid) {
        await updateQh.from('sph_email_campaign_recipients')
          .where('campaign_uuid', 'eq', campaign_uuid)
          .where('email', 'eq', to)
          .update({
            status: 'COMPLETED',
            sent_at: new Date().toISOString(),
            provider_message_id: providerMessageId
          }).execute();
      }

      return { success: true, messageId: providerMessageId };
    } catch (error) {
      // 4. Update Log on Failure
      const updateQh = new QueryHelper();
      const logQuery = updateQh.from('sph_email_logs');
      if (existingJobId) {
        logQuery.where('job_id', 'eq', existingJobId);
      } else {
        logQuery.where('uuid', 'eq', logUuid);
      }

      await logQuery.update({
        status: 'FAILED',
        error_details: error.message
      }).execute();
      
      if (campaign_uuid) {
        await updateQh.from('sph_email_campaign_recipients')
          .where('campaign_uuid', 'eq', campaign_uuid)
          .where('email', 'eq', to)
          .update({
            status: 'FAILED',
            error_details: error.message
          }).execute();
      }

      throw error;
    }
  }
}

module.exports = new EmailService();
