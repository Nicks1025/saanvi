const BaseService = require('../../base/baseService');
const ObjectsRepository = require('./objectsRepository');

class ObjectsService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new ObjectsRepository(context);
  }

  _mapObject(obj) {
    if (!obj) return null;
    return {
      uuid: obj.uuid,
      name: obj.name,
      objectSlug: obj.object_slug,
      createdBy: obj.created_by,
      updatedBy: obj.updated_by,
      createdAt: obj.created_at,
      updatedAt: obj.updated_at
    };
  }

  _mapField(f) {
    if (!f) return null;
    return {
      uuid: f.uuid,
      fieldName: f.field_name,
      label: f.label,
      fieldType: f.field_type,
      placeholder: f.placeholder,
      defaultValue: f.default_value,
      isRequired: Boolean(f.is_required),
      displayOrder: f.display_order || 0,
      options: typeof f.options === 'string' ? JSON.parse(f.options) : f.options,
      validationRules: typeof f.validation_rules === 'string' ? JSON.parse(f.validation_rules) : f.validation_rules,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    };
  }

  async listObjects(userUuid) {
    const list = await this.repository.listObjects(userUuid);
    return (list || []).map(o => this._mapObject(o));
  }

  async getObject(uuid, userUuid) {
    const object = await this.repository.getObjectByUuid(uuid, userUuid);
    if (!object) throw new Error('Object not found or you do not have permission');
    return this._mapObject(object);
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
    return this._mapObject(object);
  }

  async updateObject(uuid, userUuid, data) {
    const object = await this.repository.getObjectByUuid(uuid, userUuid);
    if (!object) throw new Error('Object not found');

    const updated = await this.repository.updateObject(uuid, userUuid, {
      name: data.name,
      updated_by: userUuid
    });
    return this._mapObject(updated);
  }

  async deleteObject(uuid, userUuid) {
    const object = await this.repository.getObjectByUuid(uuid, userUuid);
    if (!object) throw new Error('Object not found');

    return await this.repository.deleteObject(uuid, userUuid);
  }

  // --- Fields ---
  async listFields(objectUuid, userUuid) {
    await this.getObject(objectUuid, userUuid); // Check ownership
    const fields = await this.repository.listFields(objectUuid);
    return (fields || []).map(f => this._mapField(f));
  }

  async createField(objectUuid, userUuid, data) {
    await this.getObject(objectUuid, userUuid); // Check ownership

    const isRequired = data.isRequired === true || data.is_required === true || data.is_required === 'true';
    if (isRequired) {
      const recordCount = await this.repository.countRecords(objectUuid);
      if (recordCount > 0) {
        throw Object.assign(
          new Error('This object already contains records so before making it required add this field and fill all values'),
          { code: 'OBJECT_CONTAINS_RECORDS', statusCode: 422, count: recordCount }
        );
      }
    }

    // Normalize field_name
    let fieldName = data.fieldName || data.field_name || this._generateSlug(data.label).replace(/-/g, '_');

    // Ensure uniqueness
    const existingFields = await this.repository.listFields(objectUuid);
    if (existingFields.some(f => f.field_name === fieldName)) {
      fieldName = `${fieldName}_${Math.floor(Math.random() * 1000)}`;
    }

    const fieldType = data.fieldType || data.field_type;
    const placeholder = data.placeholder || null;
    const defaultValue = data.defaultValue ?? data.default_value ?? null;
    const options = data.options ? (typeof data.options === 'string' ? data.options : JSON.stringify(data.options)) : null;
    const rawVr = data.validationRules ?? data.validation_rules;
    const validationRules = rawVr ? (typeof rawVr === 'string' ? rawVr : JSON.stringify(rawVr)) : null;
    const displayOrder = data.displayOrder ?? data.display_order ?? 0;

    const created = await this.repository.createField(objectUuid, {
      object_uuid: objectUuid,
      field_name: fieldName,
      label: data.label,
      field_type: fieldType,
      placeholder,
      default_value: defaultValue,
      is_required: isRequired,
      options,
      validation_rules: validationRules,
      display_order: displayOrder
    });
    return this._mapField(created);
  }

  async updateField(objectUuid, fieldUuid, userUuid, data) {
    await this.getObject(objectUuid, userUuid);
    const field = await this.repository.getFieldByUuid(objectUuid, fieldUuid);
    if (!field) throw new Error('Field not found');

    const isRequiredInput = data.isRequired !== undefined ? data.isRequired : data.is_required;
    const isBeingMadeRequired = (isRequiredInput === true || isRequiredInput === 'true') && !field.is_required;

    if (isBeingMadeRequired) {
      const emptyCount = await this.repository.countEmptyRecordsForField(objectUuid, field.field_name);
      if (emptyCount > 0) {
        throw Object.assign(
          new Error(`${emptyCount} existing record${emptyCount > 1 ? 's have' : ' has'} no value for "${field.label}". Update those records before making this field required.`),
          { code: 'EMPTY_RECORDS_EXIST', statusCode: 422, count: emptyCount }
        );
      }
    }

    const dbPayload = {};
    if (data.label !== undefined) dbPayload.label = data.label;
    if (data.fieldType !== undefined || data.field_type !== undefined) {
      dbPayload.field_type = data.fieldType || data.field_type;
    }
    if (data.placeholder !== undefined) dbPayload.placeholder = data.placeholder;
    if (data.defaultValue !== undefined || data.default_value !== undefined) {
      dbPayload.default_value = data.defaultValue ?? data.default_value;
    }
    if (isRequiredInput !== undefined) {
      dbPayload.is_required = Boolean(isRequiredInput);
    }
    if (data.options !== undefined) {
      dbPayload.options = data.options ? (typeof data.options === 'string' ? data.options : JSON.stringify(data.options)) : null;
    }
    if (data.validationRules !== undefined || data.validation_rules !== undefined) {
      const vr = data.validationRules ?? data.validation_rules;
      dbPayload.validation_rules = vr ? (typeof vr === 'string' ? vr : JSON.stringify(vr)) : null;
    }
    if (data.displayOrder !== undefined || data.display_order !== undefined) {
      dbPayload.display_order = data.displayOrder ?? data.display_order;
    }

    const updated = await this.repository.updateField(objectUuid, fieldUuid, dbPayload);
    return this._mapField(updated);
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
          const isRequired = fieldData.is_required === true || fieldData.is_required === 'true';
          if (isRequired) {
            const recordCount = await this.repository.countRecords(objectUuid);
            if (recordCount > 0) {
              throw Object.assign(
                new Error('This object already contains records so before making it required add this field and fill all values'),
                { code: 'OBJECT_CONTAINS_RECORDS', statusCode: 422, count: recordCount }
              );
            }
          }

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
      const layoutFields = data.fields.map(f => {
        const pUuid = f.placement_uuid || f.placementUuid || null;
        const fUuid = f.field_uuid || f.fieldUuid;
        const rNum = f.row_number ?? f.rowNumber ?? 0;
        const cNum = f.column_number ?? f.columnNumber ?? 0;
        const dOrder = f.display_order ?? f.displayOrder ?? 0;
        return {
          placement_uuid: pUuid,
          placementUuid: pUuid,
          field_uuid: fUuid,
          fieldUuid: fUuid,
          row_number: rNum,
          rowNumber: rNum,
          column_number: cNum,
          columnNumber: cNum,
          width: f.width || 12,
          display_order: dOrder,
          displayOrder: dOrder
        };
      });
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
      const layoutFields = data.fields.map(f => {
        const pUuid = f.placement_uuid || f.placementUuid || null;
        const fUuid = f.field_uuid || f.fieldUuid;
        const rNum = f.row_number ?? f.rowNumber ?? 0;
        const cNum = f.column_number ?? f.columnNumber ?? 0;
        const dOrder = f.display_order ?? f.displayOrder ?? 0;
        return {
          placement_uuid: pUuid,
          placementUuid: pUuid,
          field_uuid: fUuid,
          fieldUuid: fUuid,
          row_number: rNum,
          rowNumber: rNum,
          column_number: cNum,
          columnNumber: cNum,
          width: f.width || 12,
          display_order: dOrder,
          displayOrder: dOrder
        };
      });
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
  async getRecordCount(objectUuid, userUuid) {
    await this.getObject(objectUuid, userUuid); // Check ownership
    return await this.repository.countRecords(objectUuid);
  }

  async listRecords(objectUuid, userUuid) {
    await this.getObject(objectUuid, userUuid); // Check ownership

    const records = await this.repository.listRecords(objectUuid);
    const fields = await this.repository.listFields(objectUuid);

    if (records.length === 0) return { records: [], fields: fields.map(f => this._mapField(f)) };

    const formattedRecords = records.map(record => {
      const row = { uuid: record.uuid, createdAt: record.created_at };
      const recordData = record.record_data || {};

      for (const field of fields) {
        row[field.field_name] = recordData[field.field_name] !== undefined ? recordData[field.field_name] : null;
      }
      return row;
    });

    return { records: formattedRecords, fields: fields.map(f => this._mapField(f)) };
  }

  async getRecord(objectUuid, recordUuid, userUuid) {
    await this.getObject(objectUuid, userUuid); // Check ownership
    const record = await this.repository.getRecordByUuid(objectUuid, recordUuid);
    if (!record) return null;

    const fields = await this.repository.listFields(objectUuid);
    const recordData = record.record_data || {};
    const formatted = { uuid: record.uuid, createdAt: record.created_at };

    for (const field of fields) {
      formatted[field.field_name] = recordData[field.field_name] !== undefined ? recordData[field.field_name] : null;
    }
    return formatted;
  }

  async createRecord(objectUuid, userUuid, data) {
    await this.getObject(objectUuid, userUuid);
    return await this.repository.createRecord(objectUuid, data);
  }

  async updateRecord(objectUuid, recordUuid, userUuid, data) {
    await this.getObject(objectUuid, userUuid);
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
