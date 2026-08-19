const BaseService = require('../../base/baseService');
const { supabaseAdmin } = require('../../services/supabaseAdmin');
const RedisHelper = require('../../redis/redisHelper');

class HealthService extends BaseService {
  constructor(repository) {
    super(repository);
  }

  async withTimeout(promise, ms, name) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
  }

  async measureAsync(operation, name, timeoutMs = 5000) {
    const start = process.hrtime.bigint();
    let status = 'down';
    let message = null;
    
    try {
      await this.withTimeout(operation(), timeoutMs, name);
      status = 'healthy';
    } catch (error) {
      status = 'down';
      message = error.message;
      if (error.message.includes('timed out')) {
        status = 'degraded'; // treat timeouts as degraded or down depending on strictness. Let's use down for failure.
      }
    }
    
    const end = process.hrtime.bigint();
    const durationMs = Number((end - start) / 1000000n);
    
    return {
      status,
      responseTime: durationMs,
      ...(message ? { message } : {})
    };
  }

  async checkSupabaseDatabase() {
    return this.measureAsync(async () => {
      // Execute a lightweight query via existing queryHelper
      const res = await this.repository.queryHelper.queryRaw('SELECT 1 as ping');
      if (!res) throw new Error('Empty response from DB');
    }, 'Database');
  }

  async checkSupabaseStorage() {
    return this.measureAsync(async () => {
      const { data, error } = await supabaseAdmin.storage.listBuckets();
      if (error) throw new Error(error.message);
    }, 'Storage');
  }

  async checkRedis() {
    return this.measureAsync(async () => {
      const res = await RedisHelper.ping();
      if (res !== 'PONG' && res !== true && res !== 'OK') {
         if (res === 'FAILED') throw new Error('Redis ping failed');
      }
    }, 'Redis', 2000);
  }

  formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
  }

  async getSystemHealth() {
    // Run independent checks in parallel
    const results = await Promise.allSettled([
      this.checkSupabaseDatabase(),
      this.checkSupabaseStorage(),
      this.checkRedis()
    ]);

    const services = {
      backendUptime: {
        status: 'healthy',
        message: this.formatUptime(process.uptime())
      },
      supabaseDatabase: results[0].value,
      supabaseStorage: results[1].value,
      redis: results[2].value
    };

    // Calculate overall status
    let overallStatus = 'healthy';
    if (services.supabaseDatabase.status === 'down' || services.supabaseStorage.status === 'down') {
      overallStatus = 'down';
    } else if (services.redis.status === 'down') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services
    };
  }
}

module.exports = HealthService;
