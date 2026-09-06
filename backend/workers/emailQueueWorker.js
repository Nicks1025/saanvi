/**
 * emailQueueWorker.js
 * 
 * Standalone Postgres-backed email queue worker.
 * 
 * Run locally:  node backend/workers/emailQueueWorker.js
 * On Render:    Add a Background Worker service with start command:
 *               node workers/emailQueueWorker.js
 * 
 * This process:
 *  1. Connects to Postgres via DATABASE_URL
 *  2. Polls sph_email_queue every 2 seconds for PENDING jobs
 *  3. Uses SELECT FOR UPDATE SKIP LOCKED to safely claim one row at a time
 *  4. Calls EmailService.sendDirect() to send the email
 *  5. Updates the queue row + sph_email_logs on success or failure
 *  6. After max_attempts failures, marks the job DEAD (no further retries)
 */

'use strict';

require('dotenv').config();

const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../providers/emailProvider');
const { decrypt } = require('../services/cryptoService');

// ── DB connection ─────────────────────────────────────────────────────────────
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 1, max: 3 }
});

// ── Config ────────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 3;
let isBusy = false;

// ── Variable resolver (mirrors emailService.js logic) ─────────────────────────
const replaceVars = (str, vars) => {
  if (!str) return '';
  let out = str;
  // Replace $$dynamic_variable$$ syntax
  out = out.replace(/\{\{\s*\$\$(.+?)\$\$\s*\}\}/g, (match, p1) => {
    const key = p1.trim();
    return vars[key] !== undefined ? vars[key] : match;
  });
  // Replace {{plain_variable}} syntax
  out = out.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, p1) => {
    return vars[p1] !== undefined ? vars[p1] : match;
  });
  return out;
};

// ── Core processing ───────────────────────────────────────────────────────────
async function processJob(job) {
  const { id, recipient, template_key, subject, campaign_uuid, email_log_uuid } = job;

  // JSONB columns come back from Postgres as JS objects already (pg driver auto-parses them).
  // Only JSON.parse if somehow it arrives as a string.
  const parseJsonb = (val) => {
    if (!val) return {};
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch (_) { return {}; }
  };

  let variables = parseJsonb(job.variables);
  const encryptedVariables = parseJsonb(job.encrypted_variables);

  // Decrypt encrypted variables
  for (const [key, val] of Object.entries(encryptedVariables)) {
    try { variables[key] = decrypt(val); } catch (e) {
      console.error(`[Worker] Failed to decrypt variable ${key}:`, e.message);
    }
  }

  let finalSubject = subject;
  let finalHtml = job.html_body;
  let finalText = job.plain_text;

  // Resolve template if provided
  if (template_key) {
    const templates = await db('sph_email_templates')
      .where({ template_key, status: 'ACTIVE' })
      .select('*')
      .limit(1);

    const tpl = templates[0];
    if (!tpl) throw new Error(`Template '${template_key}' not found or inactive.`);

    // Resolve global dynamic variables
    const dynVars = await db('sph_dynamic_variables').select('variable_name', 'value');
    const dynMap = {};
    for (const row of dynVars) {
      const key = row.variable_name.replace(/^\$\$/, '').replace(/\$\$$/, '');
      dynMap[key] = row.value;
    }

    // Resolve linked table columns
    let tableVars = {};
    if (tpl.linked_table) {
      try {
        const userRows = await db('users').where('email', recipient).select('uuid').limit(1);
        if (userRows.length > 0) {
          const idCol = tpl.linked_table === 'users' ? 'uuid' : 'user_uuid';
          const linkedRows = await db(tpl.linked_table).where(idCol, userRows[0].uuid).select('*').limit(1);
          if (linkedRows.length > 0) tableVars = { ...linkedRows[0] };
        }
      } catch (e) {
        console.warn(`[Worker] Could not fetch linked table '${tpl.linked_table}':`, e.message);
      }
    }

    const resolvedVars = { ...dynMap, ...tableVars, ...variables };
    finalSubject = replaceVars(tpl.subject, resolvedVars) || subject;
    finalHtml = replaceVars(tpl.html_body, resolvedVars);
    finalText = replaceVars(tpl.plain_text_body, resolvedVars);
  }

  if (!finalSubject) throw new Error('Email subject is empty after template resolution.');
  if (!finalHtml && !finalText) throw new Error('Email body is empty after template resolution.');

  // Send via SMTP provider
  const info = await sendEmail({
    to: recipient,
    subject: finalSubject,
    html: finalHtml,
    text: finalText
  });

  return info?.messageId || null;
}

// ── Poll loop ─────────────────────────────────────────────────────────────────
async function poll() {
  if (isBusy) return;
  isBusy = true;

  let trx;
  try {
    trx = await db.transaction();

    // Claim one PENDING job atomically — SKIP LOCKED means concurrent workers won't clash
    const jobs = await trx.raw(`
      SELECT * FROM sph_email_queue
      WHERE status = 'PENDING'
        AND attempts < max_attempts
      ORDER BY scheduled_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);

    const job = jobs.rows[0];
    if (!job) {
      await trx.commit();
      isBusy = false;
      return;
    }

    // Mark as PROCESSING
    await trx('sph_email_queue').where({ id: job.id }).update({
      status: 'PROCESSING',
      started_at: new Date(),
      attempts: job.attempts + 1,
      updated_at: new Date()
    });

    await trx.commit();

    // ── Process outside the transaction so we don't hold a DB lock during SMTP ──
    try {
      const messageId = await processJob(job);

      await db('sph_email_queue').where({ id: job.id }).update({
        status: 'COMPLETED',
        completed_at: new Date(),
        updated_at: new Date()
      });

      if (job.email_log_uuid) {
        await db('sph_email_logs').where({ uuid: job.email_log_uuid }).update({
          status: 'COMPLETED',
          sent_at: new Date()
        });
      }

      // Update campaign recipient if applicable
      if (job.campaign_uuid) {
        await db('sph_email_campaign_recipients')
          .where({ campaign_uuid: job.campaign_uuid, email: job.recipient })
          .update({ status: 'COMPLETED', sent_at: new Date(), provider_message_id: messageId });
      }

      console.log(`[Worker] ✓ Email sent to ${job.recipient} (queue id: ${job.id})`);

    } catch (sendErr) {
      const newAttempts = job.attempts + 1;
      const isDead = newAttempts >= MAX_ATTEMPTS;

      await db('sph_email_queue').where({ id: job.id }).update({
        status: isDead ? 'DEAD' : 'PENDING',
        error_details: sendErr.message,
        updated_at: new Date(),
        // Back off: retry after (attempts^2 * 30) seconds
        scheduled_at: isDead ? db.fn.now() : db.raw(`NOW() + INTERVAL '${Math.pow(newAttempts, 2) * 30} seconds'`)
      });

      if (job.email_log_uuid) {
        await db('sph_email_logs').where({ uuid: job.email_log_uuid }).update({
          status: isDead ? 'FAILED' : 'PENDING',
          error_details: sendErr.message
        });
      }

      if (job.campaign_uuid && isDead) {
        await db('sph_email_campaign_recipients')
          .where({ campaign_uuid: job.campaign_uuid, email: job.recipient })
          .update({ status: 'FAILED', error_details: sendErr.message });
      }

      console.error(`[Worker] ✗ Failed to send to ${job.recipient} (attempt ${newAttempts}/${MAX_ATTEMPTS}): ${sendErr.message}`);
    }

  } catch (err) {
    if (trx) { try { await trx.rollback(); } catch (_) {} }
    console.error('[Worker] Poll error:', err.message);
  } finally {
    isBusy = false;
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
console.log('[Worker] Email Queue Worker started. Polling every', POLL_INTERVAL_MS, 'ms...');
setInterval(poll, POLL_INTERVAL_MS);

// Run one immediately on startup
poll();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received. Shutting down...');
  await db.destroy();
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received. Shutting down...');
  await db.destroy();
  process.exit(0);
});
