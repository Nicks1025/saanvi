const https = require('https');
const http = require('http');

/**
 * Lightweight cron job to ping the server's external URL every 5 minutes.
 * This prevents free-tier hosting services (like Render) from spinning down
 * the server due to inactivity.
 */
function startKeepAlive() {
  // Render automatically injects RENDER_EXTERNAL_URL. 
  // If not on Render, you can manually set KEEP_ALIVE_URL in .env
  const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL;
  
  if (!baseUrl) {
    console.log('[KeepAlive] No external URL configured. Skipping 5-minute self-ping.');
    return;
  }
  
  const pingUrl = `${baseUrl}/health`;
  const protocol = pingUrl.startsWith('https') ? https : http;

  console.log(`[KeepAlive] Scheduled to ping ${pingUrl} every 5 minutes to prevent sleep.`);

  // 5 minutes in milliseconds
  const INTERVAL = 5 * 60 * 1000;

  setInterval(() => {
    protocol.get(pingUrl, (res) => {
      if (res.statusCode === 200) {
        console.log(`[KeepAlive] Ping successful at ${new Date().toISOString()}`);
      } else {
        console.log(`[KeepAlive] Ping received non-200 status: ${res.statusCode}`);
      }
    }).on('error', (err) => {
      console.error(`[KeepAlive] Ping failed: ${err.message}`);
    });
  }, INTERVAL);
}

module.exports = startKeepAlive;
