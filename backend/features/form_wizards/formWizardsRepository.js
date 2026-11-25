const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

class FormWizardsRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sqlWizards = new QueryHelper('sph_form_wizard');
    this.sqlPhases = new QueryHelper('sph_form_wizard_phase');
    this.sqlSteps = new QueryHelper('sph_form_wizard_step');
    this.sqlObjects = new QueryHelper('sph_object');
  }

  // --- Wizards ---
  async listWizards(createdBy) {
    const query = this.sqlWizards
      .select()
      .field('*')
      .where('created_by', '=', createdBy)
      .whereNull('archived_at')
      .orderBy('created_at', 'desc');

    return this.runQuery(query);
  }

  async getWizardByUuid(uuid, createdBy) {
    const query = this.sqlWizards
      .select()
      .field('*')
      .where('uuid', '=', uuid)
      .whereNull('archived_at');

    if (createdBy) {
      query.where('created_by', '=', createdBy);
    }

    return this.runQueryFirst(query);
  }

  async getWizardByName(name) {
    const query = this.sqlWizards
      .select()
      .field('*')
      .where('name', '=', name)
      .whereNull('archived_at');

    return this.runQueryFirst(query);
  }

  async getWizardByUrl(url) {
    if (!url) return null;
    const query = this.sqlWizards
      .select()
      .field('*')
      .where('url', '=', url)
      .whereNull('archived_at');

    return this.runQueryFirst(query);
  }

  async getPublicWizardByIdentifier(identifier) {
    if (!identifier) return null;
    const query = this.sqlWizards
      .select()
      .field('*')
      .whereNull('archived_at')
      .whereRaw('(url = ? OR name = ?)', [identifier, identifier]);

    return this.runQueryFirst(query);
  }

  async createWizard(data) {
    const query = this.sqlWizards.insert(data);
    const result = await this.execute(query);
    return result.rows[0];
  }

  async updateWizard(uuid, createdBy, data) {
    data.updated_at = new Date();
    const query = this.sqlWizards
      .update(data)
      .where('uuid', '=', uuid);

    if (createdBy) {
      query.where('created_by', '=', createdBy);
    }

    const result = await this.execute(query);
    return result.rows[0];
  }

  async deleteWizard(uuid, createdBy) {
    const query = this.sqlWizards
      .delete()
      .where('uuid', '=', uuid);

    if (createdBy) {
      query.where('created_by', '=', createdBy);
    }

    const result = await this.execute(query);
    return result.rows[0] || { uuid };
  }

  // --- Phases ---
  async listPhases(wizardUuid) {
    const query = this.sqlPhases
      .select()
      .field('*')
      .where('wizard_uuid', '=', wizardUuid)
      .whereNull('archived_at')
      .orderBy('display_order', 'asc');

    return this.runQuery(query);
  }

  async getPhaseByUuid(uuid, wizardUuid) {
    const query = this.sqlPhases
      .select()
      .field('*')
      .where('uuid', '=', uuid)
      .whereNull('archived_at');

    if (wizardUuid) {
      query.where('wizard_uuid', '=', wizardUuid);
    }

    return this.runQueryFirst(query);
  }

  async createPhase(data) {
    const query = this.sqlPhases.insert(data);
    const result = await this.execute(query);
    return result.rows[0];
  }

  async updatePhase(uuid, wizardUuid, data) {
    data.updated_at = new Date();
    const query = this.sqlPhases
      .update(data)
      .where('uuid', '=', uuid);

    if (wizardUuid) {
      query.where('wizard_uuid', '=', wizardUuid);
    }

    const result = await this.execute(query);
    return result.rows[0];
  }

  async deletePhase(uuid, wizardUuid) {
    const query = this.sqlPhases
      .delete()
      .where('uuid', '=', uuid);

    if (wizardUuid) {
      query.where('wizard_uuid', '=', wizardUuid);
    }

    const result = await this.execute(query);
    return result.rows[0] || { uuid };
  }

  // --- Steps ---
  async listSteps(phaseUuid) {
    const query = this.sqlSteps
      .select()
      .field('*')
      .where('phase_uuid', '=', phaseUuid)
      .whereNull('archived_at')
      .orderBy('display_order', 'asc');

    return this.runQuery(query);
  }

  async getStepByUuid(uuid, phaseUuid) {
    const query = this.sqlSteps
      .select()
      .field('*')
      .where('uuid', '=', uuid)
      .whereNull('archived_at');

    if (phaseUuid) {
      query.where('phase_uuid', '=', phaseUuid);
    }

    return this.runQueryFirst(query);
  }

  async createStep(data) {
    const query = this.sqlSteps.insert(data);
    const result = await this.execute(query);
    return result.rows[0];
  }

  async updateStep(uuid, phaseUuid, data) {
    data.updated_at = new Date();
    const query = this.sqlSteps
      .update(data)
      .where('uuid', '=', uuid);

    if (phaseUuid) {
      query.where('phase_uuid', '=', phaseUuid);
    }

    const result = await this.execute(query);
    return result.rows[0];
  }

  async deleteStep(uuid, phaseUuid) {
    const query = this.sqlSteps
      .delete()
      .where('uuid', '=', uuid);

    if (phaseUuid) {
      query.where('phase_uuid', '=', phaseUuid);
    }

    const result = await this.execute(query);
    return result.rows[0] || { uuid };
  }

  // --- Helpers to Validate Object/Template Relationship ---
  async isTemplateBelongsToObject(templateUuid, objectUuid) {
    if (!templateUuid || !objectUuid) return false;

    const obj = await this.runQueryFirst(
      this.sqlObjects
        .select()
        .field('object_slug')
        .where('uuid', '=', objectUuid)
        .whereNull('archived_at')
    );

    if (!obj || !obj.object_slug) return false;

    const slug = obj.object_slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const prefix = slug.startsWith('sph_object_') ? slug : `sph_object_${slug}`;
    const templatesTable = `${prefix}_templates`;

    try {
      const tplSql = new QueryHelper(templatesTable);
      const tpl = await this.runQueryFirst(
        tplSql
          .select()
          .field('uuid')
          .where('uuid', '=', templateUuid)
          .whereNull('archived_at')
      );
      return Boolean(tpl);
    } catch (e) {
      return false;
    }
  }
}

module.exports = FormWizardsRepository;
