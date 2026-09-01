const { enqueueEmailJob } = require('./jobQueueService');
const QueryHelper = require('../database/queryHelper');
const { v4: uuidv4 } = require('uuid');

const queueEmail = async (templateKey, recipient, variables = {}, encryptedVariables = {}) => {
  if (!templateKey || !recipient) {
    throw new Error('templateKey and recipient are required to queue an email.');
  }

  // Enqueue the job to BullMQ
  const jobId = await enqueueEmailJob(templateKey, recipient, variables, encryptedVariables);
  
  if (jobId) {
    // Record the initial PENDING status in the SQL audit log
    const qh = new QueryHelper();
    try {
      await qh.from('sph_email_logs')
        .insert({
          uuid: uuidv4(),
          recipient,
          template_key: templateKey,
          job_id: jobId,
          status: 'PENDING'
        })
        .execute();
    } catch (e) {
      console.error('[EmailService] Failed to log initial email state to DB:', e.message);
      // We don't throw here, because the job is successfully in the queue.
    }
  }

  return jobId;
};

module.exports = {
  queueEmail
};
