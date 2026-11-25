const BaseRepository = require('../../../base/baseRepository');
const QueryHelper = require('../../../database/queryHelper');

class EmailTemplateRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sql = new QueryHelper('sph_email_templates');
    this.sqlLogs = new QueryHelper('sph_email_logs');
  }

  async getAllTemplates() {
    const query = this.sql.select().field('*').orderBy('created_at', 'desc');
    return this.runQuery(query);
  }

  async getTemplateByUuid(uuid) {
    const query = this.sql.select().field('*').where('uuid', '=', uuid);
    return this.runQueryFirst(query);
  }

  async getTemplateByKey(key) {
    const query = this.sql.select().field('*').where('template_key', '=', key);
    return this.runQueryFirst(query);
  }

  async createTemplate(data) {
    const query = this.sql.insert(data);
    return this.execute(query);
  }

  async updateTemplate(uuid, data) {
    data.updated_at = new Date().toISOString();
    const query = this.sql.update(data).where('uuid', '=', uuid);
    return this.execute(query);
  }

  async getEmailLogs(page = 1, limit = 10, search = '') {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const countQuery = this.sqlLogs.count('*', 'total');
    if (search) {
      const searchPattern = `%${search}%`;
      countQuery.whereRaw('(recipient ILIKE ? OR subject ILIKE ? OR template_key ILIKE ?)', [searchPattern, searchPattern, searchPattern]);
    }
    const countRow = await this.runQueryFirst(countQuery);
    const total = countRow ? parseInt(countRow.total || 0, 10) : 0;

    const dataQuery = this.sqlLogs
      .select()
      .field('*')
      .orderBy('created_at', 'desc')
      .limit(limitNum)
      .offset(offset);

    if (search) {
      const searchPattern = `%${search}%`;
      dataQuery.whereRaw('(recipient ILIKE ? OR subject ILIKE ? OR template_key ILIKE ?)', [searchPattern, searchPattern, searchPattern]);
    }
    const logs = await this.runQuery(dataQuery);

    return {
      data: logs,
      total,
      page: pageNum,
      limit: limitNum
    };
  }

  async getLinkedWorkflows(_templateKey) {
    return [];
  }

  async deleteTemplate(uuid) {
    const query = this.sql.delete().where('uuid', '=', uuid);
    return this.execute(query);
  }

  async getTableColumns(tableName) {
    const ALLOWED_PREFIXES = ['sph_', 'users', 'user_'];
    const isAllowed = ALLOWED_PREFIXES.some(prefix => tableName.startsWith(prefix));
    if (!isAllowed) {
      const err = new Error(`Table '${tableName}' is not allowed for column introspection.`);
      err.statusCode = 403;
      throw err;
    }

    const rows = await this.queryRaw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = ?
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);
    return rows.map(r => r.column_name);
  }
}

module.exports = EmailTemplateRepository;
