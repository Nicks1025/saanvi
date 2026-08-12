const { v4: uuidv4 } = require('uuid');

class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  // Base utilities for all services can be defined here
  
  /**
   * Logs a service action
   */
  logAction(action, data) {
    console.log(`[Service Action]: ${action}`, data);
  }

  /**
   * Generates a new UUID v4
   */
  generateUuid() {
    return uuidv4();
  }
}

module.exports = BaseService;
