const BaseController = require('../../base/baseController');

class SqlController extends BaseController {
  constructor(sqlService) {
    super();
    this.sqlService = sqlService;
  }

  /**
   * Executes arbitrary SQL via the SqlService.
   */
  async executeSql(req, res) {
    try {
      const { databaseId, query } = req.body;
      
      if (!databaseId) {
        return this.sendError(res, 'Database ID is required.', 400);
      }
      
      if (!query || typeof query !== 'string') {
        return this.sendError(res, 'A valid SQL query string is required.', 400);
      }

      const result = await this.sqlService.executeSql(databaseId, query);
      
      return this.sendSuccess(res, result, 'Query executed successfully');
    } catch (error) {
      // Send safe error message back to the client
      return this.sendError(res, error.message, 400);
    }
  }
}

module.exports = SqlController;
