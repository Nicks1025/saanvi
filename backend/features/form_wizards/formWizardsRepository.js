const BaseRepository = require('../../base/baseRepository');

class FormWizardsRepository extends BaseRepository {
  // --- Wizards ---
  async listWizards(createdBy) {
    return await this.queryHelper
      .from('sph_form_wizard')
      .where('created_by', 'eq', createdBy)
      .where('archived_at', 'is', null)
      .orderBy('created_at', false)
      .execute();
  }

  async getWizardByUuid(uuid, createdBy) {
    const results = await this.queryHelper
      .from('sph_form_wizard')
      .where('uuid', 'eq', uuid)
      .where('created_by', 'eq', createdBy)
      .where('archived_at', 'is', null)
      .execute();
    return results[0] || null;
  }
  
  async getWizardByName(name) {
    const results = await this.queryHelper
      .from('sph_form_wizard')
      .where('name', 'eq', name)
      .where('archived_at', 'is', null)
      .execute();
    return results[0] || null;
  }

  async createWizard(data) {
    const result = await this.queryHelper
      .from('sph_form_wizard')
      .insert(data)
      .execute();
    return result[0];
  }

  async updateWizard(uuid, createdBy, data) {
    data.updated_at = new Date();
    const result = await this.queryHelper
      .from('sph_form_wizard')
      .where('uuid', 'eq', uuid)
      .where('created_by', 'eq', createdBy)
      .update(data)
      .execute();
    return result[0];
  }

  async deleteWizard(uuid, createdBy) {
    const result = await this.queryHelper
      .from('sph_form_wizard')
      .where('uuid', 'eq', uuid)
      .where('created_by', 'eq', createdBy)
      .delete()
      .execute();
    return result[0];
  }

  // --- Phases ---
  async listPhases(wizardUuid) {
    return await this.queryHelper
      .from('sph_form_wizard_phase')
      .where('wizard_uuid', 'eq', wizardUuid)
      .where('archived_at', 'is', null)
      .orderBy('display_order', true)
      .execute();
  }

  async getPhaseByUuid(uuid, wizardUuid) {
    const results = await this.queryHelper
      .from('sph_form_wizard_phase')
      .where('uuid', 'eq', uuid)
      .where('wizard_uuid', 'eq', wizardUuid)
      .where('archived_at', 'is', null)
      .execute();
    return results[0] || null;
  }

  async createPhase(data) {
    const result = await this.queryHelper
      .from('sph_form_wizard_phase')
      .insert(data)
      .execute();
    return result[0];
  }

  async updatePhase(uuid, wizardUuid, data) {
    data.updated_at = new Date();
    const result = await this.queryHelper
      .from('sph_form_wizard_phase')
      .where('uuid', 'eq', uuid)
      .where('wizard_uuid', 'eq', wizardUuid)
      .update(data)
      .execute();
    return result[0];
  }

  async deletePhase(uuid, wizardUuid) {
    const result = await this.queryHelper
      .from('sph_form_wizard_phase')
      .where('uuid', 'eq', uuid)
      .where('wizard_uuid', 'eq', wizardUuid)
      .delete()
      .execute();
    return result[0];
  }

  // --- Steps ---
  async listSteps(phaseUuid) {
    return await this.queryHelper
      .from('sph_form_wizard_step')
      .where('phase_uuid', 'eq', phaseUuid)
      .where('archived_at', 'is', null)
      .orderBy('display_order', true)
      .execute();
  }
  
  async getStepByUuid(uuid, phaseUuid) {
    const results = await this.queryHelper
      .from('sph_form_wizard_step')
      .where('uuid', 'eq', uuid)
      .where('phase_uuid', 'eq', phaseUuid)
      .where('archived_at', 'is', null)
      .execute();
    return results[0] || null;
  }

  async createStep(data) {
    const result = await this.queryHelper
      .from('sph_form_wizard_step')
      .insert(data)
      .execute();
    return result[0];
  }

  async updateStep(uuid, phaseUuid, data) {
    data.updated_at = new Date();
    const result = await this.queryHelper
      .from('sph_form_wizard_step')
      .where('uuid', 'eq', uuid)
      .where('phase_uuid', 'eq', phaseUuid)
      .update(data)
      .execute();
    return result[0];
  }

  async deleteStep(uuid, phaseUuid) {
    const result = await this.queryHelper
      .from('sph_form_wizard_step')
      .where('uuid', 'eq', uuid)
      .where('phase_uuid', 'eq', phaseUuid)
      .delete()
      .execute();
    return result[0];
  }

  // --- Helpers to Validate Object/Template Relationship ---
  async isTemplateBelongsToObject(templateUuid, objectUuid) {
    // 1. Get the object to find its slug
    const objResults = await this.queryHelper
      .from('sph_object')
      .where('uuid', 'eq', objectUuid)
      .execute();
    
    if (objResults.length === 0) return false;
    
    const slug = objResults[0].object_slug.replace(/-/g, '_');
    const prefix = slug.startsWith('sph_object_') ? slug : `sph_object_${slug}`;
    const templatesTable = `${prefix}_templates`;
    
    // 2. Check if the template exists in that object's template table
    try {
      const tplResults = await this.queryHelper
        .from(templatesTable)
        .where('uuid', 'eq', templateUuid)
        .where('archived_at', 'is', null)
        .execute();
      return tplResults.length > 0;
    } catch(e) {
      return false; // Table might not exist or error
    }
  }
}

module.exports = FormWizardsRepository;
