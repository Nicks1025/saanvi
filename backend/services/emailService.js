const { v4: uuidv4 } = require('uuid');
const QueryHelper = require('../database/queryHelper');
const { sendEmail } = require('../providers/emailProvider');
const { decrypt } = require('./cryptoService');

// NOTE: new QueryHelper() does NOT create a new DB connection.
// All QueryHelper instances share the same module-level _sharedKnex connection pool
// (defined in queryHelper.js). QueryHelper is a STATEFUL query-builder — each instance
// holds its own this._query chain — so we must create a fresh instance per operation.

class EmailService {
  /**
   * Main API for sending emails asynchronously.
   * Inserts a row into sph_email_queue (Postgres).
   * A background worker polls the table and calls sendDirect().
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

    const logUuid = uuidv4();

    // 1. Create initial PENDING log row
    try {
      const qh = new QueryHelper();
      await qh.db('sph_email_logs').insert({
        uuid: logUuid,
        recipient: to,
        template_key: template || null,
        status: 'PENDING',
      });
    } catch (e) {
      console.error('[EmailService] Failed to create initial log:', e.message);
    }

    // 2. Enqueue into sph_email_queue (Postgres)
    try {
      const qh = new QueryHelper();
      await qh.db('sph_email_queue').insert({
        id: uuidv4(),
        recipient: to,
        template_key: template || null,
        subject: subject || null,
        variables: JSON.stringify(variables),
        encrypted_variables: JSON.stringify(encryptedVariables),
        html_body: html || null,
        plain_text: text || null,
        type,
        campaign_uuid: campaign_uuid || null,
        status: 'PENDING',
        email_log_uuid: logUuid,
      });
      console.log(`[EmailService] Queued email to ${to} (log: ${logUuid})`);
    } catch (e) {
      console.error('[EmailService] Failed to enqueue email — falling back to direct send:', e.message);
      return await this.sendDirect({ to, subject, template, variables, encryptedVariables, html, text, type, campaign_uuid }, logUuid);
    }

    return logUuid;
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

      // Fetch template — fresh QueryHelper per query
      const templateResult = await (new QueryHelper()).from('sph_email_templates')
        .where('template_key', 'eq', template)
        .where('status', 'eq', 'ACTIVE')
        .execute();
        
      const templateData = templateResult[0];
      if (!templateData) {
        throw new Error(`Template '${template}' not found or inactive.`);
      }

      // Resolve global dynamic variables — fresh QueryHelper per query
      const dynVarRows = await (new QueryHelper()).from('sph_dynamic_variables').execute();
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
          const qhLinked = new QueryHelper();
          const userRows = await qhLinked.db('users').where('email', to).select('*');
          const userRow = userRows && userRows.length > 0 ? userRows[0] : null;

          if (userRow) {
            const idCol = linkedTable === 'users' ? 'uuid' : 'user_uuid';
            const linkedRows = await (new QueryHelper()).db(linkedTable).where(idCol, userRow.uuid).select('*');
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
        const qh = new QueryHelper();
        // Use raw insert (qh.db) to avoid FK violation if template_key doesn't exist
        await qh.db('sph_email_logs').insert({
          uuid: logUuid,
          recipient: to,
          template_key: template || null,
          status: 'PENDING',
        });
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

      // 3. Update Log on Success — fresh QueryHelper per query
      const successQh = new QueryHelper();
      if (existingJobId) {
        await successQh.from('sph_email_logs')
          .where('job_id', 'eq', existingJobId)
          .update({ status: 'COMPLETED', sent_at: new Date().toISOString() })
          .execute();
      } else {
        await successQh.from('sph_email_logs')
          .where('uuid', 'eq', logUuid)
          .update({ status: 'COMPLETED', sent_at: new Date().toISOString() })
          .execute();
      }

      // If marketing campaign, update recipient status
      if (campaign_uuid) {
        await (new QueryHelper()).from('sph_email_campaign_recipients')
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
      // 4. Update Log on Failure — fresh QueryHelper per query
      console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
      try {
        const failQh = new QueryHelper();
        if (existingJobId) {
          await failQh.from('sph_email_logs')
            .where('job_id', 'eq', existingJobId)
            .update({ status: 'FAILED', error_details: error.message })
            .execute();
        } else {
          await failQh.from('sph_email_logs')
            .where('uuid', 'eq', logUuid)
            .update({ status: 'FAILED', error_details: error.message })
            .execute();
        }
      } catch (logErr) {
        console.error('[EmailService] Failed to update FAILED log:', logErr.message);
      }
      
      if (campaign_uuid) {
        try {
          await (new QueryHelper()).from('sph_email_campaign_recipients')
            .where('campaign_uuid', 'eq', campaign_uuid)
            .where('email', 'eq', to)
            .update({ status: 'FAILED', error_details: error.message })
            .execute();
        } catch (recErr) {
          console.error('[EmailService] Failed to update recipient FAILED log:', recErr.message);
        }
      }

      throw error;
    }
  }
}

module.exports = new EmailService();
