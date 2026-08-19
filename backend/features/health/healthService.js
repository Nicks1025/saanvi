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
      const result = await this.withTimeout(operation(), timeoutMs, name);
      status = 'healthy';
      if (typeof result === 'string') {
        message = result;
      }
    } catch (error) {
      status = 'down';
      message = error.message;
      if (error.message.includes('timed out')) {
        status = 'degraded'; 
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

  async checkR2Storage() {
    return this.measureAsync(async () => {
      const r2StorageService = require('../../infrastructure/storage/r2StorageService');
      const accountId = process.env.R2_ACCOUNT_ID;
      const bucketName = process.env.R2_BUCKET_NAME;
      const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN;

      if (!token) throw new Error("Missing Analytics Token");

      // Test raw S3 connection first
      const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
      await r2StorageService.s3Client.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 }));

      // Prepare date range for the CURRENT billing month to match Cloudflare Dashboard
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      const startIso = start.toISOString();
      const endIso = now.toISOString();

      const query = `
        query getR2Metrics($accountId: string, $start: datetime, $end: datetime) {
          viewer {
            accounts(filter: {accountTag: $accountId}) {
              r2StorageAdaptiveGroups(
                limit: 1, 
                filter: {datetime_geq: $start, datetime_leq: $end}
              ) {
                max {
                  payloadSize
                }
              }
              r2OperationsAdaptiveGroups(
                limit: 100, 
                filter: {datetime_geq: $start, datetime_leq: $end}
              ) {
                dimensions {
                  actionType
                }
                sum {
                  requests
                }
              }
            }
          }
        }
      `;

      const variables = {
        accountId,
        start: startIso,
        end: endIso
      };

      const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare Analytics API returned ${response.status}`);
      }

      const json = await response.json();
      if (json.errors) {
        throw new Error("Cloudflare GraphQL Error: " + json.errors[0].message);
      }

      const accountData = json.data?.viewer?.accounts?.[0];
      if (!accountData) throw new Error("No analytics data found for account");

      const storageSize = accountData.r2StorageAdaptiveGroups?.[0]?.max?.payloadSize || 0;
      const mb = (storageSize / (1024 * 1024)).toFixed(2);

      let classA = 0;
      let classB = 0;
      
      const operations = accountData.r2OperationsAdaptiveGroups || [];
      for (const op of operations) {
         const type = op.dimensions.actionType;
         const count = op.sum.requests || 0;
         
         // Classify dynamically based on S3 operation prefixes rather than hardcoded lists
         if (type.startsWith('Put') || type.startsWith('List') || type.startsWith('Copy') || 
             type.startsWith('Create') || type.startsWith('Upload') || type.startsWith('Complete')) {
             classA += count;
         } 
         else if (type.startsWith('Get') || type.startsWith('Head') || type === 'Usage') {
             classB += count;
         }
         // Note: Delete and Abort operations are Free, so we don't count them towards Class A or B
      }

      // Return a structured JSON string to be parsed by the frontend
      return JSON.stringify({
        used_mb: mb,
        class_a: classA,
        class_b: classB
      });
      
    }, 'Cloudflare R2');
  }

  async checkRedis() {
    return this.measureAsync(async () => {
      const res = await RedisHelper.ping();
      if (res !== 'PONG' && res !== true && res !== 'OK') {
         if (res === 'FAILED') throw new Error('Redis ping failed');
      }
    }, 'Redis', 2000);
  }

  async checkSocketIo() {
    return this.measureAsync(async () => {
      const { getIo } = require('../../socket');
      const io = getIo();
      if (!io) throw new Error('Socket.IO is not initialized');
      // Adding a small delay to simulate ping, although it's in-memory
      const clientsCount = io.engine.clientsCount;
      return clientsCount; // Will be passed somehow? No, measureAsync ignores return value unless we throw.
    }, 'Socket.IO', 1000);
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
      this.checkRedis(),
      this.checkSocketIo(),
      this.checkR2Storage()
    ]);

    const { getIo } = require('../../socket');
    const io = getIo();
    const clientsCount = io ? io.engine.clientsCount : 0;

    const socketResult = results[3].value;
    if (socketResult.status === 'healthy') {
        socketResult.message = `Active Connections: ${clientsCount}`;
    }

    const services = {
      backendUptime: {
        status: 'healthy',
        message: this.formatUptime(process.uptime())
      },
      supabaseDatabase: results[0].value,
      supabaseStorage: results[1].value,
      redis: results[2].value,
      socketIo: socketResult,
      cloudflareR2: results[4].value
    };

    // Calculate overall status
    let overallStatus = 'healthy';
    if (services.supabaseDatabase.status === 'down' || services.supabaseStorage.status === 'down' || services.socketIo.status === 'down' || services.cloudflareR2.status === 'down') {
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
