const BaseService = require('../../base/baseService');
const UserFieldsRepository = require('./userFieldsRepository');

class UserFieldsService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new UserFieldsRepository(context);
  }

  async getAllFields() {
    return await this.repository.getAllFields();
  }

  async getPublicFormConfig(context = 'signup') {
    const fields = await this.repository.getPublicFieldsByContext(context);
    return fields.map((field) => {
      let fieldName = field.field_name;
      if (field.field_name === 'first_name') fieldName = 'firstName';
      else if (field.field_name === 'last_name') fieldName = 'lastName';
      else if (field.field_name === 'display_name') fieldName = 'displayName';
      else if (field.field_name === 'phone_number') fieldName = 'phoneNumber';
      else if (field.field_name === 'date_of_birth') fieldName = 'dateOfBirth';

      return {
        uuid: field.uuid || field.id,
        fieldName,
        label: field.label,
        fieldType: field.field_type,
        placeholder: field.placeholder,
        defaultValue: field.default_value,
        isRequired: field.is_required,
        displayOrder: field.display_order,
        optionsConfig: field.options_config,
        validationRules: field.validation_rules,
      };
    });
  }

  async createField(data) {
    if (!/^[a-z][a-z0-9_]*$/.test(data.field_name)) {
      const err = new Error('Field name must start with a letter and contain only lowercase letters, numbers, and underscores.');
      err.statusCode = 400;
      throw err;
    }

    const typeMap = {
      text: 'TEXT',
      textarea: 'TEXT',
      number: 'NUMERIC',
      date: 'DATE',
      email: 'VARCHAR(255)',
      phone: 'VARCHAR(50)',
      radio: 'VARCHAR(255)',
      checkbox: 'BOOLEAN',
      select: 'VARCHAR(255)'
    };

    const pgType = typeMap[data.field_type];
    if (!pgType) {
      const err = new Error(`Unsupported field type: ${data.field_type}`);
      err.statusCode = 400;
      throw err;
    }

    const existing = await this.repository.getFieldByName(data.field_name);
    if (existing) {
      const err = new Error(`Field with name '${data.field_name}' already exists.`);
      err.statusCode = 400;
      throw err;
    }

    const id = this.generateUuid();
    return await this.repository.createFieldRecord(id, data, pgType);
  }

  async updateField(id, data) {
    const existing = await this.repository.getFieldById(id);
    if (!existing) {
      const err = new Error('Field not found.');
      err.statusCode = 404;
      throw err;
    }

    const allowedUpdates = [
      'label', 'is_required', 'is_active', 'show_on_signup',
      'show_on_admin_create', 'display_order', 'options_config', 'validation_config'
    ];

    const updates = {};
    for (const key of allowedUpdates) {
      if (data[key] !== undefined) {
        if (key === 'options_config' || key === 'validation_config') {
          updates[key] = data[key] ? JSON.stringify(data[key]) : null;
        } else {
          updates[key] = data[key];
        }
      }
    }
    updates.updated_at = new Date();

    return await this.repository.updateFieldRecord(id, updates);
  }

  async deleteField(id) {
    const existing = await this.repository.getFieldById(id);
    if (!existing) {
      const err = new Error('Field not found.');
      err.statusCode = 404;
      throw err;
    }

    if (existing.is_system) {
      const err = new Error('System fields cannot be deleted.');
      err.statusCode = 400;
      throw err;
    }

    await this.repository.deleteFieldRecord(id, existing.field_name);
    return { success: true };
  }

  async bulkSaveFields(fields = [], deletedFieldIds = []) {
    return await this.repository.bulkSaveFields(fields, deletedFieldIds);
  }
}

module.exports = UserFieldsService;
