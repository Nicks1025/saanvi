const ApiSchema = require('../../base/apiSchema');
const BaseRepository = require('../../base/baseRepository');
const HealthService = require('./healthService');
const HealthController = require('./healthController');

const repository = new BaseRepository();
const service = new HealthService(repository);
const controller = new HealthController(service);

const getSystemHealth = {
  path: '/',
  verb: 'GET',
  auditMessage: 'fetching system health',
  handler: { controller, method: 'getSystemHealth' },
  middleware: { requirePermission: ['admin.system.health'] }
};

const HealthApi = {
  name: 'SystemHealth',
  url: '/api/system/health',
  endpoints: [getSystemHealth]
};

module.exports = new ApiSchema(HealthApi);
