const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { sendEmail } = require('../providers/emailProvider');
const QueryHelper = require('../database/queryHelper');
const { decrypt } = require('../services/cryptoService');

let emailWorker = null;

const initEmailWorker = () => {
  if (!process.env.REDIS_URL) {
    console.warn('[EmailWorker] REDIS_URL not provided. Worker disabled.');
    return;
  }

  const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  emailWorker = new Worker('EmailQueue', async (job) => {
    const { templateKey, recipient, variables, encryptedVariables } = job.data;
    const qh = new QueryHelper();

    // Decrypt any encrypted variables and merge them into variables
    if (encryptedVariables) {
      for (const [key, value] of Object.entries(encryptedVariables)) {
        try {
          variables[key] = decrypt(value);
        } catch (err) {
          console.error(`[EmailWorker] Failed to decrypt variable ${key}:`, err.message);
        }
      }
    }

    try {
      // 1. Fetch template from DB — exact match on template_key
      const result = await qh.from('sph_email_templates')
        .where('template_key', 'eq', templateKey)
        .where('status', 'eq', 'ACTIVE')
        .execute();

      const template = result[0];
      if (!template) {
        throw new Error(`Template '${templateKey}' not found or inactive.`);
      }

      // 2. Resolve dynamic variables ({{$$...$$}}) from sph_dynamic_variables table in DB
      const dynVarRows = await qh.from('sph_dynamic_variables').execute();
      const dynamicVarMap = {};
      for (const row of dynVarRows) {
        // variable_name may be stored as '$$nikhil-1$$' or 'nikhil-1' — strip outer $$ for lookup
        const key = row.variable_name.replace(/^\$\$/, '').replace(/\$\$$/, '');
        dynamicVarMap[key] = row.value;
      }

      // 3. Resolve linked table columns ({{column_name}}) using the recipient email.
      //    The linked_table is set in the DB per template (e.g. user_details for USER_ACCOUNT_CREATED).
      //    For tables with a user_uuid FK, we resolve user_uuid via users.email first.
      const linkedTable = template.linked_table || null;
      let tableVars = {};

      if (linkedTable) {
        try {
          // Always get the user row by email first — gives us user_uuid
          const userRows = await qh.db('users').where('email', recipient).select('*');
          const userRow = userRows && userRows.length > 0 ? userRows[0] : null;

          if (userRow) {
            // Try to fetch the linked table by user_uuid (works for user_details etc.)
            const linkedRows = await qh.db(linkedTable)
              .where('user_uuid', userRow.uuid)
              .select('*');
            if (linkedRows && linkedRows.length > 0) {
              tableVars = { ...linkedRows[0] };
            }
          }
        } catch (linkedErr) {
          console.warn(`[EmailWorker] Could not fetch linked table '${linkedTable}':`, linkedErr.message);
          // Non-fatal — continue without table variables
        }
      }

      // Merge order (last wins): dynamic vars → table columns → caller-supplied vars → decrypted secrets
      const resolvedVars = { ...dynamicVarMap, ...tableVars, ...variables };

      // 4. Variable replacement — two formats:
      //   {{$$any content$$}} — dynamic variables resolved from sph_dynamic_variables
      //   {{column_name}}     — table column variables resolved from linked_table
      const replaceVars = (str, vars) => {
        if (!str) return '';
        let output = str;
        // Replace {{$$...$$}} — any character allowed between $$
        output = output.replace(/\{\{\s*\$\$(.+?)\$\$\s*\}\}/g, (match, p1) => {
          const key = p1.trim();
          return vars[key] !== undefined ? vars[key] : match;
        });
        // Replace {{column_name}} — alphanumeric + underscore
        output = output.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, p1) => {
          return vars[p1] !== undefined ? vars[p1] : match;
        });
        return output;
      };

      const subject = replaceVars(template.subject, resolvedVars);
      const htmlBody = replaceVars(template.html_body, resolvedVars);
      const textBody = replaceVars(template.plain_text_body, resolvedVars);

      // 4. Send email via provider
      await sendEmail({
        to: recipient,
        subject,
        html: htmlBody,
        text: textBody
      });

      // 5. Update SQL log (Success)
      const updateQh = new QueryHelper();
      await updateQh.from('sph_email_logs')
        .where('job_id', 'eq', job.id)
        .update({
          status: 'COMPLETED',
          sent_at: new Date().toISOString(),
          attempts: job.attemptsMade + 1
        })
        .execute();

    } catch (error) {
      // 6. Update SQL log (Fail/Retry)
      const isPermanent = job.attemptsMade >= (job.opts.attempts - 1);
      const newStatus = isPermanent ? 'FAILED' : 'RETRYING';
      
      const updateQh = new QueryHelper();
      await updateQh.from('sph_email_logs')
        .where('job_id', 'eq', job.id)
        .update({
          status: newStatus,
          error_details: error.message,
          attempts: job.attemptsMade + 1
        })
        .execute();
        
      throw error; // Let BullMQ handle retry mechanism
    }
  }, { connection });

  emailWorker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed successfully.`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job.id} failed: ${err.message}`);
  });

  console.log('[EmailWorker] Initialized and waiting for jobs...');
};

module.exports = {
  initEmailWorker
};
