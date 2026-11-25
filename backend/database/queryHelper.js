/**
 * QueryHelper
 *
 * Query construction ONLY.
 * Responsible solely for fluent SQL query building using Knex.
 * Does NOT execute queries, initialize connections, or handle HTTP contracts.
 *
 * Reusable table-bound definition:
 *   this.sql = new QueryHelper('users', 'u');
 * Calling query-starting methods (.select, .where, .insert, .update, .delete)
 * returns a fresh, independent query chain without mutating the definition instance.
 *
 * SELECT Convention:
 *   this.sql.select().field('u.uuid').field('u.email').where('u.status', '=', 'ACTIVE');
 * Selecting all fields must be explicit:
 *   this.sql.select().field('*');
 */

const SCALAR_OPERATORS = new Set([
  '=',
  '!=',
  '<>',
  '>',
  '>=',
  '<',
  '<=',
  'like',
  'ilike',
  'not like',
  'not ilike'
]);

const OPERATOR_ALIASES = {
  'eq': '=',
  'neq': '!=',
  'gt': '>',
  'gte': '>=',
  'lt': '<',
  'lte': '<='
};

class QueryHelper {
  constructor(table = null, alias = null, knexInstance = null, activeKnexQuery = null, metadata = {}) {
    this._table = table ? this._validateIdentifier(table, 'Table name') : null;
    this._alias = alias ? this._validateIdentifier(alias, 'Table alias') : null;
    this._knex = knexInstance;
    this._knexQuery = activeKnexQuery;
    this._queryType = metadata.queryType || null; // 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | null
    this._selectedFields = Array.isArray(metadata.selectedFields) ? [...metadata.selectedFields] : [];
  }

  /**
   * Lazily resolves Knex instance if not provided in constructor.
   */
  _getKnex() {
    if (!this._knex) {
      const dbDriver = require('./dbDriver');
      this._knex = dbDriver.knex;
    }
    return this._knex;
  }

  /**
   * Validates database identifier name (table name, column name, or alias).
   */
  _validateIdentifier(identifier, type = 'Identifier') {
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      throw new Error(`QueryHelper Error: ${type} must be a non-empty string.`);
    }
    const trimmed = identifier.trim();
    if (trimmed.includes(';') || trimmed.includes('--') || trimmed.includes('/*')) {
      throw new Error(`QueryHelper Error: ${type} contains illegal characters: "${identifier}".`);
    }
    return trimmed;
  }

  /**
   * Asserts that current query chain can transition to or match the requested query type.
   */
  _assertCanSetQueryType(newType) {
    if (this._queryType && this._queryType !== newType) {
      throw new Error(`QueryHelper Error: Cannot change query type from ${this._queryType} to ${newType}.`);
    }
  }

  /**
   * Spawns an active query chain if current instance is a table definition.
   * If already an active query chain, returns this.
   */
  _ensureActiveQuery(options = {}) {
    if (this._knexQuery) {
      if (options.queryType && !this._queryType) {
        this._queryType = options.queryType;
      }
      return this;
    }

    if (!this._table) {
      throw new Error('QueryHelper Error: Target table must be specified before building a query.');
    }

    const knex = this._getKnex();
    const target = this._alias ? `${this._table} as ${this._alias}` : this._table;
    const freshKnexQuery = knex(target);

    return new QueryHelper(this._table, this._alias, knex, freshKnexQuery, {
      queryType: options.queryType || null,
      selectedFields: options.selectedFields || []
    });
  }

  /**
   * Target table with optional alias.
   * On a definition instance, returns a new configured definition.
   * On an active query chain, explicitly sets the table source.
   */
  from(table, alias = null) {
    const validTable = this._validateIdentifier(table, 'Table name');
    let validAlias = null;
    if (alias !== null && alias !== undefined) {
      validAlias = this._validateIdentifier(alias, 'Table alias');
    }

    const target = validAlias ? `${validTable} as ${validAlias}` : validTable;

    if (this._knexQuery) {
      this._knexQuery = this._knexQuery.from(target);
      this._table = validTable;
      this._alias = validAlias;
      return this;
    }

    return new QueryHelper(validTable, validAlias, this._knex, null);
  }

  /**
   * Initializes a SELECT query.
   * Does NOT automatically add '*' or columns.
   * Explicit fields must be attached via .field(column) or .fields(...columns).
   */
  select(...columns) {
    this._assertCanSetQueryType('SELECT');
    const active = this._ensureActiveQuery({ queryType: 'SELECT', selectedFields: [] });
    active._queryType = 'SELECT';

    if (columns.length > 0) {
      active.fields(...columns);
    }

    return active;
  }

  /**
   * Appends a single column or expression to the SELECT query.
   * Example: .field('u.uuid') or .field('r.name as role_name') or .field('*')
   */
  field(columnName) {
    if (!columnName || typeof columnName !== 'string' || !columnName.trim()) {
      throw new Error('QueryHelper Error: Field name must be a non-empty string.');
    }
    if (this._queryType && this._queryType !== 'SELECT') {
      throw new Error(`QueryHelper Error: Cannot select fields on a ${this._queryType} query.`);
    }

    const trimmed = columnName.trim();
    const active = this._ensureActiveQuery({ queryType: 'SELECT', selectedFields: [] });
    active._queryType = 'SELECT';
    active._selectedFields.push(trimmed);
    active._knexQuery = active._knexQuery.select(trimmed);
    return active;
  }

  /**
   * Appends multiple columns to the SELECT query.
   * Example: .fields('u.uuid', 'u.email') or .fields(['u.uuid', 'u.email'])
   */
  fields(...columnNames) {
    if (this._queryType && this._queryType !== 'SELECT') {
      throw new Error(`QueryHelper Error: Cannot select fields on a ${this._queryType} query.`);
    }

    const active = this._ensureActiveQuery({ queryType: 'SELECT', selectedFields: [] });
    active._queryType = 'SELECT';

    let flatCols = [];
    for (const col of columnNames) {
      if (Array.isArray(col)) {
        flatCols.push(...col);
      } else if (typeof col === 'string' && col.includes(',')) {
        flatCols.push(...col.split(',').map((c) => c.trim()).filter(Boolean));
      } else if (typeof col === 'string') {
        flatCols.push(col.trim());
      } else {
        throw new Error(`QueryHelper Error: Invalid column specification "${col}". Expected string or array of strings.`);
      }
    }

    if (flatCols.length === 0) {
      throw new Error('QueryHelper Error: .fields() requires at least one column.');
    }

    for (const col of flatCols) {
      active.field(col);
    }

    return active;
  }

  count(column = '*', alias = 'total') {
    if (this._queryType && this._queryType !== 'SELECT') {
      throw new Error(`QueryHelper Error: Cannot count fields on a ${this._queryType} query.`);
    }
    const validCol = this._validateIdentifier(column, 'Count column');
    const validAlias = this._validateIdentifier(alias, 'Count alias');

    const active = this._ensureActiveQuery({ queryType: 'SELECT', selectedFields: [] });
    active._queryType = 'SELECT';
    active._selectedFields.push(`${validCol} as ${validAlias}`);
    active._knexQuery = active._knexQuery.count(`${validCol} as ${validAlias}`);
    return active;
  }

  countDistinct(column, alias = 'total') {
    if (this._queryType && this._queryType !== 'SELECT') {
      throw new Error(`QueryHelper Error: Cannot count fields on a ${this._queryType} query.`);
    }
    const validCol = this._validateIdentifier(column, 'Count column');
    const validAlias = this._validateIdentifier(alias, 'Count alias');

    const active = this._ensureActiveQuery({ queryType: 'SELECT', selectedFields: [] });
    active._queryType = 'SELECT';
    active._selectedFields.push(`${validCol} as ${validAlias}`);
    active._knexQuery = active._knexQuery.countDistinct(`${validCol} as ${validAlias}`);
    return active;
  }

  /**
   * Configures an INSERT mutation. Appends returning('*') for PostgreSQL.
   */
  insert(data) {
    this._assertCanSetQueryType('INSERT');

    if (data === undefined || data === null) {
      throw new Error('QueryHelper Error: Insert payload cannot be undefined or null.');
    }
    if (typeof data !== 'object') {
      throw new Error('QueryHelper Error: Insert payload must be an object or array of objects.');
    }
    if (Array.isArray(data) && data.length === 0) {
      throw new Error('QueryHelper Error: Insert payload array cannot be empty.');
    }
    if (!Array.isArray(data) && Object.keys(data).length === 0) {
      throw new Error('QueryHelper Error: Insert payload object cannot be empty.');
    }

    const active = this._ensureActiveQuery({ queryType: 'INSERT' });
    active._queryType = 'INSERT';
    active._knexQuery = active._knexQuery.insert(data).returning('*');
    return active;
  }

  /**
   * Configures an UPDATE mutation. Appends returning('*') for PostgreSQL.
   */
  update(data) {
    this._assertCanSetQueryType('UPDATE');

    if (data === undefined || data === null) {
      throw new Error('QueryHelper Error: Update payload cannot be undefined or null.');
    }
    if (typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('QueryHelper Error: Update payload must be a non-null object.');
    }
    if (Object.keys(data).length === 0) {
      throw new Error('QueryHelper Error: Update payload cannot be an empty object.');
    }

    const active = this._ensureActiveQuery({ queryType: 'UPDATE' });
    active._queryType = 'UPDATE';
    active._knexQuery = active._knexQuery.update(data).returning('*');
    return active;
  }

  /**
   * Configures a DELETE mutation. Appends returning('*') for PostgreSQL.
   */
  delete() {
    this._assertCanSetQueryType('DELETE');
    const active = this._ensureActiveQuery({ queryType: 'DELETE' });
    active._queryType = 'DELETE';
    active._knexQuery = active._knexQuery.del().returning('*');
    return active;
  }

  del() {
    return this.delete();
  }

  /**
   * Internal validator for WHERE operator and value.
   */
  _validateCondition(column, operator, value, isOr = false) {
    if (typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name must be a non-empty string.');
    }

    if (value === undefined) {
      throw new Error(`QueryHelper Error: Column "${column}" cannot have an undefined value in where clause.`);
    }

    if (value === null) {
      throw new Error(`QueryHelper Error: Ambiguous null comparison for column "${column}". Use .whereNull("${column}") or .whereNotNull("${column}") instead.`);
    }

    if (operator === undefined || operator === null) {
      throw new Error(`QueryHelper Error: Operator cannot be undefined or null in where clause for column "${column}".`);
    }

    const rawOp = String(operator).trim().toLowerCase();
    const resolvedOp = OPERATOR_ALIASES[rawOp] || rawOp;

    if (resolvedOp === 'in' || resolvedOp === 'not in') {
      throw new Error(`QueryHelper Error: Operator "${operator}" is not allowed in .where(). Use .whereIn() or .whereNotIn() instead.`);
    }

    if (resolvedOp === 'between' || resolvedOp === 'not between') {
      throw new Error(`QueryHelper Error: Operator "${operator}" is not allowed in .where(). Use .whereBetween() instead.`);
    }

    if (resolvedOp === 'is' || resolvedOp === 'is not') {
      throw new Error(`QueryHelper Error: Operator "${operator}" is not supported. Use .whereNull() or .whereNotNull() instead.`);
    }

    if (!SCALAR_OPERATORS.has(resolvedOp)) {
      throw new Error(`QueryHelper Error: Unsupported operator "${operator}" in where clause.`);
    }

    return { resolvedOp, value };
  }

  /**
   * Adds a WHERE condition.
   * Supported:
   *   .where(column, operator, value)
   *   .where(column, value) [defaults operator to '=']
   *   .where(function(builder) { ... })
   */
  where(...args) {
    const active = this._ensureActiveQuery();

    if (args.length === 1 && typeof args[0] === 'function') {
      active._knexQuery = active._knexQuery.where(args[0]);
      return active;
    }

    if (args.length === 1 && typeof args[0] === 'string') {
      throw new Error('QueryHelper Error: One-argument string WHERE is prohibited. Use .where(col, val), .where(col, op, val), or .whereRaw(sql, bindings).');
    }

    let column = args[0];
    let operator = args[1];
    let value = args[2];

    if (args.length === 2) {
      operator = '=';
      value = args[1];
    }

    const { resolvedOp, value: actualVal } = this._validateCondition(column, operator, value, false);
    active._knexQuery = active._knexQuery.where(column, resolvedOp, actualVal);
    return active;
  }

  and(...args) {
    return this.where(...args);
  }

  or(...args) {
    const active = this._ensureActiveQuery();

    if (args.length === 1 && typeof args[0] === 'function') {
      active._knexQuery = active._knexQuery.orWhere(args[0]);
      return active;
    }

    if (args.length === 1 && typeof args[0] === 'string') {
      throw new Error('QueryHelper Error: One-argument string OR WHERE is prohibited. Use .or(col, val) or .orWhereRaw(sql, bindings).');
    }

    let column = args[0];
    let operator = args[1];
    let value = args[2];

    if (args.length === 2) {
      operator = '=';
      value = args[1];
    }

    const { resolvedOp, value: actualVal } = this._validateCondition(column, operator, value, true);
    active._knexQuery = active._knexQuery.orWhere(column, resolvedOp, actualVal);
    return active;
  }

  orWhere(...args) {
    return this.or(...args);
  }

  whereRaw(sql, bindings = []) {
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      throw new Error('QueryHelper Error: Parameterized SQL string required for whereRaw.');
    }
    if (!Array.isArray(bindings)) {
      throw new Error('QueryHelper Error: Bindings for whereRaw must be an array.');
    }
    if (bindings.some((b) => b === undefined)) {
      throw new Error('QueryHelper Error: Bindings for whereRaw cannot contain undefined values.');
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.whereRaw(sql, bindings);
    return active;
  }

  orWhereRaw(sql, bindings = []) {
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      throw new Error('QueryHelper Error: Parameterized SQL string required for orWhereRaw.');
    }
    if (!Array.isArray(bindings)) {
      throw new Error('QueryHelper Error: Bindings for orWhereRaw must be an array.');
    }
    if (bindings.some((b) => b === undefined)) {
      throw new Error('QueryHelper Error: Bindings for orWhereRaw cannot contain undefined values.');
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.orWhereRaw(sql, bindings);
    return active;
  }

  whereIn(column, values) {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for whereIn.');
    }
    if (!Array.isArray(values)) {
      throw new Error(`QueryHelper Error: Values for whereIn on column "${column}" must be an array.`);
    }
    if (values.some((v) => v === undefined)) {
      throw new Error(`QueryHelper Error: Values for whereIn on column "${column}" cannot contain undefined elements.`);
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.whereIn(column, values);
    return active;
  }

  orWhereIn(column, values) {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for orWhereIn.');
    }
    if (!Array.isArray(values)) {
      throw new Error(`QueryHelper Error: Values for orWhereIn on column "${column}" must be an array.`);
    }
    if (values.some((v) => v === undefined)) {
      throw new Error(`QueryHelper Error: Values for orWhereIn on column "${column}" cannot contain undefined elements.`);
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.orWhereIn(column, values);
    return active;
  }

  whereNotIn(column, values) {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for whereNotIn.');
    }
    if (!Array.isArray(values)) {
      throw new Error(`QueryHelper Error: Values for whereNotIn on column "${column}" must be an array.`);
    }
    if (values.some((v) => v === undefined)) {
      throw new Error(`QueryHelper Error: Values for whereNotIn on column "${column}" cannot contain undefined elements.`);
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.whereNotIn(column, values);
    return active;
  }

  orWhereNotIn(column, values) {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for orWhereNotIn.');
    }
    if (!Array.isArray(values)) {
      throw new Error(`QueryHelper Error: Values for orWhereNotIn on column "${column}" must be an array.`);
    }
    if (values.some((v) => v === undefined)) {
      throw new Error(`QueryHelper Error: Values for orWhereNotIn on column "${column}" cannot contain undefined elements.`);
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.orWhereNotIn(column, values);
    return active;
  }

  whereBetween(column, range) {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for whereBetween.');
    }
    if (!Array.isArray(range) || range.length !== 2) {
      throw new Error(`QueryHelper Error: Range for whereBetween on column "${column}" must be an array of [min, max].`);
    }
    if (range[0] === undefined || range[1] === undefined) {
      throw new Error(`QueryHelper Error: Range for whereBetween on column "${column}" cannot contain undefined bounds.`);
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.whereBetween(column, range);
    return active;
  }

  orWhereBetween(column, range) {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for orWhereBetween.');
    }
    if (!Array.isArray(range) || range.length !== 2) {
      throw new Error(`QueryHelper Error: Range for orWhereBetween on column "${column}" must be an array of [min, max].`);
    }
    if (range[0] === undefined || range[1] === undefined) {
      throw new Error(`QueryHelper Error: Range for orWhereBetween on column "${column}" cannot contain undefined bounds.`);
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.orWhereBetween(column, range);
    return active;
  }

  whereNull(column) {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for whereNull.');
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.whereNull(column.trim());
    return active;
  }

  orWhereNull(column) {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for orWhereNull.');
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.orWhereNull(column.trim());
    return active;
  }

  whereNotNull(column) {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for whereNotNull.');
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.whereNotNull(column.trim());
    return active;
  }

  orWhereNotNull(column) {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for orWhereNotNull.');
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.orWhereNotNull(column.trim());
    return active;
  }

  join(table, first, operatorOrSecond, second) {
    this._validateIdentifier(table, 'Join table');
    if (typeof first !== 'string' || !first.trim()) {
      throw new Error('QueryHelper Error: First column required for join.');
    }
    if (typeof operatorOrSecond !== 'string' || !operatorOrSecond.trim()) {
      throw new Error('QueryHelper Error: Second column or operator required for join.');
    }
    if (second !== undefined && (typeof second !== 'string' || !second.trim())) {
      throw new Error('QueryHelper Error: Second column required for join when operator is specified.');
    }

    const active = this._ensureActiveQuery();
    if (second !== undefined) {
      active._knexQuery = active._knexQuery.innerJoin(table, first, operatorOrSecond, second);
    } else {
      active._knexQuery = active._knexQuery.innerJoin(table, first, operatorOrSecond);
    }
    return active;
  }

  innerJoin(table, first, operatorOrSecond, second) {
    return this.join(table, first, operatorOrSecond, second);
  }

  leftJoin(table, first, operatorOrSecond, second) {
    this._validateIdentifier(table, 'Join table');
    if (typeof first !== 'string' || !first.trim()) {
      throw new Error('QueryHelper Error: First column required for leftJoin.');
    }
    if (typeof operatorOrSecond !== 'string' || !operatorOrSecond.trim()) {
      throw new Error('QueryHelper Error: Second column or operator required for leftJoin.');
    }
    if (second !== undefined && (typeof second !== 'string' || !second.trim())) {
      throw new Error('QueryHelper Error: Second column required for leftJoin when operator is specified.');
    }

    const active = this._ensureActiveQuery();
    if (second !== undefined) {
      active._knexQuery = active._knexQuery.leftJoin(table, first, operatorOrSecond, second);
    } else {
      active._knexQuery = active._knexQuery.leftJoin(table, first, operatorOrSecond);
    }
    return active;
  }

  joinRaw(sql, bindings = []) {
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      throw new Error('QueryHelper Error: Parameterized SQL string required for joinRaw.');
    }
    if (!Array.isArray(bindings)) {
      throw new Error('QueryHelper Error: Bindings for joinRaw must be an array.');
    }
    if (bindings.some((b) => b === undefined)) {
      throw new Error('QueryHelper Error: Bindings for joinRaw cannot contain undefined values.');
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.joinRaw(sql, bindings);
    return active;
  }

  groupBy(...columns) {
    if (columns.length === 0) {
      throw new Error('QueryHelper Error: .groupBy() requires at least one column.');
    }
    for (const col of columns) {
      if (typeof col !== 'string' || !col.trim()) {
        throw new Error('QueryHelper Error: .groupBy() columns must be non-empty strings.');
      }
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.groupBy(...columns);
    return active;
  }

  having(column, operator, value) {
    if (typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column required for having.');
    }
    const { resolvedOp, value: actualVal } = this._validateCondition(column, operator, value, false);
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.having(column, resolvedOp, actualVal);
    return active;
  }

  havingRaw(sql, bindings = []) {
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      throw new Error('QueryHelper Error: Parameterized SQL string required for havingRaw.');
    }
    if (!Array.isArray(bindings)) {
      throw new Error('QueryHelper Error: Bindings for havingRaw must be an array.');
    }
    if (bindings.some((b) => b === undefined)) {
      throw new Error('QueryHelper Error: Bindings for havingRaw cannot contain undefined values.');
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.havingRaw(sql, bindings);
    return active;
  }

  orderBy(column, direction = 'asc') {
    if (!column || typeof column !== 'string' || !column.trim()) {
      throw new Error('QueryHelper Error: Column name required for orderBy.');
    }

    if (typeof direction !== 'string') {
      throw new Error(`QueryHelper Error: Invalid orderBy direction "${direction}". Expected "asc" or "desc".`);
    }

    const dir = direction.trim().toLowerCase();
    if (dir !== 'asc' && dir !== 'desc') {
      throw new Error(`QueryHelper Error: Invalid orderBy direction "${direction}". Expected "asc" or "desc".`);
    }

    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.orderBy(column.trim(), dir);
    return active;
  }

  limit(count) {
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new Error(`QueryHelper Error: Limit must be a non-negative integer (safe integer >= 0), received ${count}.`);
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.limit(count);
    return active;
  }

  offset(count) {
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new Error(`QueryHelper Error: Offset must be a non-negative integer (safe integer >= 0), received ${count}.`);
    }
    const active = this._ensureActiveQuery();
    active._knexQuery = active._knexQuery.offset(count);
    return active;
  }

  /**
   * Compiles and returns the constructed Knex query builder.
   * Requires explicit field selection for SELECT queries.
   * Throws if called on an uninitialized table definition or incomplete query chain.
   */
  build() {
    if (!this._knexQuery) {
      throw new Error('QueryHelper Error: No query has been initialized. Call .select(), .insert(), .update(), or .delete() first.');
    }

    if (this._queryType === 'SELECT') {
      if (this._selectedFields.length === 0) {
        throw new Error('QueryHelper Error: SELECT query requires at least one field selected via .field() or .fields().');
      }
    } else if (!this._queryType) {
      throw new Error('QueryHelper Error: Incomplete query chain. You must specify a query type by calling .select(), .update(), or .delete().');
    }

    return this._knexQuery;
  }

  toSQL() {
    return this.build().toSQL();
  }

  toQuery() {
    return this.build().toQuery();
  }

  get knex() {
    return this._getKnex();
  }
}

module.exports = QueryHelper;
