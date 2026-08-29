const knex = require('knex');

let _sharedKnex = null;

/**
 * queryHelper.js
 * Central database abstraction layer powered by Knex.js.
 *
 * Design philosophy — SIMPLE CONDITION → SIMPLE SYNTAX:
 *
 *  - `.where(sql)` / `.and(sql)` / `.or(sql)` accept plain SQL condition
 *    strings. Column names and table aliases are developer-written (safe).
 *    Trusted runtime values (UUIDs from auth tokens, Joi-validated params)
 *    may be interpolated directly. FREE-TEXT user input must be SQL-escaped
 *    (escape `'` → `''`) in the repository before interpolation.
 *
 *  - `.leftJoin()` / `.join()` handle single-column ON clauses.
 *    For compound ON clauses, access `queryHelper.db` and build the join
 *    with `db.raw(...)`, documenting each exception with a comment.
 *
 *  - `.field()` is always used for field selection.
 *
 *  - No specialised helper methods exist (no `whereLike()`, `whereOr()`,
 *    `whereAnd()`, `whereRaw()`, etc.) for conditions that can be expressed
 *    using `.where()`, `.and()`, or `.or()`.
 */
class QueryHelper {
  constructor() {
    if (!_sharedKnex) {
      const dbUrl = process.env.DATABASE_URL;

      if (!dbUrl) {
        throw new Error('Database Initialization Error: Missing DATABASE_URL in environment.');
      }

      _sharedKnex = knex({
        client: 'pg',
        connection: dbUrl,
      });
    }
    
    this._db = _sharedKnex;
    this._resetState();
  }

  _resetState() {
    this._query = null;
    this._isInsert = false;
  }

  from(table, alias = null) {
    const target = alias ? `${table} as ${alias}` : table;
    this._query = this._db(target);
    return this;
  }

  select(columns = '*') {
    if (!this._query) throw new Error('Must call from() before select()');
    if (typeof columns === 'string' && columns !== '*') {
      const cols = columns.split(',').map(c => c.trim()).filter(Boolean);
      this._query = this._query.select(...cols);
    } else {
      this._query = this._query.select(columns);
    }
    return this;
  }

  field(columnName) {
    if (!this._query) throw new Error('Must call from() before field()');
    this._query = this._query.select(columnName);
    return this;
  }

  count(column, alias) {
    if (!this._query) throw new Error('Must call from() before count()');
    this._query = this._query.count(`${column} as ${alias || 'count'}`);
    return this;
  }

  countDistinct(column, alias) {
    if (!this._query) throw new Error('Must call from() before countDistinct()');
    this._query = this._query.countDistinct(`${column} as ${alias || 'count'}`);
    return this;
  }

  join(table, alias, onCondition) {
    if (!this._query) throw new Error('Must call from() before join()');
    const target = alias ? `${table} as ${alias}` : table;
    const parts = onCondition.replace(/\s+/g, '').split('=');
    this._query = this._query.innerJoin(target, parts[0], parts[1]);
    return this;
  }

  leftJoin(table, alias, onCondition) {
    if (!this._query) throw new Error('Must call from() before leftJoin()');
    const target = alias ? `${table} as ${alias}` : table;
    const parts = onCondition.replace(/\s+/g, '').split('=');
    this._query = this._query.leftJoin(target, parts[0], parts[1]);
    return this;
  }

  /**
   * LEFT JOIN with a compound ON condition expressed as a plain SQL string
   * with optional `?` bindings for values.
   *
   * Use this when the ON clause references more than one column or mixes
   * column references with bound values.
   *
   * Example:
   *   .leftJoinOn('message_receipts as mr', 'mr.message_uuid = m.uuid and mr.user_uuid = ?', [userUuid])
   *
   * Values bound via the bindings array are safely parameterized by Knex.
   * Column-to-column references (no bindings needed) work without bindings:
   *   .leftJoinOn('message_receipts as mr', 'mr.message_uuid = m.uuid')
   */
  leftJoinOn(tableWithAlias, condition, bindings = []) {
    if (!this._query) throw new Error('Must call from() before leftJoinOn()');
    this._query = this._query.leftJoin(
      this._db.raw(`${tableWithAlias} on ${condition}`, bindings)
    );
    return this;
  }

  rightJoin(table, alias, onCondition) {
    if (!this._query) throw new Error('Must call from() before rightJoin()');
    const target = alias ? `${table} as ${alias}` : table;
    const parts = onCondition.replace(/\s+/g, '').split('=');
    this._query = this._query.rightJoin(target, parts[0], parts[1]);
    return this;
  }

  insert(data) {
    if (!this._query) throw new Error('Must call from() before insert()');
    this._isInsert = true;
    this._query = this._query.insert(data).returning('*'); // Postgres returning
    return this;
  }

  update(data) {
    if (!this._query) throw new Error('Must call from() before update()');
    this._query = this._query.update(data).returning('*');
    return this;
  }

  delete() {
    if (!this._query) throw new Error('Must call from() before delete()');
    this._query = this._query.del().returning('*');
    return this;
  }

  /**
   * Adds a WHERE clause.
   *
   * Two call forms are supported:
   *
   * 1. Structured form — column + operator + value (existing behaviour):
   *      .where('uuid', 'eq', someUuid)
   *      .where('archived_at', 'is', null)
   *      .where('status', 'neq', 'inactive')
   *
   * 2. Condition string form — a plain SQL condition with optional `?` bindings:
   *      .where('archived_at is null')                          // no bindings
   *      .where('cr.sender_uuid = ? OR cr.receiver_uuid = ?', [userUuid, userUuid])
   *      .where('mr.message_uuid = m.uuid')                     // column-to-column ref
   *
   * The condition string form uses Knex's own parameterization (whereRaw) internally,
   * so `?` values are always safely passed as bindings — never concatenated into SQL.
   *
   * Column names and table aliases in condition strings are not user input and
   * are safe to include directly (they are written by developers, not end-users).
   * Any runtime VALUE that appears in the condition must use `?` binding syntax.
   */
  where(columnOrSql, operatorOrBindings, value) {
    if (!this._query) throw new Error('Must call from() before where()');

    // Condition-string form: first arg is a string containing a space (SQL expression)
    // or second arg is an array (bindings).
    const isConditionString =
      Array.isArray(operatorOrBindings) ||
      (value === undefined && typeof columnOrSql === 'string' &&
       (columnOrSql.includes(' ') || columnOrSql.includes('=')));

    if (isConditionString) {
      const bindings = Array.isArray(operatorOrBindings) ? operatorOrBindings : [];
      this._query = this._query.whereRaw(columnOrSql, bindings);
      return this;
    }

    // Structured form
    const column = columnOrSql;
    const operator = operatorOrBindings;

    if (operator === 'eq') {
      this._query = this._query.where(column, value);
    } else if (operator === 'neq') {
      this._query = this._query.whereNot(column, value);
    } else if (operator === 'gt') {
      this._query = this._query.where(column, '>', value);
    } else if (operator === 'lt') {
      this._query = this._query.where(column, '<', value);
    } else if (operator === 'in') {
      this._query = this._query.whereIn(column, value);
    } else if (operator === 'is') {
      if (value === null) {
        this._query = this._query.whereNull(column);
      } else {
        this._query = this._query.where(column, value);
      }
    } else if (operator === 'not_is') {
      if (value === null) {
        this._query = this._query.whereNotNull(column);
      } else {
        this._query = this._query.whereNot(column, value);
      }
    } else {
      this._query = this._query.where(column, value);
    }
    return this;
  }

  orderBy(column, ascending = true) {
    if (!this._query) throw new Error('Must call from() before orderBy()');
    this._query = this._query.orderBy(column, ascending ? 'asc' : 'desc');
    return this;
  }

  limit(count) {
    if (!this._query) throw new Error('Must call from() before limit()');
    this._query = this._query.limit(count);
    return this;
  }

  offset(count) {
    if (!this._query) throw new Error('Must call from() before offset()');
    this._query = this._query.offset(count);
    return this;
  }

  /**
   * Executes the constructed query against the Postgres database.
   */
  async execute() {
    if (!this._query) {
      throw new Error('Query execution failed: Incomplete query structure.');
    }

    try {
      const result = await this._query;
      this._resetState();
      return result;
    } catch (error) {
      this._resetState();
      if (error.code !== '23505') {
        console.error(`[Database Error] Code: ${error.code} | Message: ${error.message}`);
      }
      const customError = new Error('A database error occurred during execution.');
      customError.code = error.code;
      throw customError;
    }
  }

  async queryRaw(sql, bindings = []) {
    try {
      const result = await this._db.raw(sql, bindings);
      return result;
    } catch (error) {
      if (error.code !== '23505') {
        console.error(`[Database Error] Code: ${error.code} | Message: ${error.message}`);
      }
      const customError = new Error('A database error occurred during raw execution.');
      customError.code = error.code;
      throw customError;
    }
  }

  /**
   * Runs a callback inside a Knex transaction.
   * Usage: await queryHelper.transaction(async (trx) => { ... });
   * Pass trx to repository methods that accept it.
   */
  async transaction(callback) {
    try {
      return await this._db.transaction(callback);
    } catch (error) {
      console.error(`[Database Error] Code: ${error.code} | Message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Returns the underlying Knex instance (used to build correlated subqueries
   * that cannot be expressed as top-level queryHelper chains, e.g. JSON
   * aggregation subqueries that reference an outer alias).
   */
  get db() {
    return this._db;
  }

  /**
   * Executes raw SQL specifically for the Admin SQL Editor.
   * This is strictly for verified/parsed queries originating from authorized admins.
   * Do not use this for general application queries.
   */
  async executeRawAdminSql(sqlString) {
    if (!this._db) throw new Error('Database not initialized');
    
    try {
      // Execute with a 15-second timeout to protect connection resources
      return await this._db.raw(sqlString).timeout(15000, { cancel: true });
    } catch (error) {
      console.error(`[Database Raw Error] Code: ${error.code} | Message: ${error.message}`);
      throw error;
    }
  }
}

module.exports = QueryHelper;
