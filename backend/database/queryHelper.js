const { createClient } = require('@supabase/supabase-js');

/**
 * queryHelper.js
 * Central database abstraction layer.
 * 
 * ALL database access MUST go through this class via the execute() method.
 * Feature repositories MUST NOT import or use @supabase/supabase-js directly.
 */
class QueryHelper {
  constructor() {
    // Rely on environment variables being validated at startup
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Database Initialization Error: Missing Supabase credentials in environment.');
    }

    // Initialize the client privately inside the helper
    this._client = createClient(supabaseUrl, supabaseKey);
    
    // Query builder state
    this._resetState();
  }

  /**
   * Resets the builder state for the next query.
   */
  _resetState() {
    this._table = null;
    this._action = null; // 'select', 'insert', 'update', 'delete'
    this._payload = null;
    this._filters = [];
    this._orderBy = null;
    this._limit = null;
  }

  // --- Query Builder Methods ---

  from(table) {
    this._table = table;
    return this;
  }

  select(columns = '*') {
    this._action = 'select';
    this._payload = columns;
    return this;
  }

  insert(data) {
    this._action = 'insert';
    this._payload = data;
    return this;
  }

  update(data) {
    this._action = 'update';
    this._payload = data;
    return this;
  }

  delete() {
    this._action = 'delete';
    return this;
  }

  where(column, operator, value) {
    this._filters.push({ method: operator, column, value });
    return this;
  }

  orderBy(column, ascending = true) {
    this._orderBy = { column, ascending };
    return this;
  }

  limit(count) {
    this._limit = count;
    return this;
  }

  // --- Query Execution ---

  /**
   * Executes the constructed query against the Supabase database.
   * Handles errors without leaking credentials.
   */
  async execute() {
    if (!this._table || !this._action) {
      this._resetState();
      throw new Error('Query execution failed: Incomplete query structure.');
    }

    try {
      let query = this._client.from(this._table);

      // Apply primary action
      if (this._action === 'select') {
        query = query.select(this._payload);
      } else if (this._action === 'insert') {
        query = query.insert(this._payload);
      } else if (this._action === 'update') {
        query = query.update(this._payload);
      } else if (this._action === 'delete') {
        query = query.delete();
      }

      // Apply filters (e.g., eq, neq, gt, in)
      for (const filter of this._filters) {
        if (typeof query[filter.method] === 'function') {
          query = query[filter.method](filter.column, filter.value);
        } else {
          // Default to eq if an unknown or simplified operator was passed
          query = query.eq(filter.column, filter.value);
        }
      }

      // Apply modifiers
      if (this._orderBy) {
        query = query.order(this._orderBy.column, { ascending: this._orderBy.ascending });
      }

      if (this._limit) {
        query = query.limit(this._limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error; // Caught by the try-catch block below
      }

      this._resetState();
      return data;
    } catch (error) {
      this._resetState();
      // Log the error securely on the backend without leaking DB URL or Keys
      console.error(`[Database Error] action: ${this._action}, table: ${this._table} | Code: ${error.code} | Message: ${error.message}`);
      
      // Throw a generic exception to the calling repository/service
      throw new Error('A database error occurred during execution.');
    }
  }
}

module.exports = QueryHelper;
