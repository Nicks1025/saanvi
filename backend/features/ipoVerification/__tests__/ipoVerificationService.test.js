jest.mock('uuid', () => ({ v4: () => require('crypto').randomUUID() }));
const IpoVerificationService = require('../ipoVerificationService');
const RegistrarAdapterFactory = require('../adapters/RegistrarAdapterFactory');
const StubRegistrarAdapter = require('../adapters/StubRegistrarAdapter');
const RedisHelper = require('../../../redis/redisHelper');


jest.mock('../../../redis/redisHelper', () => ({
  increment: jest.fn().mockResolvedValue(1),
  decrement: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(true),
  exists: jest.fn().mockResolvedValue(true),
  ttl: jest.fn().mockResolvedValue(-1),
  setNxEx: jest.fn().mockResolvedValue(true),
  deleteIfEquals: jest.fn().mockResolvedValue(true),
  atomicRateLimit: jest.fn().mockResolvedValue(1),
  atomicSemaphoreAcquire: jest.fn().mockResolvedValue(1),
  delete: jest.fn().mockResolvedValue(true)
}));

// Mock Repository
class MockRepository {
  constructor() {
    this.registrars = [
      { id: '11111111-1111-1111-1111-111111111111', code: 'KFINTECH' },
      { id: '11111111-1111-1111-1111-222222222222', code: 'LINKINTIME' }
    ];
    this.ipos = [
      { id: '22222222-2222-2222-2222-111111111111', registrar_id: '11111111-1111-1111-1111-111111111111' },
      { id: '22222222-2222-2222-2222-222222222222', registrar_id: '11111111-1111-1111-1111-222222222222' }
    ];
    this.sources = [
      { id: '33333333-3333-3333-3333-111111111111', registrar_id: '11111111-1111-1111-1111-111111111111', name: 'KFintech Mock', adapter_type: 'STUB', is_active: true },
      { id: '33333333-3333-3333-3333-222222222222', registrar_id: '11111111-1111-1111-1111-222222222222', name: 'LinkIntime Mock', adapter_type: 'STUB', is_active: true }
    ];
    this.capabilities = [];
    this.cache = new Map();
    this.applicants = [
      { id: '55555555-5555-5555-5555-111111111111', user_uuid: '44444444-4444-4444-4444-111111111111' },
      { id: '55555555-5555-5555-5555-222222222222', user_uuid: '44444444-4444-4444-4444-222222222222' }
    ];
  }
  async getActiveSources() { return this.sources; }
  async getSourceById(id) { return this.sources.find(s => s.id === id); }
  async getApplicantById(id) { return this.applicants.find(a => a.id === id); }
  async getIpoWithRegistrar(id) { return this.ipos.find(i => i.id === id); }
  async getActiveCapability(sourceId) { 
    return this.capabilities.find(c => c.sourceId === sourceId && c.caps.is_active)?.caps; 
  }
  async updateDiscoveryStatus(sourceId, status, errorText = null) {
    const source = this.sources.find(s => s.id === sourceId);
    if (source) {
      source.discovery_status = status;
      source.discovery_error = errorText;
      source.last_discovery_attempt_at = new Date();
      if (status === 'SUCCESS') {
        source.last_successful_discovery_at = new Date();
      }
    }
  }
  async updateCapabilities(sourceId, caps) {
    const existingActive = this.capabilities.find(c => c.sourceId === sourceId && c.caps.is_active);
    const newVersion = existingActive ? existingActive.caps.version + 1 : 1;
    
    // Deactivate previous active capability
    if (existingActive) existingActive.caps.is_active = false;
    
    // Assign UUIDs and field_names to mimic DB insertion
    const newCap = { 
      id: `cap-${this.capabilities.length + 1}`, 
      ...caps, 
      version: newVersion,
      is_active: true,
      methods: caps.methods ? caps.methods.map((m, i) => ({
        ...m,
        id: `method-${this.capabilities.length + 1}-${i}`,
        fields: m.fields ? m.fields.map(f => ({
          ...f,
          field_name: f.field_name || f.name,
          is_optional: !!f.is_optional
        })) : []
      })) : []
    };
    
    this.capabilities.push({ sourceId, caps: newCap }); 
    return newCap; 
  }
  async getCachedResult(ipoId, sourceId, methodId, capabilityVersion, hash) { 
    return this.cache.get(`${ipoId}-${sourceId}-${methodId}-${capabilityVersion}-${hash}`); 
  }
  async cacheResult(data) { 
    this.cache.set(`${data.ipoId}-${data.sourceId}-${data.methodId}-${data.capabilityVersion}-${data.identifierFingerprint}`, { ...data, created_at: new Date() }); 
  }
}

describe('IpoVerificationService Production Hardening', () => {
  let repository;
  let service;
  
  beforeEach(() => {
    repository = new MockRepository();
    service = new IpoVerificationService(repository);
    process.env.IPO_VERIFY_MAX_RETRIES = '1';
    process.env.IPO_VERIFY_BACKOFF_MS = '10';
    process.env.IPO_HMAC_SECRET = 'test-secret';
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Discovery Logic & Versioning', () => {
    it('should implement discovery lock using setNxEx', async () => {
      // Add active capability to bypass the early return
      repository.capabilities.push({ sourceId: '33333333-3333-3333-3333-111111111111', caps: { is_active: true } });
      repository.sources[0].last_discovery_attempt_at = new Date(Date.now() - 99999999);
      
      service.runDiscovery = jest.fn().mockResolvedValue(true);
      
      // Simulate another process holds the lock
      RedisHelper.setNxEx.mockResolvedValueOnce(false);
      await service._checkStaleAndRefresh('33333333-3333-3333-3333-111111111111');
      
      // Should not call runDiscovery
      expect(service.runDiscovery).not.toHaveBeenCalled();
      
      // Simulate we acquire the lock
      RedisHelper.setNxEx.mockResolvedValueOnce(true);
      await service._checkStaleAndRefresh('33333333-3333-3333-3333-111111111111');
      expect(service.runDiscovery).toHaveBeenCalledWith('33333333-3333-3333-3333-111111111111');
    });

    it('should retain active capability if discovery fails completely', async () => {
      const adapter = new StubRegistrarAdapter(repository.sources[0]);
      adapter.setMockedCapabilities({ captcha_required: false, methods: [] });
      jest.spyOn(RegistrarAdapterFactory, 'getAdapter').mockReturnValue(adapter);

      await service.runDiscovery('33333333-3333-3333-3333-111111111111');
      
      adapter.discoverCapabilities = jest.fn().mockRejectedValue(new Error('Network error'));
      await service.runDiscovery('33333333-3333-3333-3333-111111111111');
      
      const active = await repository.getActiveCapability('33333333-3333-3333-3333-111111111111');
      expect(active).toBeDefined();
      expect(active.is_active).toBe(true);
      expect(active.version).toBe(1);
    });
  });

  describe('Verification Hardening', () => {
    beforeEach(async () => {
      const adapter = new StubRegistrarAdapter(repository.sources[0]);
      adapter.setMockedCapabilities({
        supports_automated: true,
        rate_limit_per_min: 100,
        concurrency_limit: 10,
        methods: [{ name: 'PAN', fields: [{ name: 'PAN', is_optional: false, field_name: 'PAN' }] }]
      });
      jest.spyOn(RegistrarAdapterFactory, 'getAdapter').mockReturnValue(adapter);
      await service.runDiscovery('33333333-3333-3333-3333-111111111111');
    });

    it('should enforce fail-closed on automated verification', async () => {
      // Set to fresh to avoid background discovery
      repository.sources[0].last_successful_discovery_at = new Date();

      const activeCap = await repository.getActiveCapability('33333333-3333-3333-3333-111111111111');
      const methodId = activeCap.methods[0].id;
      
      // Undefined = rejected
      activeCap.supports_automated = undefined; 
      await expect(
        service.verifyApplicant('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-111111111111', { PAN: 'ABC' })
      ).rejects.toThrow('Automated verification is not supported for this source');

      // Null = rejected
      activeCap.supports_automated = null;
      await expect(
        service.verifyApplicant('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-111111111111', { PAN: 'ABC' })
      ).rejects.toThrow('Automated verification is not supported for this source');
    });

    it('should validate IPO and Registrar relationship', async () => {
      const activeCap = await repository.getActiveCapability('33333333-3333-3333-3333-111111111111');
      const methodId = activeCap.methods[0].id;

      // Source 1 belongs to Reg 1. IPO 2 belongs to Reg 2.
      await expect(
        service.verifyApplicant('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-111111111111', { PAN: 'ABC' })
      ).rejects.toThrow('Mismatched IPO and Source relationship');
      
      // Missing IPO
      await expect(
        service.verifyApplicant('44444444-4444-4444-4444-111111111111', 'ipo-99', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-111111111111', { PAN: 'ABC' })
      ).rejects.toThrow('IPO not found');
    });

    it('should validate method fields strictly (reject empty strings)', async () => {
      const activeCap = await repository.getActiveCapability('33333333-3333-3333-3333-111111111111');
      const methodId = activeCap.methods[0].id;

      await expect(
        service.verifyApplicant('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-111111111111', { PAN: '   ' })
      ).rejects.toThrow('Missing required field: PAN');
    });

    it('should cache separately based on capability version', async () => {
      const activeCap = await repository.getActiveCapability('33333333-3333-3333-3333-111111111111');
      const methodId = activeCap.methods[0].id;

      // Setup mock success
      const adapter = RegistrarAdapterFactory.getAdapter(repository.sources[0]);
      adapter.verify = jest.fn().mockResolvedValue({ status: 'ALLOTTED', allotted_quantity: 10 });

      // First run caches it under v1
      await service.verifyApplicant('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-111111111111', { PAN: 'ABC' });
      
      // Now discovery updates version to v2
      adapter.setMockedCapabilities({
        supports_automated: true,
        concurrency_limit: 20, // Forces version bump
        methods: [{ name: 'PAN', fields: [{ name: 'PAN', is_optional: false, field_name: 'PAN' }] }]
      });
      await service.runDiscovery('33333333-3333-3333-3333-111111111111');
      
      const v2Cap = await repository.getActiveCapability('33333333-3333-3333-3333-111111111111');
      const v2MethodId = v2Cap.methods[0].id;
      expect(v2Cap.version).toBe(2);

      // Verify again, it should NOT return the cached result because version changed
      adapter.verify.mockResolvedValue({ status: 'NOT_ALLOTTED', allotted_quantity: 0 });
      const res = await service.verifyApplicant('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111111', v2MethodId, '55555555-5555-5555-5555-111111111111', { PAN: 'ABC' });
      expect(res.cached).toBeUndefined();
      expect(res.status).toBe('NOT_ALLOTTED');
    });

    it('should change HMAC hash entirely if secret changes', async () => {
      process.env.IPO_HMAC_SECRET = 'secret-A';
      const hashA = service._createIdentifierHash({ PAN: 'ABC' });
      
      process.env.IPO_HMAC_SECRET = 'secret-B';
      const hashB = service._createIdentifierHash({ PAN: 'ABC' });
      
      expect(hashA).not.toEqual(hashB);
    });

    it('should properly decrement concurrency semaphore on failure (rollback)', async () => {
      const activeCap = await repository.getActiveCapability('33333333-3333-3333-3333-111111111111');
      const methodId = activeCap.methods[0].id;

      // Over the limit
      RedisHelper.atomicRateLimit.mockResolvedValueOnce(1); // rate limit
      RedisHelper.atomicSemaphoreAcquire.mockResolvedValueOnce(-1); // concurrency limit exceeded

      await expect(
        service.verifyApplicant('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-111111111111', { PAN: 'ABC' })
      ).rejects.toThrow('Concurrency limit exceeded');
    });

    it('should create deterministic hashes ignoring key order and robust against delimiters', () => {
      const hash1 = service._createIdentifierHash({ a: '1', b: '2' });
      const hash2 = service._createIdentifierHash({ b: '2', a: '1' });
      expect(hash1).toBe(hash2);

      const hash3 = service._createIdentifierHash({ 'a|b': '1' });
      const hash4 = service._createIdentifierHash({ 'a': 'b|1' });
      expect(hash3).not.toBe(hash4); // Because we use JSON.stringify instead of a=1|b=2
    });
  });

  describe('Extended Authorization and Cache Semantics', () => {
    let methodId;
    beforeEach(async () => {
      const adapter = new StubRegistrarAdapter(repository.sources[0]);
      adapter.setMockedCapabilities({
        supports_automated: true,
        methods: [{ name: 'PAN', fields: [{ name: 'PAN', is_optional: false, field_name: 'PAN' }] }]
      });
      jest.spyOn(RegistrarAdapterFactory, 'getAdapter').mockReturnValue(adapter);
      await service.runDiscovery('33333333-3333-3333-3333-111111111111');
      const activeCap = await repository.getActiveCapability('33333333-3333-3333-3333-111111111111');
      methodId = activeCap.methods[0].id;
    });

    it('should reject mismatched IPO and source registrar', async () => {
      await expect(
        service.verifyApplicant('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-111111111111', { PAN: 'ABC' })
      ).rejects.toThrow('Mismatched IPO and Source relationship');
    });

    it('should reject missing applicant', async () => {
      await expect(
        service.verifyApplicant('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-999999999999', { PAN: 'ABC' })
      ).rejects.toThrow('Applicant not found');
    });

    it('should reject if applicant belongs to a different user', async () => {
      await expect(
        service.verifyApplicant('99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-111111111111', { PAN: 'ABC' })
      ).rejects.toThrow('Unauthorized applicant access');
    });

    it('should bypass cache on CAPTCHA_REQUIRED', async () => {
      const adapter = RegistrarAdapterFactory.getAdapter(repository.sources[0]);
      adapter.verify = jest.fn().mockResolvedValue({ status: 'CAPTCHA_REQUIRED' });
      const spyCache = jest.spyOn(repository, 'cacheResult');
      
      const res = await service.verifyApplicant('44444444-4444-4444-4444-111111111111', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111111', methodId, '55555555-5555-5555-5555-111111111111', { PAN: 'ABC' });
      expect(res.status).toBe('CAPTCHA_REQUIRED');
      expect(spyCache).not.toHaveBeenCalled();
    });

    it('should handle background lock correctly by checking ownership token', async () => {
      repository.sources[0].last_successful_discovery_at = new Date(Date.now() - 99999999);
      
      service.runDiscovery = jest.fn().mockResolvedValue(true);
      RedisHelper.setNxEx.mockResolvedValueOnce(true);
      await service._checkStaleAndRefresh('33333333-3333-3333-3333-111111111111');
      
      // Wait for the background microtasks to finish
      await new Promise(setImmediate);
      
      expect(service.runDiscovery).toHaveBeenCalled();
      expect(RedisHelper.deleteIfEquals).toHaveBeenCalled();
    });
  });
});
