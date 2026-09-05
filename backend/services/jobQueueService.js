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

module.exports = {
  initQueue,
  getEmailQueue
};
