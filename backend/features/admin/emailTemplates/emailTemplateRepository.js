const BaseRepository = require('../../../base/baseRepository');

class EmailTemplateRepository extends BaseRepository {
  async getAllTemplates() {
    return await this.queryHelper.from('sph_email_templates')
      .select('*')
      .orderBy('created_at', false)
      .execute();
  }

  async getTemplateByUuid(uuid) {
    const result = await this.queryHelper.from('sph_email_templates')
      .select('*')
      .where('uuid', 'eq', uuid)
      .execute();
    return result[0] || null;
  }

  async getTemplateByKey(key) {
    const result = await this.queryHelper.from('sph_email_templates')
      .select('*')
      .where('template_key', 'eq', key)
      .execute();
    return result[0] || null;
  }

  async createTemplate(data) {
    return await this.queryHelper.from('sph_email_templates')
      .insert(data)
      .execute();
  }

  async updateTemplate(uuid, data) {
    data.updated_at = new Date().toISOString();
    return await this.queryHelper.from('sph_email_templates')
      .where('uuid', 'eq', uuid)
      .update(data)
      .execute();
  }

  async getEmailLogs() {
    return await this.queryHelper.from('sph_email_logs')
      .select('*')
      .orderBy('created_at', false)
      .limit(100)
      .execute();
  }

  async getLinkedWorkflows(_templateKey) {
    // Workflows have been removed from the system. Templates can always be deleted.
    return [];
  }

  async deleteTemplate(uuid) {
    return await this.queryHelper.from('sph_email_templates')
      .where('uuid', 'eq', uuid)
      .del()
      .execute();
  }

  async getTableColumns(tableName) {
    // Security: only allow tables with the sph_ prefix (or core user tables) to prevent arbitrary introspection
    const ALLOWED_PREFIXES = ['sph_', 'users', 'user_'];
    const isAllowed = ALLOWED_PREFIXES.some(prefix => tableName.startsWith(prefix));
    if (!isAllowed) {
      const err = new Error(`Table '${tableName}' is not allowed for column introspection.`);
      err.statusCode = 403;
      throw err;
    }

    const result = await this.queryHelper.db.raw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = ?
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);
    return result.rows.map(r => r.column_name);
  }
}

module.exports = EmailTemplateRepository;
