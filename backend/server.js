require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// --- Environment Validation (Fail Fast) ---
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL ERROR: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const cors = require('cors');

// Middleware
app.use(cors());
app.use(express.json());

// Load Routes
require('./routes')(app);

// Serve translations
app.use('/api/locales', express.static(path.join(__dirname, 'language')));

// Initialize Redis
const { initRedis, shutdown } = require('./redis/redisClient');
initRedis();

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend Server is running with valid configuration.' });
});

const PORT = process.env.BACKEND_PORT || 3002;
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  await shutdown(); // Close Redis connection
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  
  // Force shutdown after 10s if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
