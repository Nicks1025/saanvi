const BaseRepository = require('../../../base/baseRepository');
const QueryHelper = require('../../../database/queryHelper');

class DynamicVariablesRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sql = new QueryHelper('sph_dynamic_variables');
  }

  async getAll() {
    const query = this.sql
      .select()
      .field('sph_dynamic_variables.uuid')
      .field('sph_dynamic_variables.variable_name')
      .field('sph_dynamic_variables.label')
      .field('sph_dynamic_variables.description')
      .field('sph_dynamic_variables.value')
      .field('sph_dynamic_variables.created_at')
      .field('sph_dynamic_variables.updated_at')
      .field('c.first_name as creator_first_name')
      .field('c.last_name as creator_last_name')
      .field('u.first_name as updater_first_name')
      .field('u.last_name as updater_last_name')
      .leftJoin('user_details as c', 'sph_dynamic_variables.created_by', 'c.user_uuid')
      .leftJoin('user_details as u', 'sph_dynamic_variables.updated_by', 'u.user_uuid')
      .orderBy('sph_dynamic_variables.created_at', 'desc');

    return this.runQuery(query);
  }

  async getByUuid(uuid) {
    const query = this.sql
      .select()
      .field('uuid')
      .field('variable_name')
      .field('label')
      .field('description')
      .field('value')
      .where('uuid', '=', uuid);

    return this.runQueryFirst(query);
  }

  async getByVariableName(variableName) {
    const query = this.sql
      .select()
      .field('uuid')
      .field('variable_name')
      .field('label')
      .field('description')
      .field('value')
      .where('variable_name', '=', variableName);

    return this.runQueryFirst(query);
  }

  async create(payload) {
    const query = this.sql.insert(payload);
    await this.execute(query);
    return { uuid: payload.uuid };
  }

  async update(uuid, payload) {
    const updateData = {
      ...payload,
      updated_at: new Date().toISOString()
    };
    const query = this.sql
      .where('uuid', '=', uuid)
      .update(updateData);

    await this.execute(query);
  }

  async delete(uuid) {
    const query = this.sql
      .delete()
      .where('uuid', '=', uuid);

    await this.execute(query);
  }
}

module.exports = DynamicVariablesRepository;
