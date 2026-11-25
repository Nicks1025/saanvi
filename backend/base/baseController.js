/**
 * BaseController
 *
 * Canonical HTTP response controller following Sofy architecture.
 * Enforces standardized response envelopes, pagination contracts, and context-based response delivery.
 */
class BaseController {
  constructor(context = null) {
    this.context = context;
    this.log = this.context?.logger || console;
  }

  /**
   * Resolves the active Express HTTP response object from request context or explicit parameter.
   * Throws an explicit programming error if HTTP response context is missing.
   */
  _resolveResponse(explicitRes = null) {
    const res = (explicitRes && typeof explicitRes.status === 'function')
      ? explicitRes
      : (this.context?.response || this.context?.res);

    if (!res || typeof res.status !== 'function') {
      throw new Error('BaseController Error: HTTP response context is missing.');
    }
    return res;
  }

  /**
   * Sends standard success response.
   * Signature: respondOk(data, message = 'Success')
   * Canonical envelope: { success: true, message, data }
   */
  respondOk(data, message = 'Success', explicitResOrStatus = null) {
    let status = 200;
    let explicitRes = null;

    if (typeof explicitResOrStatus === 'number') {
      status = explicitResOrStatus;
    } else if (explicitResOrStatus && typeof explicitResOrStatus.status === 'function') {
      explicitRes = explicitResOrStatus;
    }

    const res = this._resolveResponse(explicitRes);
    return res.status(status).json({
      success: true,
      data: data !== undefined ? data : null,
      message
    });
  }

  /**
   * Sends standard error response.
   * Signature: respondError(errorOrMessage, statusCode, code, details)
   * Canonical envelope: { success: false, data: null, error: { code, message, details } }
   */
  respondError(errorOrMessage = 'Internal Server Error', statusCode = 500, code = null, details = [], explicitRes = null) {
    const res = this._resolveResponse(explicitRes);
    const status = typeof statusCode === 'number' ? statusCode : 500;
    const msg = typeof errorOrMessage === 'string' ? errorOrMessage : (errorOrMessage?.message || 'Internal Server Error');
    const errorCode = code || errorOrMessage?.code || (
      status === 400 ? 'VALIDATION_ERROR' :
      status === 401 ? 'UNAUTHORIZED' :
      status === 403 ? 'FORBIDDEN' :
      status === 404 ? 'NOT_FOUND' :
      status === 409 ? 'CONFLICT' :
      'SERVER_ERROR'
    );
    const errDetails = Array.isArray(details) && details.length > 0 ? details : (Array.isArray(errorOrMessage?.details) ? errorOrMessage.details : []);

    return res.status(status).json({
      success: false,
      data: null,
      error: {
        code: errorCode,
        message: msg,
        details: errDetails
      }
    });
  }

  /**
   * Sends standard paginated collection response.
   * Enforces canonical pagination properties: { pageNumber, pageSize, totalRecords, totalPages }
   */
  respondPaginated(data = [], pagination = {}, message = null, explicitRes = null) {
    const res = this._resolveResponse(explicitRes);

    const pageNumber = Number(pagination.pageNumber);
    const pageSize = Number(pagination.pageSize);
    const totalRecords = Number(pagination.totalRecords);

    if (!Number.isInteger(pageNumber) || pageNumber < 1 ||
        !Number.isInteger(pageSize) || pageSize < 1 ||
        !Number.isInteger(totalRecords) || totalRecords < 0) {
      throw new Error(
        `BaseController Error: Invalid pagination contract. Required integers: { pageNumber >= 1, pageSize >= 1, totalRecords >= 0 }. Received: ${JSON.stringify(pagination)}`
      );
    }

    const totalPages = Math.ceil(totalRecords / pageSize);

    return res.status(200).json({
      success: true,
      data: Array.isArray(data) ? data : [],
      pagination: {
        pageNumber,
        pageSize,
        totalRecords,
        totalPages
      },
      message: message || null
    });
  }

  /**
   * Validates presence of required fields in a request body.
   */
  validateRequiredParams(body, requiredFields = []) {
    if (!body || typeof body !== 'object') {
      const error = new Error('Missing request body');
      error.statusCode = 400;
      throw error;
    }
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        const error = new Error(`Missing required field: ${field}`);
        error.statusCode = 400;
        throw error;
      }
    }
  }
}

module.exports = BaseController;
