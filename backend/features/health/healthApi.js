const ApiSchema = require('../../base/apiSchema');
const HealthController = require('./healthController');

const getSystemHealth = {
  path: '/',
  verb: 'GET',
  auditMessage: 'fetching system health',
  handler: { controller: HealthController, method: 'getSystemHealth' },
  middleware: { requirePermission: ['admin.system.health'] }
};

const HealthApi = {
  name: 'SystemHealth',
  url: '/api/system/health',
  endpoints: [getSystemHealth]
};

module.exports = new ApiSchema(HealthApi);
