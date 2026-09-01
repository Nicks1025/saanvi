const BaseRepository = require('../../../base/baseRepository');

class DynamicVariablesRepository extends BaseRepository {
  async getAll() {
    return await this.queryHelper.from('sph_dynamic_variables')
      .leftJoin('user_details', 'c', 'sph_dynamic_variables.created_by=c.user_uuid')
      .leftJoin('user_details', 'u', 'sph_dynamic_variables.updated_by=u.user_uuid')
      .select([
        'sph_dynamic_variables.uuid',
        'sph_dynamic_variables.variable_name',
        'sph_dynamic_variables.label',
        'sph_dynamic_variables.description',
        'sph_dynamic_variables.value',
        'sph_dynamic_variables.created_at',
        'sph_dynamic_variables.updated_at',
        'c.first_name as creator_first_name',
        'c.last_name as creator_last_name',
        'u.first_name as updater_first_name',
        'u.last_name as updater_last_name'
      ])
      .orderBy('sph_dynamic_variables.created_at', false)
      .execute();
  }

  async getByUuid(uuid) {
    const result = await this.queryHelper.from('sph_dynamic_variables')
      .select(['uuid', 'variable_name', 'label', 'description', 'value'])
      .where('uuid', 'eq', uuid)
      .execute();
    return result[0] || null;
  }

  async getByVariableName(variableName) {
    const result = await this.queryHelper.from('sph_dynamic_variables')
      .select(['uuid', 'variable_name', 'label', 'description', 'value'])
      .where('variable_name', 'eq', variableName)
      .execute();
    return result[0] || null;
  }

  async create(payload) {
    await this.queryHelper.from('sph_dynamic_variables')
      .insert(payload)
      .execute();
    return { uuid: payload.uuid };
  }

  async update(uuid, payload) {
    payload.updated_at = new Date().toISOString();
    await this.queryHelper.from('sph_dynamic_variables')
      .where('uuid', 'eq', uuid)
      .update(payload)
      .execute();
  }

  async delete(uuid) {
    await this.queryHelper.from('sph_dynamic_variables')
      .where('uuid', 'eq', uuid)
      .del()
      .execute();
  }
}

module.exports = DynamicVariablesRepository;
