const BaseService = require('../../base/baseService');
const RegistrarAdapterFactory = require('./adapters/RegistrarAdapterFactory');
const RedisHelper = require('../../redis/redisHelper');
const crypto = require('crypto');

class IpoVerificationService extends BaseService {
  constructor(repository) {
    super(repository);
  }

  async runDiscoveryAll() {
    const sources = await this.repository.getActiveSources();
    const results = [];
    for (const source of sources) {
      try {
        const result = await this.runDiscovery(source.id);
        if (result && result.status === 'FAILED') {
          results.push({ sourceId: source.id, status: 'FAILED', error: result.error });
        } else {
          results.push({ sourceId: source.id, status: 'SUCCESS', result });
        }
      } catch (error) {
        results.push({ sourceId: source.id, status: 'FAILED', error: error.message });
      }
    }
    return results;
  }

  async getIposWithCapabilities() {
    return await this.repository.getIposWithCapabilities();
  }

  async runDiscovery(sourceId) {
    const lockKey = `discovery:lock:${sourceId}`;
    const token = crypto.randomUUID();

    const acquired = await RedisHelper.setNxEx(lockKey, token, parseInt(process.env.IPO_DISCOVERY_LOCK_TTL_SEC) || 60);
    if (!acquired) {
      return null; // Already running, safely ignore
    }

    try {
      const source = await this.repository.getSourceById(sourceId);
      if (!source) throw new Error('Source not found');

      const adapter = RegistrarAdapterFactory.getAdapter(source);
      
      let newCapabilities;
      try {
        newCapabilities = await adapter.discoverCapabilities();
        if (!this._validateCapabilities(newCapabilities)) {
          throw new Error('Invalid capabilities format returned by adapter');
        }
      } catch (error) {
        await this.repository.updateDiscoveryStatus(sourceId, 'FAILED', error.message);
        return { status: 'FAILED', error: error.message };
      }

      const currentCapability = await this.repository.getActiveCapability(sourceId);
      
      // Check if capability genuinely changed
      if (currentCapability && this._isCapabilityUnchanged(currentCapability, newCapabilities)) {
        await this.repository.updateDiscoveryStatus(sourceId, 'SUCCESS');
        return currentCapability;
      }

      // New/changed capabilities don't define the version here, it is calculated in the repo transaction
      const updated = await this.repository.updateCapabilities(sourceId, newCapabilities);
      await this.repository.updateDiscoveryStatus(sourceId, 'SUCCESS');
      return updated;
    } finally {
      await RedisHelper.deleteIfEquals(lockKey, token);
    }
  }



  _validateCapabilities(caps) {
    if (typeof caps !== 'object' || !caps) return false;
    if (!Array.isArray(caps.methods)) return false;
    for (const m of caps.methods) {
      if (!m || !m.name) return false;
      if (!Array.isArray(m.fields)) return false;
      for (const f of m.fields) {
        const fieldName = f.field_name || f.name;
        if (!fieldName) return false;
      }
    }
    if (caps.rate_limit_per_min !== undefined && caps.rate_limit_per_min !== null && 
        (typeof caps.rate_limit_per_min !== 'number' || caps.rate_limit_per_min < 0)) return false;
    if (caps.concurrency_limit !== undefined && caps.concurrency_limit !== null && 
        (typeof caps.concurrency_limit !== 'number' || caps.concurrency_limit < 0)) return false;
    return true;
  }

  _isCapabilityUnchanged(current, discovered) {
    const normalize = (c) => ({
      captcha_required: !!c.captcha_required,
      captcha_type: c.captcha_type || null,
      captcha_scope: c.captcha_scope || null,
      supports_automated: !!c.supports_automated,
      supports_batch: !!c.supports_batch,
      supports_session: !!c.supports_session,
      rate_limit_per_min: c.rate_limit_per_min == null ? null : Number(c.rate_limit_per_min),
      concurrency_limit: c.concurrency_limit == null ? null : Number(c.concurrency_limit),
      methods: (c.methods || []).map(m => ({
        name: m.name,
        fields: (m.fields || []).map(f => ({ 
          name: f.field_name || f.name, 
          is_optional: !!f.is_optional 
        })).sort((a,b) => a.name.localeCompare(b.name))
      })).sort((a,b) => a.name.localeCompare(b.name))
    });
    
    const hash1 = crypto.createHash('sha256').update(JSON.stringify(normalize(current))).digest('hex');
    const hash2 = crypto.createHash('sha256').update(JSON.stringify(normalize(discovered))).digest('hex');
    
    return hash1 === hash2;
  }

  async _checkStaleAndRefresh(sourceId) {
    const capability = await this.repository.getActiveCapability(sourceId);
    if (!capability) return null;
    
    const ttlMs = parseInt(process.env.IPO_CAPABILITY_TTL_MS || '86400000', 10);
    const source = await this.repository.getSourceById(sourceId);
    
    const ageMs = source.last_successful_discovery_at 
      ? Date.now() - new Date(source.last_successful_discovery_at).getTime()
      : Infinity;

    if (ageMs > ttlMs) {
      // Lazy background refresh is now natively protected by concurrency lock inside runDiscovery
      this.runDiscovery(sourceId).catch(err => console.error('[Discovery Background Error]:', err.message));
    }
    
    return capability;
  }

  async verifyApplicant(userId, ipoId, sourceId, methodId, applicantId, identifiers, session = null) {
    // 1. Verify Ownership & IPO Relationship
    const applicant = await this.repository.getApplicantById(applicantId);
    if (!applicant) throw new Error('Applicant not found');
    if (applicant.user_uuid !== userId) throw new Error('Unauthorized applicant access');

    const ipo = await this.repository.getIpoWithRegistrar(ipoId);
    if (!ipo) throw new Error('IPO not found');

    const source = await this.repository.getSourceById(sourceId);
    if (!source) throw new Error('Source not found');
    if (ipo.registrar_id !== source.registrar_id) {
      throw new Error('Mismatched IPO and Source relationship');
    }

    const capability = await this._checkStaleAndRefresh(sourceId);
    if (!capability) throw new Error('No active capability for source');

    // Reject automated queries if capability does not explicitly allow it (fail-closed)
    if (capability.supports_automated !== true) {
      throw new Error('Automated verification is not supported for this source');
    }

    // Session validation
    if (capability.supports_session !== true && session) {
      throw new Error('Session is not supported for this source');
    }
    
    // 2. Validate Method and Identifiers against Capability
    const method = capability.methods.find(m => m.id === methodId);
    if (!method) throw new Error('Method not found or inactive');
    
    const filteredIdentifiers = {};
    for (const field of method.fields) {
      const fieldName = field.field_name;
      let val = identifiers[fieldName];
      
      // Applicant Identifier Security Check (strict matching if stored)
      if (applicant.identifiers && applicant.identifiers[fieldName] !== undefined && applicant.identifiers[fieldName] !== null) {
        const storedData = String(applicant.identifiers[fieldName]);
        const storedLower = storedData.trim().toLowerCase();
        
        const supplied = val !== undefined && val !== null ? String(val).trim().toLowerCase() : '';
        
        if (supplied) {
          if (storedLower !== supplied) {
             throw new Error(`Supplied identifier ${fieldName} does not match the stored applicant data`);
          }
          val = storedData; // Enforce exact stored case
        } else {
          val = storedData; // Auto-fill
        }
      }
      
      const isMissing = val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
      if (!field.is_optional && isMissing) {
        throw new Error(`Missing required field: ${fieldName}`);
      }
      
      if (val !== undefined && val !== null && val !== '') {
        filteredIdentifiers[fieldName] = val;
      }
    }

    const fingerprint = this._createIdentifierHash(filteredIdentifiers);
    
    // 3. Cache Check (Includes capability.version)
    const cachedResult = await this.repository.getCachedResult(ipoId, sourceId, methodId, capability.version, fingerprint);
    if (cachedResult) {
      const isStale = !this._isCacheValid(cachedResult);
      if (!isStale) return { ...cachedResult, cached: true };
    }

    // 4. Rate & Concurrency Limits
    await this._checkRateLimit(sourceId, capability.rate_limit_per_min);
    
    let concurrencyAcquired = false;
    try {
      await this._acquireConcurrency(sourceId, capability.concurrency_limit);
      concurrencyAcquired = true;

      const adapter = RegistrarAdapterFactory.getAdapter(source);
      
      const maxRetries = parseInt(process.env.IPO_VERIFY_MAX_RETRIES || '3', 10);
      const retryBackoffMs = parseInt(process.env.IPO_VERIFY_BACKOFF_MS || '500', 10);

      let rawResult;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          rawResult = await adapter.verify(method, filteredIdentifiers, session, ipo);
          break;
        } catch (error) {
          attempt++;
          const isTransient = this._isTransientError(error);
          
          if (!isTransient || attempt > maxRetries) {
            rawResult = {
              status: 'FAILED',
              error_category: isTransient ? 'RETRY_EXHAUSTED' : 'PERMANENT_ERROR',
              message: error.message
            };
            break;
          }
          await new Promise(resolve => setTimeout(resolve, retryBackoffMs * Math.pow(2, attempt - 1)));
        }
      }

      // 5. Cache Result safely
      const cacheData = {
        ipoId,
        sourceId,
        methodId,
        capabilityVersion: capability.version,
        identifierFingerprint: fingerprint,
        status: rawResult.status,
        appliedQuantity: rawResult.applied_quantity,
        allottedQuantity: rawResult.allotted_quantity,
        errorCategory: rawResult.error_category
      };
      
      if (rawResult.status !== 'CAPTCHA_REQUIRED' && rawResult.status !== 'FAILED') {
        await this.repository.cacheResult(cacheData);
      }

      return rawResult;
    } finally {
      if (concurrencyAcquired) {
        await this._releaseConcurrency(sourceId);
      }
    }
  }

  // Redis-based Rate Limiter (Token bucket / Fixed window logic via incr/expire)
  async _checkRateLimit(sourceId, limit) {
    if (!limit) return;
    const windowMinute = Math.floor(Date.now() / 60000);
    const key = `ipo:rate:${sourceId}:${windowMinute}`;
    const result = await RedisHelper.atomicRateLimit(key, 60, limit);
    
    if (result === -1) {
      throw new Error('Rate limit exceeded for source');
    }
  }

  // Safest practical semaphore using basic increment/decrement without Lua.
  // Note: we refresh the TTL on every incr/decr so that the lock only resets if the system is completely idle for 5 mins.
  async _acquireConcurrency(sourceId, limit) {
    if (!limit) return;
    const key = `ipo:concurrency:${sourceId}`;
    const result = await RedisHelper.atomicSemaphoreAcquire(key, limit, 300);

    if (result === -1) {
      throw new Error('Concurrency limit exceeded for source (503)');
    }
  }

  async _releaseConcurrency(sourceId) {
    const key = `ipo:concurrency:${sourceId}`;
    if (await RedisHelper.exists(key)) {
      const count = await RedisHelper.decrement(key);
      if (count <= 0) {
        await RedisHelper.delete(key);
      }
    }
  }

  _createIdentifierHash(identifiers) {
    const secret = process.env.IPO_HMAC_SECRET;
    if (!secret) {
      throw new Error('Missing IPO_HMAC_SECRET environment variable for secure hashing.');
    }

    const sortedEntries = Object.keys(identifiers).sort().map(k => {
      const val = identifiers[k];
      const normVal = typeof val === 'string' ? val.trim().toLowerCase() : val;
      return [k, normVal];
    });
    
    const canonicalString = JSON.stringify(sortedEntries);
    return crypto.createHmac('sha256', secret).update(canonicalString).digest('hex');
  }

  _isCacheValid(cachedResult) {
    const CACHE_TTL_MS = parseInt(process.env.IPO_CACHE_TTL_MS || '3600000', 10);
    const ageMs = Date.now() - new Date(cachedResult.created_at).getTime();
    return ageMs < CACHE_TTL_MS;
  }

  _isTransientError(error) {
    if (!error) return false;
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || 
           msg.includes('network') || 
           msg.includes('econnreset') ||
           msg.includes('rate limit') ||
           msg.includes('502') || 
           msg.includes('503') || 
           msg.includes('504');
  }

  async getApplicants(userId) {
    return await this.repository.getApplicantsByUser(userId);
  }

  async upsertApplicant(userId, applicantData) {
    if (applicantData.id) {
      const existing = await this.repository.getApplicantById(applicantData.id);
      if (!existing || existing.user_uuid !== userId) {
        throw new Error('Unauthorized applicant access');
      }
    }
    applicantData.user_uuid = userId;
    return await this.repository.upsertApplicant(applicantData);
  }

  async verifyBatch(userId, ipoId, selections, session = null) {
    const ipo = await this.repository.getIpoWithRegistrar(ipoId);
    if (!ipo) throw new Error('IPO not found');

    const sources = await this.repository.getActiveSources();
    const source = sources.find(s => s.registrar_id === ipo.registrar_id);
    if (!source) throw new Error('No active verification source found for this IPO');

    const capability = await this._checkStaleAndRefresh(source.id);
    if (!capability) throw new Error('No active capability for source');

    const results = [];
    for (const selection of selections) {
      try {
        // Automatically find the correct method for the identifier type
        let selectedMethod = null;
        for (const method of capability.methods) {
          if (method.fields.some(f => f.field_name.toLowerCase() === selection.type.toLowerCase())) {
            selectedMethod = method;
            break;
          }
        }
        
        if (!selectedMethod) {
          throw new Error(`No capability method supports identifier type: ${selection.type}`);
        }

        const identifiers = { [selectedMethod.fields.find(f => f.field_name.toLowerCase() === selection.type.toLowerCase()).field_name]: selection.value };
        if (session && session.captchaText) {
           identifiers.CAPTCHA = session.captchaText;
        }
        
        const result = await this.verifyApplicant(userId, ipoId, source.id, selectedMethod.id, selection.applicantId, identifiers, session);
        
        results.push({
          applicantId: selection.applicantId,
          type: selection.type,
          value: selection.value,
          status: 'SUCCESS',
          result
        });
      } catch (error) {
        results.push({
          applicantId: selection.applicantId,
          type: selection.type,
          value: selection.value,
          status: 'FAILED',
          error: error.message
        });
      }
    }
    return results;
  }
}

module.exports = IpoVerificationService;
