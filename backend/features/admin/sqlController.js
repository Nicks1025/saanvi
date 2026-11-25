const BaseController = require('../../base/baseController');
const SqlService = require('./sqlService');

class SqlController extends BaseController {
  constructor(context = null) {
    super(context);
    this.sqlService = new SqlService(context);
  }

  /**
   * Executes arbitrary SQL via the SqlService.
   */
  async executeSql(req, res) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const { databaseId, query } = body;
      
      if (!databaseId) {
        return this.respondError('Database ID is required.', 400);
      }
      
      if (!query || typeof query !== 'string') {
        return this.respondError('A valid SQL query string is required.', 400);
      }

      const result = await this.sqlService.executeSql(databaseId, query);
      
      return this.respondOk(result, 'Query executed successfully');
    } catch (error) {
      return this.respondError(error.message, 400);
    }
  }
}

module.exports = SqlController;
