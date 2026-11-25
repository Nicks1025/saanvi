const MfaController = require('./mfaController');
const MfaService = require('./mfaService');
const MfaRepository = require('./mfaRepository');
const mfaApi = require('./mfaApi');
const ApiContext = require('../../base/apiContext');

describe('MFA Architecture & Contract Verification', () => {
  let mockContext;
  let mockRes;
  let mockReq;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockReq = {
      user: { uuid: 'test-user-uuid', email: 'test@example.com' },
      body: {}
    };
    mockContext = new ApiContext(mockReq, mockRes);
  });

  describe('Architecture & Instantiation', () => {
    it('ApiSchema references MfaController class directly across all endpoints', () => {
      expect(mfaApi.endpoints.length).toBe(5);
      for (const endpoint of mfaApi.endpoints) {
        expect(endpoint.handler.controller).toBe(MfaController);
        expect(typeof endpoint.handler.method).toBe('string');
      }
    });

    it('MfaController receives ApiContext and instantiates MfaService', () => {
      const controller = new MfaController(mockContext);
      expect(controller.context).toBe(mockContext);
      expect(controller.mfaService).toBeInstanceOf(MfaService);
      expect(controller.mfaService.context).toBe(mockContext);
      expect(controller.mfaService.repository).toBeInstanceOf(MfaRepository);
    });

    it('MfaRepository initializes table-bound QueryHelper in constructor', () => {
      const repo = new MfaRepository(mockContext);
      expect(repo.sql).toBeDefined();
      expect(repo.sql._table).toBe('users');
    });
  });

  describe('Controller Execution & Response Standard', () => {
    it('getStatus responds with standard respondOk envelope', async () => {
      const controller = new MfaController(mockContext);
      // Mock repository response
      jest.spyOn(controller.mfaService.repository, 'runQueryFirst').mockResolvedValue({
        is_mfa_enabled: true
      });

      await controller.getStatus();

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'MFA status fetched successfully',
        data: { isMfaEnabled: true }
      });
    });

    it('challenge validates required fields and calls service', async () => {
      const controller = new MfaController(mockContext);
      jest.spyOn(controller.mfaService, 'challenge').mockResolvedValue({
        id: 'challenge-123'
      });

      mockReq.body = { factorId: 'totp-factor-1' };
      await controller.challenge(mockReq);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'MFA challenge created',
        data: { id: 'challenge-123' }
      });
    });

    it('challenge throws error when required parameter is missing', async () => {
      const controller = new MfaController(mockContext);
      mockReq.body = {};

      await expect(controller.challenge(mockReq)).rejects.toThrow('Missing required field: factorId');
    });
  });

  describe('Repository Query Isolation', () => {
    it('generates correct query and preserves isolation on repeated calls', async () => {
      const repo = new MfaRepository(mockContext);
      const runQueryFirstSpy = jest.spyOn(repo, 'runQueryFirst').mockResolvedValue(null);

      await repo.getUserMfaStatus('uuid-1');
      await repo.getUserMfaStatus('uuid-2');

      expect(runQueryFirstSpy).toHaveBeenCalledTimes(2);

      const firstQuery = runQueryFirstSpy.mock.calls[0][0];
      const secondQuery = runQueryFirstSpy.mock.calls[1][0];

      expect(firstQuery.toSQL().sql).toBe('select "is_mfa_enabled" from "users" where "uuid" = ? and "archived_at" is null');
      expect(firstQuery.toSQL().bindings).toEqual(['uuid-1']);

      expect(secondQuery.toSQL().sql).toBe('select "is_mfa_enabled" from "users" where "uuid" = ? and "archived_at" is null');
      expect(secondQuery.toSQL().bindings).toEqual(['uuid-2']);
    });
  });
});
