const BaseRegistrarAdapter = require('./BaseRegistrarAdapter');

class StubRegistrarAdapter extends BaseRegistrarAdapter {
  constructor(sourceConfig) {
    super(sourceConfig);
    // Allow dynamic mocking of capabilities for tests
    this.mockedCapabilities = {
      version: 1,
      captcha_required: false,
      captcha_type: null,
      captcha_scope: null,
      supports_automated: true,
      supports_batch: true,
      supports_session: false,
      rate_limit_per_min: 100,
      concurrency_limit: 10,
      methods: [
        {
          name: 'PAN',
          fields: [{ name: 'PAN', is_optional: false }]
        },
        {
          name: 'Application Number',
          fields: [{ name: 'APPLICATION_NUMBER', is_optional: false }]
        }
      ]
    };
  }

  setMockedCapabilities(capabilities) {
    this.mockedCapabilities = capabilities;
  }

  async discoverCapabilities() {
    return this.mockedCapabilities;
  }

  async createSession() {
    if (!this.mockedCapabilities.supports_session) {
      throw new Error('Session not supported by this capability');
    }
    return { sessionId: 'stub-session-123' };
  }

  async verify(method, identifiers, session = null) {
    if (this.mockedCapabilities.captcha_required && !session) {
      return this.normalizeResult({
        success: false,
        status: 'CAPTCHA_REQUIRED'
      });
    }

    // Simulate verification
    if (identifiers.PAN === 'INVALID') {
      return this.normalizeResult({
        success: true,
        allotted: false,
        status: 'NOT_FOUND'
      });
    }

    const idVal = identifiers.PAN || identifiers.APPLICATION_NUMBER || '';
    const isLucky = idVal.endsWith('1') || idVal.endsWith('7') || idVal.toUpperCase().endsWith('L');

    if (isLucky) {
      return this.normalizeResult({
        success: true,
        allotted: true,
        applied: 50,
        allotted_qty: 50,
        status: 'ALLOTTED'
      });
    }

    return this.normalizeResult({
      success: true,
      allotted: false,
      applied: 50,
      allotted_qty: 0,
      status: 'NOT_ALLOTTED'
    });
  }

  async verifyBatch(method, identifiersList, session = null) {
    if (!this.mockedCapabilities.supports_batch) {
      throw new Error('Batch verification not supported');
    }
    return Promise.all(identifiersList.map(id => this.verify(method, id, session)));
  }

  normalizeResult(rawResponse) {
    if (!rawResponse.success && rawResponse.status === 'CAPTCHA_REQUIRED') {
      return {
        status: 'CAPTCHA_REQUIRED',
        error_category: 'AUTH_REQUIRED'
      };
    }
    
    if (rawResponse.status === 'NOT_FOUND') {
      return {
        status: 'NOT_FOUND',
        applied_quantity: 0,
        allotted_quantity: 0
      };
    }

    return {
      status: rawResponse.status || 'UNKNOWN',
      applied_quantity: rawResponse.applied !== undefined ? rawResponse.applied : (rawResponse.quantity || 0),
      allotted_quantity: rawResponse.allotted_qty !== undefined ? rawResponse.allotted_qty : (rawResponse.quantity || 0),
    };
  }
}

module.exports = StubRegistrarAdapter;
