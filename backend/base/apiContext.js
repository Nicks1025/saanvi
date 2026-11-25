const dbDriver = require('../database/dbDriver');

/**
 * ApiContext
 *
 * Request-scoped dependency container.
 * Encapsulates the HTTP request, response, authenticated user, request ID,
 * scoped logger, shared database driver, and active transaction.
 */
class ApiContext {
  constructor(req = null, res = null, options = {}) {
    this.request = req;
    this.response = res;
    this.user = req?.user || options.user || null;
    this.requestId = req?.headers?.['request-id'] || req?.id || options.requestId || `req-${Date.now()}`;
    this.connection = options.connection || dbDriver;
    this.transaction = options.transaction || null;
    this.logger = options.logger || this._createLogger();
  }

  /**
   * Creates a request-scoped logger with requestId and user metadata.
   */
  _createLogger() {
    const prefix = `[RequestId: ${this.requestId}]`;
    return {
      info: (...args) => console.log(prefix, ...args),
      warn: (...args) => console.warn(prefix, ...args),
      error: (...args) => console.error(prefix, ...args),
      debug: (...args) => console.debug(prefix, ...args)
    };
  }

  /**
   * Creates a child ApiContext bound to an active transaction.
   * Useful when passing context into operations across multiple repositories within a transaction.
   */
  withTransaction(transaction) {
    return new ApiContext(this.request, this.response, {
      user: this.user,
      requestId: this.requestId,
      connection: this.connection,
      transaction,
      logger: this.logger
    });
  }
}

module.exports = ApiContext;
