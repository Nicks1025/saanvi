class BaseController {
  /**
   * Base method to send standard success response
   */
  sendSuccess(res, data, message = 'Success') {
    return res.status(200).json({ success: true, message, data });
  }

  /**
   * Base method to send standard error response
   */
  sendError(res, error, statusCode = 500) {
    return res.status(statusCode).json({ success: false, error: error.message || error });
  }

  /**
   * Validates required fields in a request body
   */
  validateRequiredParams(body, requiredFields) {
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
}

module.exports = BaseController;
