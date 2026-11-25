const { v4: uuidv4 } = require('uuid');

/**
 * BaseService
 *
 * Shared foundation for all feature domain services.
 * Holds reference to request-scoped ApiContext, logger, and common service utilities.
 * Feature services initialize their required repositories in their own constructors.
 */
class BaseService {
  constructor(context = null) {
    this.context = context;
    this.log = this.context?.logger || console;
  }

  /**
   * Logs a service action with request context.
   */
  logAction(action, data) {
    if (this.log?.info) {
      this.log.info(`[Service Action]: ${action}`, data);
    } else {
      console.log(`[Service Action]: ${action}`, data);
    }
  }

  /**
   * Generates a new UUID v4.
   */
  generateUuid() {
    return uuidv4();
  }
}

module.exports = BaseService;
