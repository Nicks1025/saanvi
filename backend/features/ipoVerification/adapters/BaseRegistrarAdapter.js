class BaseRegistrarAdapter {
  constructor(sourceConfig) {
    this.sourceConfig = sourceConfig;
  }

  /**
   * Discover capabilities for this specific registrar source.
   * Returns a capability object describing what fields and CAPTCHA
   * this source currently requires.
   *
   * @returns {Promise<Object>}
   */
  async discoverCapabilities() {
    throw new Error('discoverCapabilities() must be implemented by subclass');
  }

  /**
   * Create a verification session if the capability requires one.
   *
   * @returns {Promise<Object>}
   */
  async createSession() {
    throw new Error('createSession() must be implemented by subclass');
  }

  /**
   * Verify a single applicant's allotment.
   *
   * @param {Object} method - The verification method used
   * @param {Object} identifiers - The key-value pairs of identifiers (e.g. { PAN: "ABCDE1234F" })
   * @param {Object} session - Optional session data
   * @returns {Promise<Object>}
   */
  async verify(method, identifiers, session = null) {
    throw new Error('verify() must be implemented by subclass');
  }

  /**
   * Verify a batch of applicants if supported.
   *
   * @param {Object} method - The verification method used
   * @param {Array<Object>} identifiersList - List of identifier objects
   * @param {Object} session - Optional session data
   * @returns {Promise<Array<Object>>}
   */
  async verifyBatch(method, identifiersList, session = null) {
    throw new Error('verifyBatch() must be implemented by subclass');
  }

  /**
   * Convert the registrar's specific response format into Saanvi's
   * internal normalized result format.
   *
   * @param {Object} rawResponse
   * @returns {Object}
   */
  normalizeResult(rawResponse) {
    throw new Error('normalizeResult() must be implemented by subclass');
  }
}

module.exports = BaseRegistrarAdapter;
