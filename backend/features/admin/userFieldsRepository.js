const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

/**
 * UserFieldsRepository
 * Owns all database operations for user_details schema extensions
 * and sph_user_fields metadata following Sofy conventions.
 */
class UserFieldsRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sql = new QueryHelper('sph_user_fields');
  }

  async getAllFields() {
    const query = this.sql
      .select()
      .field('*')
      .orderBy('display_order', 'asc');
    return this.runQuery(query);
  }

  async getPublicFieldsByContext(context = 'signup') {
    const query = this.sql
      .select()
      .field('*')
      .where('is_active', '=', true)
      .orderBy('display_order', 'asc');

    if (context === 'signup') {
      query.where('show_on_signup', '=', true);
    } else if (context === 'admin_create') {
      query.where('show_on_admin_create', '=', true);
    }

    return this.runQuery(query);
  }

  async getFieldByName(fieldName) {
    const query = this.sql
      .select()
      .field('*')
      .where('field_name', '=', fieldName);
    return this.runQueryFirst(query);
  }

  async getFieldById(id) {
    const query = this.sql
      .select()
      .field('*')
      .where('id', '=', id);
    return this.runQueryFirst(query);
  }

  async createFieldRecord(id, fieldData, pgType) {
    await this.dbDriver.transaction(async (trx) => {
      // Safely alter user_details table
      await trx.raw(`ALTER TABLE user_details ADD COLUMN "${fieldData.field_name}" ${pgType}`);

      // Insert metadata
      await trx('sph_user_fields').insert({
        id,
        field_name: fieldData.field_name,
        label: fieldData.label,
        field_type: fieldData.field_type,
        is_system: false,
        is_required: fieldData.is_required || false,
        is_active: fieldData.is_active !== false,
        show_on_signup: fieldData.show_on_signup || false,
        show_on_admin_create: fieldData.show_on_admin_create || false,
        display_order: fieldData.display_order || 0,
        options_config: fieldData.options_config ? JSON.stringify(fieldData.options_config) : null,
        validation_config: fieldData.validation_config ? JSON.stringify(fieldData.validation_config) : null
      });
    });

    return await this.getFieldById(id);
  }

  async updateFieldRecord(id, updates) {
    const query = this.sql
      .where('id', '=', id)
      .update(updates);
    await this.execute(query);

    return await this.getFieldById(id);
  }

  async deleteFieldRecord(id, fieldName) {
    await this.dbDriver.transaction(async (trx) => {
      await trx.raw(`ALTER TABLE user_details DROP COLUMN "${fieldName}"`);
      await trx('sph_user_fields').where('id', id).del();
    });
  }

  async bulkSaveFields(updatesList, deletedIds = []) {
    await this.dbDriver.transaction(async (trx) => {
      // 1. Process deletions
      for (const id of deletedIds) {
        const existing = await trx('sph_user_fields').where('id', id).first();
        if (existing && !existing.is_system) {
          await trx.raw(`ALTER TABLE user_details DROP COLUMN "${existing.field_name}"`);
          await trx('sph_user_fields').where('id', id).del();
        }
      }

      // 2. Process updates
      for (const item of updatesList) {
        await trx('sph_user_fields')
          .where('id', item.id)
          .update({
            label: item.label,
            is_required: item.is_required,
            is_active: item.is_active,
            show_on_signup: item.show_on_signup,
            show_on_admin_create: item.show_on_admin_create,
            display_order: item.display_order,
            options_config: item.options_config ? JSON.stringify(item.options_config) : null,
            validation_config: item.validation_config ? JSON.stringify(item.validation_config) : null,
            updated_at: new Date()
          });
      }
    });

    return await this.getAllFields();
  }
}

module.exports = UserFieldsRepository;
