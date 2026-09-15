const BaseService = require('../../base/baseService');

class ObjectsService extends BaseService {
  constructor(repository) {
    super(repository);
  }

  async listObjects(userUuid) {
    return await this.repository.listObjects(userUuid);
  }

  async getObject(uuid, userUuid) {
    const object = await this.repository.getObjectByUuid(uuid, userUuid);
    if (!object) throw new Error('Object not found or you do not have permission');
    return object;
  }

  async createObject(data, userUuid) {
    const slug = this._generateSlug(data.name);

    const existingObject = await this.repository.getObjectBySlug(slug);
    if (existingObject) {
      throw new Error(`Object already exists with this name: ${data.name}`);
    }

    const object = await this.repository.createObject({
      name: data.name,
      object_slug: slug,
      created_by: userUuid,
      updated_by: userUuid
    });
    return object;
  }

  async updateObject(uuid, userUuid, data) {
    const object = await this.repository.getObjectByUuid(uuid, userUuid);
    if (!object) throw new Error('Object not found');

    return await this.repository.updateObject(uuid, userUuid, {
      name: data.name,
      updated_by: userUuid
    });
  }

  async deleteObject(uuid, userUuid) {
    const object = await this.repository.getObjectByUuid(uuid, userUuid);
    if (!object) throw new Error('Object not found');

    return await this.repository.deleteObject(uuid, userUuid);
  }

  // --- Fields ---
  async listFields(objectUuid, userUuid) {
    await this.getObject(objectUuid, userUuid); // Check ownership
    return await this.repository.listFields(objectUuid);
  }

  async createField(objectUuid, userUuid, data) {
    await this.getObject(objectUuid, userUuid); // Check ownership

    // Normalize field_name
    let fieldName = data.field_name || this._generateSlug(data.label).replace(/-/g, '_');

    // Ensure uniqueness
    const existingFields = await this.repository.listFields(objectUuid);
    if (existingFields.some(f => f.field_name === fieldName)) {
      fieldName = `${fieldName}_${Math.floor(Math.random() * 1000)}`;
    }

    return await this.repository.createField(objectUuid, {
      object_uuid: objectUuid,
      field_name: fieldName,
      label: data.label,
      field_type: data.field_type,
      placeholder: data.placeholder,
      default_value: data.default_value,
      is_required: data.is_required,
      options: data.options ? JSON.stringify(data.options) : null,
      validation_rules: data.validation_rules ? JSON.stringify(data.validation_rules) : null
    });
  }

  async updateField(objectUuid, fieldUuid, userUuid, data) {
    await this.getObject(objectUuid, userUuid);
    const field = await this.repository.getFieldByUuid(objectUuid, fieldUuid);
    if (!field) throw new Error('Field not found');

    // If making the field required, check for existing records with empty values
    const isBeingMadeRequired = (data.is_required === true || data.is_required === 'true')
      && !field.is_required;

    if (isBeingMadeRequired) {
      const emptyCount = await this.repository.countEmptyRecordsForField(objectUuid, field.field_name);
      if (emptyCount > 0) {
        throw Object.assign(
          new Error(`${emptyCount} existing record${emptyCount > 1 ? 's have' : ' has'} no value for "${field.label}". Update those records before making this field required.`),
          { code: 'EMPTY_RECORDS_EXIST', statusCode: 422, count: emptyCount }
        );
      }
    }

    // Convert JSON fields if present
    if (data.options) data.options = JSON.stringify(data.options);
    if (data.validation_rules) data.validation_rules = JSON.stringify(data.validation_rules);

    return await this.repository.updateField(objectUuid, fieldUuid, data);
  }

  async archiveField(objectUuid, fieldUuid, userUuid) {
    await this.getObject(objectUuid, userUuid);
    const field = await this.repository.getFieldByUuid(objectUuid, fieldUuid);
    if (!field) {
      throw new Error('Field not found');
    }

    return await this.repository.deleteField(objectUuid, fieldUuid);
  }

  async bulkSaveFields(objectUuid, userUuid, fields, deletedFieldIds) {
    await this.getObject(objectUuid, userUuid);

    if (deletedFieldIds && deletedFieldIds.length > 0) {
      for (const fieldId of deletedFieldIds) {
        if (!fieldId.startsWith('draft-')) {
          await this.repository.deleteField(objectUuid, fieldId);
        }
      }
    }

    if (fields && fields.length > 0) {
      for (let i = 0; i < fields.length; i++) {
        const fieldData = fields[i];
        const payload = {
          label: fieldData.label,
          field_type: fieldData.field_type,
          placeholder: fieldData.placeholder,
          default_value: fieldData.default_value,
          is_required: fieldData.is_required,
          display_order: i + 1
        };

        if (fieldData.options) payload.options = typeof fieldData.options === 'string' ? fieldData.options : JSON.stringify(fieldData.options);
        if (fieldData.validation_rules) payload.validation_rules = typeof fieldData.validation_rules === 'string' ? fieldData.validation_rules : JSON.stringify(fieldData.validation_rules);

        if (fieldData.uuid && !fieldData.uuid.startsWith('draft-')) {
          await this.repository.updateField(objectUuid, fieldData.uuid, payload);
        } else {
          // It's a draft/new field
          let fieldName = fieldData.field_name || this._generateSlug(fieldData.label).replace(/-/g, '_');

          payload.object_uuid = objectUuid;
          payload.field_name = fieldName;
          await this.repository.createField(objectUuid, payload);
        }
      }
    }
  }

  // --- Templates ---
  async listTemplates(objectUuid, userUuid) {
    await this.getObject(objectUuid, userUuid); // Check ownership
    const templates = await this.repository.listTemplates(objectUuid);

    return templates.map(t => {
      let config = t.jsonBuilderConfig || '[]';
      if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch (e) { config = []; }
      }
      t.fields = config;
      delete t.jsonBuilderConfig;
      return t;
    });
  }

  async createTemplate(objectUuid, userUuid, data) {
    await this.getObject(objectUuid, userUuid); // Check ownership

    const payload = { name: data.name };

    if (data.fields && data.fields.length > 0) {
      const layoutFields = data.fields.map(f => ({
        field_uuid: f.field_uuid,
        row_number: f.row_number || 0,
        column_number: f.column_number || 0,
        width: f.width || 12,
        display_order: f.display_order || 0
      }));
      payload.jsonBuilderConfig = JSON.stringify(layoutFields);
    }

    return await this.repository.createTemplate(objectUuid, payload);
  }

  async updateTemplate(uuid, objectUuid, userUuid, data) {
    await this.getObject(objectUuid, userUuid); // Check ownership
    const template = await this.repository.getTemplateByUuid(objectUuid, uuid);
    if (!template) throw new Error('Template not found');

    const updatePayload = {};
    if (data.name !== undefined) updatePayload.name = data.name;

    if (data.fields) {
      const layoutFields = data.fields.map(f => ({
        field_uuid: f.field_uuid,
        row_number: f.row_number || 0,
        column_number: f.column_number || 0,
        width: f.width || 12,
        display_order: f.display_order || 0
      }));
      updatePayload.jsonBuilderConfig = JSON.stringify(layoutFields);
    }

    if (Object.keys(updatePayload).length > 0) {
      await this.repository.updateTemplate(objectUuid, uuid, updatePayload);
    }

    return await this.repository.getTemplateByUuid(objectUuid, uuid);
  }

  async deleteTemplate(uuid, objectUuid, userUuid) {
    await this.getObject(objectUuid, userUuid); // Check ownership
    const template = await this.repository.getTemplateByUuid(objectUuid, uuid);
    if (!template) throw new Error('Template not found');

    return await this.repository.deleteTemplate(objectUuid, uuid);
  }

  // --- Records ---
  async listRecords(objectUuid, userUuid) {
    await this.getObject(objectUuid, userUuid); // Check ownership

    const records = await this.repository.listRecords(objectUuid);
    const fields = await this.repository.listFields(objectUuid);

    if (records.length === 0) return { records: [], fields };

    const formattedRecords = records.map(record => {
      const row = { uuid: record.uuid, created_at: record.created_at };
      const recordData = record.record_data || {};

      for (const field of fields) {
        row[field.field_name] = recordData[field.field_name] !== undefined ? recordData[field.field_name] : null;
      }
      return row;
    });

    return { records: formattedRecords, fields };
  }

  async createRecord(objectUuid, userUuid, data) {
    await this.getObject(objectUuid, userUuid);
    return await this.repository.createRecord(objectUuid, data);
  }

  async updateRecord(objectUuid, recordUuid, userUuid, data) {
    await this.getObject(objectUuid, userUuid);
    // You could also add check if record exists before updating
    return await this.repository.updateRecord(objectUuid, recordUuid, data);
  }

  async deleteRecord(objectUuid, recordUuid, userUuid) {
    await this.getObject(objectUuid, userUuid);
    return await this.repository.deleteRecord(objectUuid, recordUuid);
  }

  // --- Utilities ---
  _generateSlug(name) {
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    return `sph_object_${baseSlug}`;
  }
}

module.exports = ObjectsService;
