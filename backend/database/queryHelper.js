const knex = require('knex');

let _sharedKnex = null;

/**
 * queryHelper.js
 * Central database abstraction layer powered by Knex.js.
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

  where(column, operator, value) {
    if (!this._query) throw new Error('Must call from() before where()');
    
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
        this._query = this._query.where(column, value); // Fallback
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

  whereRaw(sql, bindings = []) {
    if (!this._query) throw new Error('Must call from() before whereRaw()');
    this._query = this._query.whereRaw(sql, bindings);
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
      // Keep error message logging consistent
      console.error(`[Database Error] Code: ${error.code} | Message: ${error.message}`);
      throw new Error('A database error occurred during execution.');
    }
  }
}

module.exports = QueryHelper;
