const { Worker } = require('bullmq');
const Redis = require('ioredis');
const EmailService = require('../services/emailService');

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
    try {
      // Pass the job id so EmailService updates the existing log rather than creating a new one
      await EmailService.sendDirect(job.data, job.id);
    } catch (error) {
      // The EmailService updates the log with FAILED.
      // We throw the error so BullMQ handles the retry mechanism.
      throw error;
    }
  }, { connection, concurrency: 5 });

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
