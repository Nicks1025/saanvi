const BaseService = require('../../../base/baseService');
const DynamicVariablesRepository = require('./dynamicVariablesRepository');

class DynamicVariablesService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new DynamicVariablesRepository(context);
  }

  async getAll() {
    const list = await this.repository.getAll();
    return (list || []).map(row => ({
      uuid: row.uuid,
      variableName: row.variable_name,
      label: row.label,
      description: row.description,
      value: row.value,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      creatorFirstName: row.creator_first_name,
      creatorLastName: row.creator_last_name,
      updaterFirstName: row.updater_first_name,
      updaterLastName: row.updater_last_name
    }));
  }

  async create(payload, userUuid) {
    const rawName = payload.variable_name || payload.variableName;
    if (!rawName) {
      const error = new Error('Variable name is required.');
      error.statusCode = 400;
      throw error;
    }

    let varName = rawName.trim();
    if (!varName.startsWith('$$') || !varName.endsWith('$$')) {
      const error = new Error('Variable name must start and end with $$ (e.g., $$name$$).');
      error.statusCode = 400;
      throw error;
    }

    const existing = await this.repository.getByVariableName(varName);
    if (existing) {
      const error = new Error('Variable with this name already exists.');
      error.statusCode = 409;
      error.code = 'DUPLICATE_VARIABLE_NAME';
      throw error;
    }

    const newRecord = {
      uuid: payload.uuid || this.generateUuid(),
      variable_name: varName,
      label: payload.label || varName,
      description: payload.description !== undefined ? payload.description : null,
      value: payload.value !== undefined ? payload.value : null,
      created_by: userUuid || null,
      updated_by: userUuid || null
    };

    try {
      return await this.repository.create(newRecord);
    } catch (err) {
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('already exists')) {
        const error = new Error('Variable with this name already exists.');
        error.statusCode = 409;
        error.code = 'DUPLICATE_VARIABLE_NAME';
        throw error;
      }
      throw err;
    }
  }

  async update(uuid, payload, userUuid) {
    const existing = await this.repository.getByUuid(uuid);
    if (!existing) {
      const error = new Error('Dynamic variable not found.');
      error.statusCode = 404;
      throw error;
    }

    let finalVarName = existing.variable_name;
    const rawName = payload.variable_name || payload.variableName;
    if (rawName && rawName !== existing.variable_name) {
      let varName = rawName.trim();
      if (!varName.startsWith('$$') || !varName.endsWith('$$')) {
        const error = new Error('Variable name must start and end with $$ (e.g., $$name$$).');
        error.statusCode = 400;
        throw error;
      }

      const duplicate = await this.repository.getByVariableName(varName);
      if (duplicate && duplicate.uuid !== uuid) {
        const error = new Error('Variable with this name already exists.');
        error.statusCode = 409;
        error.code = 'DUPLICATE_VARIABLE_NAME';
        throw error;
      }
      finalVarName = varName;
    }

    const updateRecord = {
      variable_name: finalVarName,
      label: payload.label !== undefined ? payload.label : existing.label,
      description: payload.description !== undefined ? payload.description : existing.description,
      value: payload.value !== undefined ? payload.value : existing.value,
      updated_by: userUuid || null
    };

    try {
      await this.repository.update(uuid, updateRecord);
    } catch (err) {
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('already exists')) {
        const error = new Error('Variable with this name already exists.');
        error.statusCode = 409;
        error.code = 'DUPLICATE_VARIABLE_NAME';
        throw error;
      }
      throw err;
    }
  }

  async delete(uuid) {
    const existing = await this.repository.getByUuid(uuid);
    if (!existing) {
      const error = new Error('Dynamic variable not found.');
      error.statusCode = 404;
      throw error;
    }
    await this.repository.delete(uuid);
  }
}

module.exports = DynamicVariablesService;
