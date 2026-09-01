const Redis = require('ioredis');
const QueryHelper = require('../database/queryHelper');

let isRunning = false;
let redisClient = null;
let pollInterval = null;

const initOutboxRelay = () => {
  if (!process.env.REDIS_URL) {
    console.warn('[OutboxRelay] REDIS_URL not provided. Outbox Relay disabled.');
    return;
  }

  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  console.log('[OutboxRelay] Initialized and started polling.');
  
  // Poll every 2 seconds
  pollInterval = setInterval(processOutbox, 2000);
};

const processOutbox = async () => {
  if (isRunning || !redisClient) return;
  isRunning = true;

  try {
    const qh = new QueryHelper();
    
    // Select batch of up to 50 unpublished events
    // We use FOR UPDATE SKIP LOCKED to prevent multiple workers from grabbing the same rows
    // but in Knex/pg we can just do a standard select + update returning if simple.
    // Knex doesn't have native skip locked out of the box in simple query helper, so we do raw:
    
    const rawSql = `
      SELECT id, event_key, payload, aggregate_id 
      FROM sph_event_outbox 
      WHERE published_at IS NULL AND publish_attempts < 5
      ORDER BY created_at ASC 
      LIMIT 50 
      FOR UPDATE SKIP LOCKED
    `;
    
    const { rows: events } = await qh.db.raw(rawSql);

    if (!events || events.length === 0) {
      isRunning = false;
      return;
    }

    for (const event of events) {
      try {
        // Publish to Redis Stream
        // Stream format: XADD saanvi_events * eventId <id> eventType <key> payload <json>
        await redisClient.xadd(
          'saanvi_events', 
          '*', 
          'eventId', event.id, 
          'eventType', event.event_key, 
          'aggregateId', event.aggregate_id || '',
          'payload', typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload)
        );

        // Mark as published
        await qh.db('sph_event_outbox')
          .where({ id: event.id })
          .update({
            published_at: new Date().toISOString(),
            publish_attempts: qh.db.raw('publish_attempts + 1'),
            updated_at: new Date().toISOString()
          });
          
      } catch (err) {
        console.error(`[OutboxRelay] Failed to publish event ${event.id}:`, err.message);
        // Increment attempt
        await qh.db('sph_event_outbox')
          .where({ id: event.id })
          .update({
            publish_attempts: qh.db.raw('publish_attempts + 1'),
            last_error: err.message,
            updated_at: new Date().toISOString()
          });
      }
    }
  } catch (error) {
    console.error('[OutboxRelay] Polling error:', error.message);
  } finally {
    isRunning = false;
  }
};

const stopOutboxRelay = () => {
  if (pollInterval) clearInterval(pollInterval);
  if (redisClient) redisClient.quit();
};

module.exports = {
  initOutboxRelay,
  stopOutboxRelay
};
