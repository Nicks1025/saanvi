const { createClient } = require('redis');

let redisClient = null;
let isConnected = false;

const initRedis = async () => {
  if (!process.env.REDIS_URL) {
    console.warn('[Redis] REDIS_URL not provided. Redis caching will be disabled.');
    return null;
  }

  if (redisClient) return redisClient;

  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        // Stop retrying after some time or use exponential backoff
        // Here we'll use exponential backoff with a max delay of 3 seconds
        const delay = Math.min(retries * 50, 3000);
        return delay;
      }
    }
  });

  redisClient.on('error', (err) => {
    // Avoid logging credentials, just log the message
    console.error('[Redis Error]', err.message);
    isConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connecting...');
  });

  redisClient.on('ready', () => {
    console.log('[Redis] Connected and ready');
    isConnected = true;
  });

  redisClient.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
    isConnected = false;
  });

  redisClient.on('end', () => {
    console.log('[Redis] Connection closed');
    isConnected = false;
  });

  try {
    await redisClient.connect();
  } catch (err) {
    console.error('[Redis] Failed to connect on startup:', err.message);
    // Graceful degradation: we don't exit the process
  }

  return redisClient;
};

const getClient = () => {
  return redisClient;
};

const isReady = () => {
  return isConnected && redisClient && redisClient.isReady;
};

const shutdown = async () => {
  if (redisClient && redisClient.isOpen) {
    console.log('[Redis] Shutting down connection...');
    await redisClient.quit();
  }
};

module.exports = {
  initRedis,
  getClient,
  isReady,
  shutdown
};
