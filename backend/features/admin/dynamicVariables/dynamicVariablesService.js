const { v4: uuidv4 } = require('uuid');

class DynamicVariablesService {
  constructor(repository) {
    this.repository = repository;
  }

  async getAll() {
    return await this.repository.getAll();
  }

  async create(payload, userUuid) {
    if (!payload.variable_name) {
      throw new Error('Variable name is required.');
    }
    
    // Ensure variable name starts and ends with $$
    let varName = payload.variable_name.trim();
    if (!varName.startsWith('$$') || !varName.endsWith('$$')) {
      throw new Error('Variable name must start and end with $$ (e.g., $$name$$).');
    }

    const existing = await this.repository.getByVariableName(varName);
    if (existing) {
      throw new Error('Variable with this name already exists.');
    }

    const newRecord = {
      uuid: payload.uuid || uuidv4(),
      variable_name: varName,
      label: payload.label || varName,
      description: payload.description || null,
      value: payload.value || null,
      created_by: userUuid || null,
      updated_by: userUuid || null
    };

    return await this.repository.create(newRecord);
  }

  async update(uuid, payload, userUuid) {
    const existing = await this.repository.getByUuid(uuid);
    if (!existing) {
      throw new Error('Dynamic variable not found.');
    }

    let finalVarName = existing.variable_name;
    if (payload.variable_name && payload.variable_name !== existing.variable_name) {
      let varName = payload.variable_name.trim();
      if (!varName.startsWith('$$') || !varName.endsWith('$$')) {
        throw new Error('Variable name must start and end with $$ (e.g., $$name$$).');
      }
      
      const duplicate = await this.repository.getByVariableName(varName);
      if (duplicate && duplicate.uuid !== uuid) {
        throw new Error('Variable with this name already exists.');
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

    await this.repository.update(uuid, updateRecord);
  }

  async delete(uuid) {
    const existing = await this.repository.getByUuid(uuid);
    if (!existing) {
      throw new Error('Dynamic variable not found.');
    }
    await this.repository.delete(uuid);
  }
}

module.exports = DynamicVariablesService;
