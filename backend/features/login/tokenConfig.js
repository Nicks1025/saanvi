/**
 * tokenConfig.js
 * Centralized token expiry configuration and parsing utilities.
 */

/**
 * Parses duration strings (e.g. '15m', '7d', '24h', '3600s', '604800') into milliseconds.
 * @param {string|number} duration 
 * @param {number} fallbackMs 
 * @returns {number}
 */
function parseDurationToMs(duration, fallbackMs = 7 * 24 * 60 * 60 * 1000) {
  if (!duration) return fallbackMs;
  if (typeof duration === 'number') return duration;
  const str = String(duration).trim();
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)?$/i);
  if (!match) {
    const num = Number(str);
    return isNaN(num) ? fallbackMs : num * 1000;
  }
  const val = parseFloat(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  switch (unit) {
    case 'ms': return Math.round(val);
    case 's': return Math.round(val * 1000);
    case 'm': return Math.round(val * 60 * 1000);
    case 'h': return Math.round(val * 60 * 60 * 1000);
    case 'd': return Math.round(val * 24 * 60 * 60 * 1000);
    case 'w': return Math.round(val * 7 * 24 * 60 * 60 * 1000);
    default: return fallbackMs;
  }
}

const getAccessTokenExpiry = () => process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';

const getRefreshTokenExpiryMs = () => parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);

module.exports = {
  parseDurationToMs,
  getAccessTokenExpiry,
  getRefreshTokenExpiryMs
};
