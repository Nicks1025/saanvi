const BaseService = require('../../base/baseService');
const { parse } = require('pgsql-ast-parser');

class SqlService extends BaseService {
  constructor(queryHelper) {
    super();
    this.queryHelper = queryHelper;
  }

  /**
   * Parses the SQL string into an AST, traversing deeply to detect any DROP or dynamic SQL bypass.
   * Throws an error if any prohibited statement is found.
   */
  _validateAstSafety(sqlString) {
    let ast;
    try {
      ast = parse(sqlString);
    } catch (e) {
      throw new Error(`SQL parsing failed or unsupported statement detected. Execution aborted. Reason: ${e.message}`);
    }

    if (!ast || !Array.isArray(ast)) {
      throw new Error('Invalid SQL structure parsed.');
    }

    // Deep traverse the AST to find any malicious intent
    const traverse = (node) => {
      if (!node || typeof node !== 'object') return;
      
      if (node.type) {
        const typeStr = node.type.toLowerCase();
        
        // 1. Prohibit any DROP or ALTER statement explicitly
        if (typeStr.startsWith('drop ') || typeStr === 'drop') {
          throw new Error('DROP statements are strictly prohibited in the SQL Editor.');
        }
        if (typeStr.startsWith('alter ') || typeStr === 'alter') {
          throw new Error('ALTER statements are strictly prohibited in the SQL Editor.');
        }

        // 2. Prohibit UPDATE or DELETE without a WHERE clause, or with 1=1
        if (typeStr === 'update' || typeStr === 'delete') {
          if (!node.where) {
            throw new Error(`${typeStr.toUpperCase()} statements must have a WHERE clause to prevent accidental bulk operations.`);
          }
          // Basic tautology check for 1=1, 'a'='a', TRUE
          const isTautology = (where) => {
            if (!where) return false;
            if (where.type === 'binary' && where.op === '=') {
              if (where.left.type === 'integer' && where.right.type === 'integer' && where.left.value === where.right.value) return true;
              if (where.left.type === 'string' && where.right.type === 'string' && where.left.value === where.right.value) return true;
            }
            if (where.type === 'boolean' && where.value === true) return true;
            return false;
          };

          if (isTautology(node.where)) {
            throw new Error(`The WHERE clause in ${typeStr.toUpperCase()} statements cannot be a tautology (like 1=1).`);
          }
        }

        // 3. Prohibit dynamic SQL bypass paths in PostgreSQL
        if (typeStr === 'do') {
          throw new Error('Anonymous PL/pgSQL blocks (DO) are prohibited to prevent dynamic SQL execution bypasses.');
        }
        if (typeStr === 'create function' || typeStr === 'create procedure') {
          throw new Error('Function/Procedure creation is prohibited to prevent dynamic SQL execution bypasses.');
        }
        // pgsql-ast-parser handles CALL as 'call' type, EXECUTE might fail at parse time, but check anyway
        if (typeStr === 'execute' || typeStr === 'call') {
          throw new Error('Dynamic statement execution (EXECUTE/CALL) is prohibited.');
        }
      }

      // Check all nested values (children, clauses, etc.)
      for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(traverse);
        } else if (child && typeof child === 'object') {
          traverse(child);
        }
      }
    };

    ast.forEach(traverse);
  }

  /**
   * Executes the raw SQL safely against the database.
   */
  async executeSql(databaseId, sqlString) {
    if (databaseId !== 'primary') {
      throw new Error(`Database ID '${databaseId}' is not allowed or not configured.`);
    }

    if (!sqlString || !sqlString.trim()) {
      throw new Error('No SQL provided.');
    }

    // 1. Perform strict AST validation
    this._validateAstSafety(sqlString);

    const startTime = Date.now();
    let result;
    try {
      // 2. Execute via the restricted queryHelper method
      result = await this.queryHelper.executeRawAdminSql(sqlString);
    } catch (error) {
      const err = new Error(`Database execution error: ${error.message}`);
      err.code = error.code;
      throw err;
    }
    const executionTime = Date.now() - startTime;

    // 3. Format the result
    return {
      success: true,
      executionTimeMs: executionTime,
      rows: result.rows || [],
      rowCount: result.rowCount !== undefined ? result.rowCount : (result.rows ? result.rows.length : 0),
      command: result.command || 'UNKNOWN',
      fields: result.fields ? result.fields.map(f => f.name) : []
    };
  }
}

module.exports = SqlService;
