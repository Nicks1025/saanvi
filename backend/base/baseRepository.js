const defaultDbDriver = require('../database/dbDriver');

/**
 * BaseRepository
 *
 * Shared data access foundation following Sofy architecture.
 * Bridges feature repositories to DbDriver and request-scoped ApiContext.
 * Feature repositories initialize their table-bound QueryHelper instances in constructors.
 * Query execution delegates strictly through BaseRepository methods.
 */
class BaseRepository {
  constructor(context = null) {
    this.context = context;
    this.dbDriver = context?.connection || defaultDbDriver;
    this.log = context?.logger || console;
  }

  _isValidTransaction(trx) {
    if (!trx) return false;
    return (
      typeof trx.raw === 'function' ||
      typeof trx.commit === 'function' ||
      trx.isTransaction === true
    );
  }

  _resolveParamsAndTrx(parametersOrTrx, explicitTrx) {
    const validExplicitTrx = this._isValidTransaction(explicitTrx) ? explicitTrx : null;
    const validContextTrx = this._isValidTransaction(this.context?.transaction) ? this.context.transaction : null;
    const activeTrx = validExplicitTrx || validContextTrx;

    if (Array.isArray(parametersOrTrx)) {
      return {
        parameters: parametersOrTrx,
        transaction: activeTrx
      };
    }
    if (this._isValidTransaction(parametersOrTrx)) {
      return {
        parameters: [],
        transaction: parametersOrTrx
      };
    }
    return {
      parameters: [],
      transaction: activeTrx
    };
  }

  /**
   * Runs a SELECT query and always returns an array of records.
   * @param {Object|string} query - QueryHelper instance or Knex query builder
   * @param {Array|Object} parametersOrTrx - Optional parameters for raw queries or transaction
   * @param {Object} explicitTrx - Optional explicit transaction object
   * @returns {Promise<Array>}
   */
  async runQuery(query, parametersOrTrx = [], explicitTrx = null) {
    const { parameters, transaction } = this._resolveParamsAndTrx(parametersOrTrx, explicitTrx);
    return await this.dbDriver.runQuery(query, parameters, transaction);
  }

  /**
   * Runs a SELECT query and returns the first matching record or null.
   * @param {Object|string} query - QueryHelper instance or Knex query builder
   * @param {Array|Object} parametersOrTrx - Optional parameters for raw queries or transaction
   * @param {Object} explicitTrx - Optional explicit transaction object
   * @returns {Promise<Object|null>}
   */
  async runQueryFirst(query, parametersOrTrx = [], explicitTrx = null) {
    const { parameters, transaction } = this._resolveParamsAndTrx(parametersOrTrx, explicitTrx);
    return await this.dbDriver.runQueryFirst(query, parameters, transaction);
  }

  /**
   * Executes a mutation operation (INSERT, UPDATE, DELETE).
   * @param {Object|string} query - QueryHelper instance or Knex query builder
   * @param {Array|Object} parametersOrTrx - Optional parameters for raw queries or transaction
   * @param {Object} explicitTrx - Optional explicit transaction object
   * @returns {Promise<Object>} { affectedRows, rows }
   */
  async execute(query, parametersOrTrx = [], explicitTrx = null) {
    const { parameters, transaction } = this._resolveParamsAndTrx(parametersOrTrx, explicitTrx);
    return await this.dbDriver.execute(query, parameters, transaction);
  }

  /**
   * Executes a parameterized raw SQL SELECT query.
   * For mutations, use execute().
   * @param {string} sql
   * @param {Array|Object} parametersOrTrx
   * @param {Object} explicitTrx
   * @returns {Promise<Array>}
   */
  async queryRaw(sql, parametersOrTrx = [], explicitTrx = null) {
    const { parameters, transaction } = this._resolveParamsAndTrx(parametersOrTrx, explicitTrx);
    return await this.dbDriver.runQueryRaw(sql, parameters, transaction);
  }

  /**
   * Executes a raw SQL query directly and returns the native PostgreSQL result object.
   * Useful for administrative SQL tooling needing command, rowCount, rows, and fields.
   * @param {string} sql
   * @param {Array|Object} parametersOrTrx
   * @param {Object} explicitTrx
   * @returns {Promise<Object>}
   */
  async executeRaw(sql, parametersOrTrx = [], explicitTrx = null) {
    const { parameters, transaction } = this._resolveParamsAndTrx(parametersOrTrx, explicitTrx);
    return await this.dbDriver.executeRaw(sql, parameters, transaction);
  }

  /**
   * Runs an operation inside an isolated database transaction.
   * @param {Function} callback - async (trx) => { ... }
   * @returns {Promise<any>}
   */
  async transaction(callback) {
    return await this.dbDriver.transaction(callback);
  }
}

module.exports = BaseRepository;
