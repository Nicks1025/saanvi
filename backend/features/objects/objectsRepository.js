const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

class ObjectsRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sql = new QueryHelper('sph_object');
  }

  async listObjects(createdBy) {
    const query = this.sql
      .select()
      .field('*')
      .where('created_by', '=', createdBy)
      .whereNull('archived_at')
      .orderBy('created_at', 'desc');

    return this.runQuery(query);
  }

  async getObjectByUuid(uuid, createdBy) {
    const query = this.sql
      .select()
      .field('*')
      .where('uuid', '=', uuid)
      .whereNull('archived_at');

    if (createdBy) {
      query.where('created_by', '=', createdBy);
    }

    return this.runQueryFirst(query);
  }

  async getObjectBySlug(slug) {
    const query = this.sql
      .select()
      .field('*')
      .where('object_slug', '=', slug)
      .whereNull('archived_at');

    return this.runQueryFirst(query);
  }

  async createObject(data) {
    const query = this.sql.insert(data);
    const result = await this.execute(query);
    const createdObject = result.rows[0];

    // Create dynamic tables
    const safeSlug = data.object_slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const prefix = safeSlug.startsWith('sph_object_') ? safeSlug : `sph_object_${safeSlug}`;
    const fieldsTable = `${prefix}_fields`;
    const templatesTable = `${prefix}_templates`;
    const recordTable = `${prefix}_record`;

    await this.queryRaw(`
      CREATE TABLE IF NOT EXISTS ?? (
          uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          field_name VARCHAR(100) NOT NULL UNIQUE,
          label VARCHAR(255) NOT NULL,
          field_type VARCHAR(50) NOT NULL,
          placeholder VARCHAR(255),
          default_value TEXT,
          is_required BOOLEAN DEFAULT false,
          validation_rules JSONB,
          options JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          archived_at TIMESTAMP WITH TIME ZONE
      );
    `, [fieldsTable]);

    await this.queryRaw(`
      CREATE TABLE IF NOT EXISTS ?? (
          uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          "jsonBuilderConfig" JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          archived_at TIMESTAMP WITH TIME ZONE
      );
    `, [templatesTable]);

    await this.queryRaw(`
      CREATE TABLE IF NOT EXISTS ?? (
          uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          record_data JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, [recordTable]);

    return createdObject;
  }

  async updateObject(uuid, createdBy, data) {
    data.updated_at = new Date();
    const query = this.sql
      .update(data)
      .where('uuid', '=', uuid);

    if (createdBy) {
      query.where('created_by', '=', createdBy);
    }

    const result = await this.execute(query);
    return result.rows[0];
  }

  async deleteObject(uuid, createdBy) {
    const object = await this.getObjectByUuid(uuid, createdBy);
    if (!object) return null;

    // Drop dynamic tables
    const safeSlug = object.object_slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const prefix = safeSlug.startsWith('sph_object_') ? safeSlug : `sph_object_${safeSlug}`;

    await this.queryRaw('DROP TABLE IF EXISTS ?? CASCADE', [`${prefix}_record`]);
    await this.queryRaw('DROP TABLE IF EXISTS ?? CASCADE', [`${prefix}_template_fields`]);
    await this.queryRaw('DROP TABLE IF EXISTS ?? CASCADE', [`${prefix}_templates`]);
    await this.queryRaw('DROP TABLE IF EXISTS ?? CASCADE', [`${prefix}_fields`]);

    const query = this.sql
      .delete()
      .where('uuid', '=', uuid);

    if (createdBy) {
      query.where('created_by', '=', createdBy);
    }

    const result = await this.execute(query);
    return result.rows[0];
  }

  // --- Fields (Dynamic Tables) ---

  async _getPrefixByObjectUuid(objectUuid) {
    const query = this.sql
      .select()
      .field('object_slug')
      .where('uuid', '=', objectUuid);
    const object = await this.runQueryFirst(query);
    if (!object) throw new Error('Object not found');
    const slug = object.object_slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return slug.startsWith('sph_object_') ? slug : `sph_object_${slug}`;
  }

  async listFields(objectUuid) {
    try {
      const prefix = await this._getPrefixByObjectUuid(objectUuid);
      try {
        const query = new QueryHelper(`${prefix}_fields`)
          .select()
          .field('*')
          .whereNull('archived_at')
          .orderBy('display_order', 'asc');
        return await this.runQuery(query);
      } catch (e) {
        const fallbackQuery = new QueryHelper(`${prefix}_fields`)
          .select()
          .field('*')
          .whereNull('archived_at')
          .orderBy('created_at', 'asc');
        return await this.runQuery(fallbackQuery);
      }
    } catch (e) {
      return [];
    }
  }

  async getFieldByUuid(objectUuid, uuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const query = new QueryHelper(`${prefix}_fields`)
      .select()
      .field('*')
      .where('uuid', '=', uuid);
    return this.runQueryFirst(query);
  }

  async _ensureDisplayOrderColumn(tableName) {
    try {
      await this.queryRaw(`
        ALTER TABLE ?? ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0
      `, [tableName]);
    } catch (e) {
      // Ignore if column already exists
    }
  }

  async createField(objectUuid, data) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const tableName = `${prefix}_fields`;
    await this._ensureDisplayOrderColumn(tableName);

    const { object_uuid, ...fieldData } = data;
    const query = new QueryHelper(tableName).insert(fieldData);
    const result = await this.execute(query);
    return result.rows[0];
  }

  async updateField(objectUuid, uuid, data) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const tableName = `${prefix}_fields`;
    await this._ensureDisplayOrderColumn(tableName);

    data.updated_at = new Date();
    const query = new QueryHelper(tableName)
      .update(data)
      .where('uuid', '=', uuid);
    const result = await this.execute(query);
    return result.rows[0];
  }

  async deleteField(objectUuid, uuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const query = new QueryHelper(`${prefix}_fields`)
      .delete()
      .where('uuid', '=', uuid);
    const result = await this.execute(query);
    return result.rows[0];
  }

  // --- Templates ---

  async listTemplates(objectUuid) {
    try {
      const prefix = await this._getPrefixByObjectUuid(objectUuid);
      const query = new QueryHelper(`${prefix}_templates`)
        .select()
        .field('*')
        .whereNull('archived_at')
        .orderBy('created_at', 'desc');
      return await this.runQuery(query);
    } catch (e) {
      return [];
    }
  }

  async getActiveTemplate(objectUuid) {
    try {
      const prefix = await this._getPrefixByObjectUuid(objectUuid);
      const query = new QueryHelper(`${prefix}_templates`)
        .select()
        .field('*')
        .where('is_active', '=', true)
        .whereNull('archived_at');
      return await this.runQueryFirst(query);
    } catch (e) {
      return null;
    }
  }

  async getTemplateByUuid(objectUuid, uuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const query = new QueryHelper(`${prefix}_templates`)
      .select()
      .field('*')
      .where('uuid', '=', uuid);
    return this.runQueryFirst(query);
  }

  async createTemplate(objectUuid, data) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const tableName = `${prefix}_templates`;
    const { object_uuid, ...templateData } = data;
    const query = new QueryHelper(tableName).insert(templateData);
    const result = await this.execute(query);
    return result.rows[0];
  }

  async updateTemplate(objectUuid, uuid, data) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const tableName = `${prefix}_templates`;

    data.updated_at = new Date();
    const query = new QueryHelper(tableName)
      .update(data)
      .where('uuid', '=', uuid);
    const result = await this.execute(query);
    return result.rows[0];
  }

  async deleteTemplate(objectUuid, uuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const query = new QueryHelper(`${prefix}_templates`)
      .delete()
      .where('uuid', '=', uuid);
    const result = await this.execute(query);
    return result.rows[0];
  }

  // --- Records ---
  async listRecords(objectUuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const query = new QueryHelper(`${prefix}_record`)
      .select()
      .field('*')
      .orderBy('created_at', 'desc');
    return this.runQuery(query);
  }

  async getRecordByUuid(objectUuid, recordUuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const query = new QueryHelper(`${prefix}_record`)
      .select()
      .field('*')
      .where('uuid', '=', recordUuid);
    return this.runQueryFirst(query);
  }

  async countRecords(objectUuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const table = `${prefix}_record`;
    const rows = await this.queryRaw(`SELECT COUNT(*) AS count FROM ??`, [table]);
    return parseInt(rows[0]?.count || 0, 10);
  }

  async countEmptyRecordsForField(objectUuid, fieldName) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const table = `${prefix}_record`;
    const rows = await this.queryRaw(`
      SELECT COUNT(*) AS count FROM ??
      WHERE (record_data->>?) IS NULL
         OR TRIM((record_data->>?)) = ''
    `, [table, fieldName, fieldName]);
    return parseInt(rows[0]?.count || 0, 10);
  }

  async createRecord(objectUuid, recordData) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const query = new QueryHelper(`${prefix}_record`)
      .insert({ record_data: JSON.stringify(recordData) });
    const result = await this.execute(query);
    return result.rows[0];
  }

  async updateRecord(objectUuid, recordUuid, recordData) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const query = new QueryHelper(`${prefix}_record`)
      .update({ record_data: JSON.stringify(recordData), updated_at: new Date() })
      .where('uuid', '=', recordUuid);
    const result = await this.execute(query);
    return result.rows[0];
  }

  async deleteRecord(objectUuid, recordUuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const query = new QueryHelper(`${prefix}_record`)
      .delete()
      .where('uuid', '=', recordUuid);
    const result = await this.execute(query);
    return result.rows[0];
  }
}

module.exports = ObjectsRepository;
