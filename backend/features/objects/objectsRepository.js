const BaseRepository = require('../../base/baseRepository');

class ObjectsRepository extends BaseRepository {
  async listObjects(createdBy) {
    return await this.queryHelper
      .from('sph_object')
      .where('created_by', 'eq', createdBy)
      .where('archived_at', 'is', null)
      .orderBy('created_at', false)
      .execute();
  }

  async getObjectByUuid(uuid, createdBy) {
    const results = await this.queryHelper
      .from('sph_object')
      .where('uuid', 'eq', uuid)
      .where('created_by', 'eq', createdBy)
      .where('archived_at', 'is', null)
      .execute();
    return results[0] || null;
  }

  async getObjectBySlug(slug) {
    const results = await this.queryHelper
      .from('sph_object')
      .where('object_slug', 'eq', slug)
      .where('archived_at', 'is', null)
      .execute();
    return results[0] || null;
  }

  async createObject(data) {
    const result = await this.queryHelper
      .from('sph_object')
      .insert(data)
      .execute();

    // Create dynamic tables
    const safeSlug = data.object_slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const prefix = safeSlug.startsWith('sph_object_') ? safeSlug : `sph_object_${safeSlug}`;
    const fieldsTable = `${prefix}_fields`;
    const templatesTable = `${prefix}_templates`;
    const recordTable = `${prefix}_record`;

    await this.queryHelper.db.raw(`
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

    await this.queryHelper.db.raw(`
      CREATE TABLE IF NOT EXISTS ?? (
          uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          "jsonBuilderConfig" JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          archived_at TIMESTAMP WITH TIME ZONE
      );
    `, [templatesTable]);

    await this.queryHelper.db.raw(`
      CREATE TABLE IF NOT EXISTS ?? (
          uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          record_data JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, [recordTable]);

    return result[0];
  }

  async updateObject(uuid, createdBy, data) {
    data.updated_at = new Date();
    const result = await this.queryHelper
      .from('sph_object')
      .where('uuid', 'eq', uuid)
      .where('created_by', 'eq', createdBy)
      .update(data)
      .execute();
    return result[0];
  }

  async deleteObject(uuid, createdBy) {
    const object = await this.getObjectByUuid(uuid, createdBy);
    if (!object) return null;

    // Drop dynamic tables
    const safeSlug = object.object_slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const prefix = safeSlug.startsWith('sph_object_') ? safeSlug : `sph_object_${safeSlug}`;
    await this.queryHelper.db.raw('DROP TABLE IF EXISTS ?? CASCADE', [`${prefix}_record`]);
    await this.queryHelper.db.raw('DROP TABLE IF EXISTS ?? CASCADE', [`${prefix}_template_fields`]);
    await this.queryHelper.db.raw('DROP TABLE IF EXISTS ?? CASCADE', [`${prefix}_templates`]);
    await this.queryHelper.db.raw('DROP TABLE IF EXISTS ?? CASCADE', [`${prefix}_fields`]);

    const result = await this.queryHelper
      .from('sph_object')
      .where('uuid', 'eq', uuid)
      .where('created_by', 'eq', createdBy)
      .delete()
      .execute();
    return result[0];
  }

  // --- Fields (Dynamic Tables) ---

  async _getPrefixByObjectUuid(objectUuid) {
    const objectResults = await this.queryHelper
      .from('sph_object')
      .where('uuid', 'eq', objectUuid)
      .execute();
    if (objectResults.length === 0) throw new Error('Object not found');
    const slug = objectResults[0].object_slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return slug.startsWith('sph_object_') ? slug : `sph_object_${slug}`;
  }

  async listFields(objectUuid) {
    try {
      const prefix = await this._getPrefixByObjectUuid(objectUuid);
      try {
        return await this.queryHelper
          .from(`${prefix}_fields`)
          .where('archived_at', 'is', null)
          .orderBy('display_order', true)
          .execute();
      } catch (e) {
        return await this.queryHelper
          .from(`${prefix}_fields`)
          .where('archived_at', 'is', null)
          .orderBy('created_at', true)
          .execute();
      }
    } catch (e) {
      return [];
    }
  }

  async getFieldByUuid(objectUuid, uuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const results = await this.queryHelper
      .from(`${prefix}_fields`)
      .where('uuid', 'eq', uuid)
      .execute();
    return results[0] || null;
  }

  async _ensureDisplayOrderColumn(tableName) {
    try {
      await this.queryHelper.db.raw(`
        ALTER TABLE ?? ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0
      `, [tableName]);
    } catch (e) {
      // Ignore
    }
  }

  async createField(objectUuid, data) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const tableName = `${prefix}_fields`;
    await this._ensureDisplayOrderColumn(tableName);

    const { object_uuid, ...fieldData } = data;

    const result = await this.queryHelper
      .from(tableName)
      .insert(fieldData)
      .execute();
    return result[0];
  }

  async updateField(objectUuid, uuid, data) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const tableName = `${prefix}_fields`;
    await this._ensureDisplayOrderColumn(tableName);

    data.updated_at = new Date();

    const result = await this.queryHelper
      .from(tableName)
      .where('uuid', 'eq', uuid)
      .update(data)
      .execute();
    return result[0];
  }

  async deleteField(objectUuid, uuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const result = await this.queryHelper
      .from(`${prefix}_fields`)
      .where('uuid', 'eq', uuid)
      .delete()
      .execute();
    return result[0];
  }

  // --- Templates ---

  async listTemplates(objectUuid) {
    try {
      const prefix = await this._getPrefixByObjectUuid(objectUuid);
      const tableName = `${prefix}_templates`;

      return await this.queryHelper
        .from(tableName)
        .where('archived_at', 'is', null)
        .orderBy('created_at', false)
        .execute();
    } catch (e) { return []; }
  }

  async getActiveTemplate(objectUuid) {
    try {
      const prefix = await this._getPrefixByObjectUuid(objectUuid);
      const tableName = `${prefix}_templates`;

      const results = await this.queryHelper
        .from(tableName)
        .where('is_active', 'eq', true)
        .where('archived_at', 'is', null)
        .execute();
      return results[0] || null;
    } catch (e) { return null; }
  }

  async getTemplateByUuid(objectUuid, uuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const tableName = `${prefix}_templates`;

    const results = await this.queryHelper
      .from(tableName)
      .where('uuid', 'eq', uuid)
      .execute();
    return results[0] || null;
  }

  async createTemplate(objectUuid, data) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const tableName = `${prefix}_templates`;

    const { object_uuid, ...templateData } = data;

    const result = await this.queryHelper
      .from(tableName)
      .insert(templateData)
      .execute();
    return result[0];
  }

  async updateTemplate(objectUuid, uuid, data) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const tableName = `${prefix}_templates`;

    data.updated_at = new Date();
    const result = await this.queryHelper
      .from(tableName)
      .where('uuid', 'eq', uuid)
      .update(data)
      .execute();
    return result[0];
  }

  async deleteTemplate(objectUuid, uuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const result = await this.queryHelper
      .from(`${prefix}_templates`)
      .where('uuid', 'eq', uuid)
      .delete()
      .execute();
    return result[0];
  }



  // --- Records ---
  async listRecords(objectUuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    return await this.queryHelper
      .from(`${prefix}_record`)
      .orderBy('created_at', false)
      .execute();
  }

  async countEmptyRecordsForField(objectUuid, fieldName) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const table = `${prefix}_record`;
    const result = await this.queryHelper.db.raw(`
      SELECT COUNT(*) AS count FROM ??
      WHERE (record_data->>?) IS NULL
         OR TRIM((record_data->>?)) = ''
    `, [table, fieldName, fieldName]);
    return parseInt(result.rows[0]?.count || 0, 10);
  }

  async createRecord(objectUuid, recordData) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const result = await this.queryHelper
      .from(`${prefix}_record`)
      .insert({ record_data: JSON.stringify(recordData) })
      .execute();
    return result[0];
  }

  async updateRecord(objectUuid, recordUuid, recordData) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const result = await this.queryHelper
      .from(`${prefix}_record`)
      .where('uuid', 'eq', recordUuid)
      .update({ record_data: JSON.stringify(recordData), updated_at: new Date() })
      .execute();
    return result[0];
  }

  async deleteRecord(objectUuid, recordUuid) {
    const prefix = await this._getPrefixByObjectUuid(objectUuid);
    const result = await this.queryHelper
      .from(`${prefix}_record`)
      .where('uuid', 'eq', recordUuid)
      .delete()
      .execute();
    return result[0];
  }
}

module.exports = ObjectsRepository;
