const knex = require('knex');

let _sharedKnex = null;
let _sharedPoolOwner = null;

/**
 * DbDriver
 *
 * Single database execution boundary for Saanvi.
 * Manages shared Knex/PostgreSQL connection pool, query execution contracts,
 * transactions, and error propagation.
 */
class DbDriver {
  constructor(customKnex = null) {
    if (customKnex) {
      this._knex = customKnex;
      this._ownsPool = false;
      return;
    }

    if (!_sharedKnex) {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('Database Initialization Error: Missing DATABASE_URL in environment.');
      }

      const poolMin = this._parseStrictInteger(process.env.DB_POOL_MIN || '2', 'DB_POOL_MIN');
      const poolMax = this._parseStrictInteger(process.env.DB_POOL_MAX || '50', 'DB_POOL_MAX');
      const connectionTimeout = this._parseStrictInteger(process.env.DB_CONNECTION_TIMEOUT || '10000', 'DB_CONNECTION_TIMEOUT');

      if (poolMin < 0 || poolMax < 1 || poolMin > poolMax) {
        throw new Error('Database Initialization Error: Invalid pool configuration (DB_POOL_MIN / DB_POOL_MAX).');
      }
      if (connectionTimeout < 100) {
        throw new Error('Database Initialization Error: Invalid DB_CONNECTION_TIMEOUT.');
      }

      _sharedKnex = knex({
        client: 'pg',
        connection: dbUrl,
        pool: {
          min: poolMin,
          max: poolMax,
          acquireTimeoutMillis: connectionTimeout
        },
        acquireConnectionTimeout: connectionTimeout
      });
      _sharedPoolOwner = this;
      this._ownsPool = true;
    } else {
      this._ownsPool = false;
    }

    this._knex = _sharedKnex;
  }

  /**
   * Strictly parses an integer from number or string. Rejects floats, NaN, hex, or trailing non-digits.
   */
  _parseStrictInteger(value, name) {
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value)) {
        throw new Error(`Database Initialization Error: ${name} must be a safe integer.`);
      }
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!/^-?\d+$/.test(trimmed)) {
        throw new Error(`Database Initialization Error: ${name} must be a valid integer string.`);
      }
      const num = Number(trimmed);
      if (!Number.isSafeInteger(num)) {
        throw new Error(`Database Initialization Error: ${name} is out of safe integer range.`);
      }
      return num;
    }
    throw new Error(`Database Initialization Error: ${name} must be an integer.`);
  }

  get knex() {
    return this._knex;
  }

  /**
   * Resolves a QueryHelper instance or Knex query builder to a runnable Knex builder.
   * Strictly enforces transaction attachment if a transaction is supplied.
   */
  _resolveQuery(query, transaction = null) {
    let knexQuery = query;

    if (query && typeof query.build === 'function') {
      knexQuery = query.build();
    }

    if (!knexQuery || typeof knexQuery.then !== 'function' && typeof knexQuery.toSQL !== 'function') {
      throw new Error('DbDriver Error: Invalid query passed for execution.');
    }

    if (transaction) {
      if (typeof knexQuery.transacting !== 'function') {
        throw new Error('DbDriver Transaction Error: Supplied query cannot be bound to transaction.');
      }
      knexQuery = knexQuery.transacting(transaction);
    }

    return knexQuery;
  }

  /**
   * Runs a SELECT query and guarantees an Array return value.
   * Rejects invalid / non-array execution results with contract violation.
   *
   * @param {Object|string} query - QueryHelper instance, Knex query builder, or raw SQL string
   * @param {Array} parameters - Parameters for raw SQL queries
   * @param {Object} transaction - Optional Knex transaction object
   * @returns {Promise<Array>}
   */
  async runQuery(query, parameters = [], transaction = null) {
    try {
      if (typeof query === 'string') {
        let executor = this._knex;
        if (transaction) {
          if (typeof transaction.raw !== 'function') {
            throw new Error('DbDriver Transaction Error: Invalid transaction object supplied for raw query.');
          }
          executor = transaction;
        }

        const result = await executor.raw(query, parameters);
        if (result && Array.isArray(result.rows)) {
          return result.rows;
        }
        if (Array.isArray(result)) {
          return result;
        }
        throw new Error(`DbDriver Contract Violation: Raw query expected rows array, received ${typeof result}`);
      }

      const knexQuery = this._resolveQuery(query, transaction);
      const result = await knexQuery;

      if (!Array.isArray(result)) {
        throw new Error(`DbDriver Contract Violation: runQuery expected an array of rows, received ${typeof result}`);
      }

      return result;
    } catch (error) {
      this._handleError(error, query);
    }
  }

  /**
   * Runs a query and returns the first matching record or null.
   *
   * @param {Object|string} query - QueryHelper instance, Knex query builder, or raw SQL string
   * @param {Array} parameters - Parameters for raw SQL queries
   * @param {Object} transaction - Optional Knex transaction object
   * @returns {Promise<Object|null>}
   */
  async runQueryFirst(query, parameters = [], transaction = null) {
    const rows = await this.runQuery(query, parameters, transaction);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Executes a mutation operation (INSERT, UPDATE, DELETE).
   * Returns documented mutation result: { affectedRows, rows }
   * Strictly validates returned result shapes without arbitrary guesswork.
   *
   * @param {Object|string} query - QueryHelper instance, Knex query builder, or raw SQL string
   * @param {Array} parameters - Parameters for raw SQL queries
   * @param {Object} transaction - Optional Knex transaction object
   * @returns {Promise<Object>} { affectedRows: number, rows: Array }
   */
  async execute(query, parameters = [], transaction = null) {
    try {
      if (typeof query === 'string') {
        let executor = this._knex;
        if (transaction) {
          if (typeof transaction.raw !== 'function') {
            throw new Error('DbDriver Transaction Error: Invalid transaction object supplied for raw mutation.');
          }
          executor = transaction;
        }

        const result = await executor.raw(query, parameters);
        if (!result || typeof result.rowCount !== 'number') {
          throw new Error(`DbDriver Contract Violation: Raw mutation expected PostgreSQL result with rowCount, received ${typeof result}`);
        }

        return {
          affectedRows: result.rowCount,
          rows: Array.isArray(result.rows) ? result.rows : []
        };
      }

      const knexQuery = this._resolveQuery(query, transaction);
      const result = await knexQuery;

      if (Array.isArray(result)) {
        return {
          affectedRows: result.length,
          rows: result
        };
      }

      if (typeof result === 'number') {
        return {
          affectedRows: result,
          rows: []
        };
      }

      throw new Error(`DbDriver Contract Violation: execute expected an array of returned rows or count, received ${typeof result}`);
    } catch (error) {
      this._handleError(error, query);
    }
  }

  /**
   * Alias for raw parameterized SQL query execution.
   */
  async runQueryRaw(sql, parameters = [], transaction = null) {
    return this.runQuery(sql, parameters, transaction);
  }

  /**
   * Executes a raw SQL query directly against PostgreSQL.
   * Returns the complete native driver result object: { command, rowCount, rows, fields }
   *
   * @param {string} sql - Raw SQL string
   * @param {Array} parameters - Optional parameters
   * @param {Object} transaction - Optional Knex transaction
   * @returns {Promise<Object>}
   */
  async executeRaw(sql, parameters = [], transaction = null) {
    try {
      let executor = this._knex;
      if (transaction) {
        if (typeof transaction.raw !== 'function') {
          throw new Error('DbDriver Transaction Error: Invalid transaction object supplied for raw query.');
        }
        executor = transaction;
      }
      return await executor.raw(sql, parameters);
    } catch (error) {
      this._handleError(error, sql);
    }
  }

  /**
   * Runs an operation inside an isolated database transaction.
   * Automatically commits on completion, rolls back on error, and preserves the original error.
   *
   * @param {Function} callback - async (transaction) => { ... }
   */
  async transaction(callback) {
    try {
      return await this._knex.transaction(async (trx) => {
        return await callback(trx);
      });
    } catch (error) {
      this._handleError(error, 'TRANSACTION');
    }
  }

  /**
   * Performs a database health check.
   */
  async healthCheck() {
    try {
      const result = await this._knex.raw('SELECT 1 as healthy');
      return { healthy: true, rows: result?.rows || [] };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Gracefully shuts down the connection pool ONLY if owned by this instance.
   * Secondary instances and external Knex instances cannot destroy the shared pool.
   */
  async close() {
    if (this._ownsPool && this === _sharedPoolOwner && this._knex && this._knex === _sharedKnex) {
      const poolToDestroy = _sharedKnex;
      _sharedKnex = null;
      _sharedPoolOwner = null;
      this._ownsPool = false;
      await poolToDestroy.destroy();
    }
  }

  /**
   * Centralized database error handler.
   * Preserves PostgreSQL error code, constraint name, detail, and original error metadata.
   */
  _handleError(error, queryContext) {
    if (error.code !== '23505') {
      console.error('[DbDriver Error]', {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail,
        table: error.table
      });
    }
    throw error;
  }
}

const defaultDriver = new DbDriver();
module.exports = defaultDriver;
module.exports.DbDriver = DbDriver;
