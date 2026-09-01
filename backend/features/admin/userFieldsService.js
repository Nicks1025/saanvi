const BaseService = require('../../base/baseService');

class UserFieldsService extends BaseService {
  constructor(repository) {
    super(repository);
  }

  async getAllFields() {
    return await this.repository.queryHelper
      .from('sph_user_fields')
      .orderBy('display_order', true)
      .execute();
  }

  async getPublicFormConfig(context = 'signup') {
    const query = this.repository.queryHelper
      .from('sph_user_fields')
      .where('is_active', 'eq', true)
      .orderBy('display_order', true);

    if (context === 'signup') {
      query.where('show_on_signup', 'eq', true);
    } else if (context === 'admin_create') {
      query.where('show_on_admin_create', 'eq', true);
    }

    return await query.execute();
  }

  async createField(data) {
    // 1. Validate field name (lowercase, alphanumeric + underscore)
    if (!/^[a-z][a-z0-9_]*$/.test(data.field_name)) {
      const err = new Error('Field name must start with a letter and contain only lowercase letters, numbers, and underscores.');
      err.statusCode = 400;
      throw err;
    }

    // 2. Map field_type to postgres type
    let pgType;
    switch (data.field_type) {
      case 'shorttext':
      case 'email':
      case 'phonenumber':
      case 'dropdown':
      case 'radio':
        pgType = 'VARCHAR(255)';
        break;
      case 'longtext':
      case 'fileupload':
        pgType = 'TEXT';
        break;
      case 'date':
        pgType = 'DATE';
        break;
      case 'number':
        pgType = 'NUMERIC';
        break;
      case 'checkbox':
        pgType = 'BOOLEAN';
        break;
      default:
        const err = new Error('Unsupported field type: ' + data.field_type);
        err.statusCode = 400;
        throw err;
    }

    // 3. Ensure uniqueness in metadata
    const existing = await this.repository.queryHelper
      .from('sph_user_fields')
      .where('field_name', 'eq', data.field_name)
      .execute();

    if (existing.length > 0) {
      const err = new Error('Field name already exists.');
      err.statusCode = 400;
      throw err;
    }

    const id = this.generateUuid();

    await this.repository.queryHelper.transaction(async (trx) => {
      // 4. Alter table safely
      // Identifier is validated by regex above, safe to interpolate
      await trx.raw(`ALTER TABLE user_details ADD COLUMN "${data.field_name}" ${pgType}`);

      // 5. Insert metadata
      await trx('sph_user_fields').insert({
        id,
        field_name: data.field_name,
        label: data.label,
        field_type: data.field_type,
        is_system: false,
        is_required: data.is_required || false,
        is_active: data.is_active !== false,
        show_on_signup: data.show_on_signup || false,
        show_on_admin_create: data.show_on_admin_create || false,
        display_order: data.display_order || 0,
        options_config: data.options_config ? JSON.stringify(data.options_config) : null,
        validation_config: data.validation_config ? JSON.stringify(data.validation_config) : null
      });
    });

    return await this.repository.queryHelper.from('sph_user_fields').where('id', 'eq', id).execute().then(res => res[0]);
  }

  async updateField(id, data) {
    const existing = await this.repository.queryHelper.from('sph_user_fields').where('id', 'eq', id).execute();
    if (!existing.length) {
      const err = new Error('Field not found');
      err.statusCode = 404;
      throw err;
    }

    const updates = {
      label: data.label,
      is_required: data.is_required,
      is_active: data.is_active,
      show_on_signup: data.show_on_signup,
      show_on_admin_create: data.show_on_admin_create,
      display_order: data.display_order,
      options_config: data.options_config ? JSON.stringify(data.options_config) : null,
      validation_config: data.validation_config ? JSON.stringify(data.validation_config) : null,
      updated_at: new Date()
    };

    await this.repository.queryHelper.from('sph_user_fields').where('id', 'eq', id).update(updates).execute();

    return await this.repository.queryHelper.from('sph_user_fields').where('id', 'eq', id).execute().then(res => res[0]);
  }

  async deleteField(id) {
    const existing = await this.repository.queryHelper.from('sph_user_fields').where('id', 'eq', id).execute();
    if (!existing.length) {
      const err = new Error('Field not found');
      err.statusCode = 404;
      throw err;
    }

    const field = existing[0];
    if (field.is_system) {
      const err = new Error('Cannot delete protected system field.');
      err.statusCode = 400;
      throw err;
    }

    // Check if used in workflows/triggers
    const triggers = await this.repository.queryHelper
      .from('sph_workflow_conditions')
      .where('field_path', 'eq', field.field_name)
      .execute();

    if (triggers.length > 0) {
      const err = new Error('This field cannot be deleted because it is used by one or more triggers/workflows.');
      err.statusCode = 400;
      throw err;
    }

    await this.repository.queryHelper.transaction(async (trx) => {
      // Safely drop column
      await trx.raw(`ALTER TABLE user_details DROP COLUMN "${field.field_name}"`);
      // Delete metadata
      await trx('sph_user_fields').where('id', id).del();
    });
  }

  async bulkSaveFields(fields, deletedFieldIds = []) {
    if (!Array.isArray(fields)) throw new Error('Expected an array of fields');

    const results = [];
    
    // First, process deletions
    for (const id of deletedFieldIds) {
      try {
        await this.deleteField(id);
      } catch (err) {
        console.error(`Failed to delete field ${id} during bulk save:`, err.message);
      }
    }

    // Run sequentially to prevent concurrent transaction issues with schema alterations
    let order = 0;
    for (const field of fields) {
      field.display_order = order;
      order += 10; // Use increments of 10 for display_order as a best practice

      if (field.id && field.id.startsWith('draft-')) {
        // It's a newly created field on the frontend
        const result = await this.createField(field);
        results.push(result);
      } else {
        // It's an existing field, just update it (specifically for order or other edits made before bulk save)
        const result = await this.updateField(field.id, field);
        results.push(result);
      }
    }
    return results;
  }
}

module.exports = UserFieldsService;
