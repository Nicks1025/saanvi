const { Queue } = require('bullmq');
const Redis = require('ioredis');

let emailQueue = null;
let connection = null;

const initQueue = () => {
  if (!process.env.REDIS_URL) {
    console.warn('[JobQueueService] REDIS_URL not provided. Queue system disabled.');
    return;
  }

  // BullMQ requires an ioredis connection
  connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  emailQueue = new Queue('EmailQueue', { connection });
  console.log('[JobQueueService] EmailQueue initialized.');
};

const getEmailQueue = () => {
  if (!emailQueue) {
    initQueue();
  }
  return emailQueue;
};

const enqueueEmailJob = async (templateKey, recipient, variables = {}, encryptedVariables = {}, lookupValue = null) => {
  const queue = getEmailQueue();
  if (!queue) {
    console.warn('[JobQueueService] Queue not initialized. Skipping job.');
    return null;
  }

  // The payload should be strictly JSON serializable
  const payload = {
    templateKey,
    recipient,
    variables,
    encryptedVariables,
    // lookupValue: the value used to find the row in the linked table.
    // If not set, the worker falls back to using the recipient email.
    lookupValue: lookupValue || null,
    queuedAt: new Date().toISOString()
  };

  const job = await queue.add('sendEmail', payload, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  });

  return job.id;
};

module.exports = {
  initQueue,
  getEmailQueue,
  enqueueEmailJob
};
