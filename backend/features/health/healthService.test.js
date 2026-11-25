const HealthController = require('./healthController');
const HealthService = require('./healthService');
const HealthRepository = require('./healthRepository');
const healthApi = require('./healthApi');
const BaseRepository = require('../../base/baseRepository');

describe('Health Feature Architecture & Unit Tests', () => {
  let mockContext;
  let mockDbDriver;

  beforeEach(() => {
    mockDbDriver = {
      healthCheck: jest.fn().mockResolvedValue({ healthy: true, rows: [{ healthy: 1 }] })
    };
    mockContext = {
      connection: mockDbDriver,
      request: {},
      response: {}
    };
  });

  it('ApiSchema references HealthController class directly', () => {
    expect(healthApi.endpoints.length).toBe(1);
    expect(healthApi.endpoints[0].handler.controller).toBe(HealthController);
  });

  it('HealthController instantiates HealthService which instantiates HealthRepository with context', () => {
    const controller = new HealthController(mockContext);
    expect(controller.healthService).toBeInstanceOf(HealthService);
    expect(controller.healthService.context).toBe(mockContext);
    expect(controller.healthService.repository).toBeInstanceOf(HealthRepository);
    expect(controller.healthService.repository).toBeInstanceOf(BaseRepository);
    expect(controller.healthService.repository.context).toBe(mockContext);
    expect(controller.healthService.repository.dbDriver).toBe(mockDbDriver);
  });

  it('HealthRepository.checkDatabaseHealth delegates to dbDriver.healthCheck', async () => {
    const repo = new HealthRepository(mockContext);
    const result = await repo.checkDatabaseHealth();
    expect(result.healthy).toBe(true);
    expect(mockDbDriver.healthCheck).toHaveBeenCalledTimes(1);
  });

  it('checkSupabaseDatabase reports healthy when repository.checkDatabaseHealth succeeds', async () => {
    const service = new HealthService(mockContext);
    const result = await service.checkSupabaseDatabase();
    expect(result.status).toBe('healthy');
    expect(mockDbDriver.healthCheck).toHaveBeenCalledTimes(1);
  });

  it('checkSupabaseDatabase reports down when repository.checkDatabaseHealth returns healthy: false', async () => {
    mockDbDriver.healthCheck.mockResolvedValue({ healthy: false, error: 'Connection refused' });
    const service = new HealthService(mockContext);
    const result = await service.checkSupabaseDatabase();
    expect(result.status).toBe('down');
    expect(result.message).toBe('Connection refused');
  });

  it('checkSupabaseDatabase reports down when repository.checkDatabaseHealth throws an error', async () => {
    mockDbDriver.healthCheck.mockRejectedValue(new Error('Network failure'));
    const service = new HealthService(mockContext);
    const result = await service.checkSupabaseDatabase();
    expect(result.status).toBe('down');
    expect(result.message).toBe('Network failure');
  });
});
