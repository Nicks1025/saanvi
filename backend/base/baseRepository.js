const QueryHelper = require('../database/queryHelper');

/**
 * BaseRepository
 * 
 * Provides common repository functionality.
 * All feature repositories MUST extend this class.
 * NO repository is allowed to directly import @supabase/supabase-js.
 */
class BaseRepository {
  constructor() {
    // Initialize the central QueryHelper for database interactions
    this.queryHelper = new QueryHelper();
  }

  // Common repository utilities can go here.
  // E.g., generalized pagination wrappers using this.queryHelper
}

module.exports = BaseRepository;
