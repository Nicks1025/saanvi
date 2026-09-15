const BaseService = require('../../base/baseService');

class FormWizardsService extends BaseService {
  constructor(repository, objectsRepository) {
    super(repository);
    this.objectsRepository = objectsRepository;
  }

  // --- Wizards ---
  async listWizards(userUuid) {
    return await this.repository.listWizards(userUuid);
  }

  async getWizard(uuid, userUuid) {
    const wizard = await this.repository.getWizardByUuid(uuid, userUuid);
    if (!wizard) throw new Error('Wizard not found or you do not have permission');
    return wizard;
  }

  async createWizard(data, userUuid) {
    // Check object ownership
    const object = await this.objectsRepository.getObjectByUuid(data.object_uuid, userUuid);
    if (!object) {
      throw new Error('Object not found or you do not have permission to use it');
    }
    
    // Check name uniqueness
    const existingWizard = await this.repository.getWizardByName(data.name);
    if (existingWizard) {
      throw new Error(`Wizard already exists with name: ${data.name}`);
    }

    const wizard = await this.repository.createWizard({
      object_uuid: data.object_uuid,
      name: data.name,
      type: data.type,
      created_by: userUuid,
      updated_by: userUuid
    });
    
    return wizard;
  }

  async updateWizard(uuid, userUuid, data) {
    const wizard = await this.repository.getWizardByUuid(uuid, userUuid);
    if (!wizard) throw new Error('Wizard not found');
    
    if (data.name && data.name !== wizard.name) {
      const existingWizard = await this.repository.getWizardByName(data.name);
      if (existingWizard && existingWizard.uuid !== uuid) {
        throw new Error(`Wizard already exists with name: ${data.name}`);
      }
    }
    
    // Changing object_uuid is generally not allowed or requires strict validation,
    // let's just allow updating name and type for now.
    
    return await this.repository.updateWizard(uuid, userUuid, {
      name: data.name,
      type: data.type,
      updated_by: userUuid
    });
  }

  async deleteWizard(uuid, userUuid) {
    const wizard = await this.repository.getWizardByUuid(uuid, userUuid);
    if (!wizard) throw new Error('Wizard not found');
    
    return await this.repository.deleteWizard(uuid, userUuid);
  }

  // --- Phases ---
  async listPhases(wizardUuid, userUuid) {
    await this.getWizard(wizardUuid, userUuid); // Check ownership
    return await this.repository.listPhases(wizardUuid);
  }

  async createPhase(wizardUuid, userUuid, data) {
    await this.getWizard(wizardUuid, userUuid); // Check ownership
    
    return await this.repository.createPhase({
      wizard_uuid: wizardUuid,
      name: data.name,
      description: data.description,
      display_order: data.display_order || 0
    });
  }

  async updatePhase(wizardUuid, phaseUuid, userUuid, data) {
    await this.getWizard(wizardUuid, userUuid); // Check ownership
    
    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found');
    
    return await this.repository.updatePhase(phaseUuid, wizardUuid, {
      name: data.name,
      description: data.description,
      display_order: data.display_order
    });
  }

  async deletePhase(wizardUuid, phaseUuid, userUuid) {
    await this.getWizard(wizardUuid, userUuid); // Check ownership
    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found');
    
    return await this.repository.deletePhase(phaseUuid, wizardUuid);
  }

  // --- Steps ---
  async listSteps(wizardUuid, phaseUuid, userUuid) {
    await this.getWizard(wizardUuid, userUuid); // Check ownership
    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found');
    
    return await this.repository.listSteps(phaseUuid);
  }

  async createStep(wizardUuid, phaseUuid, userUuid, data) {
    const wizard = await this.getWizard(wizardUuid, userUuid); // Check ownership
    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found');
    
    // Validate template belongs to the wizard's object
    const isValid = await this.repository.isTemplateBelongsToObject(data.template_uuid, wizard.object_uuid);
    if (!isValid) {
      throw new Error('Template does not belong to the selected Object');
    }
    
    return await this.repository.createStep({
      phase_uuid: phaseUuid,
      template_uuid: data.template_uuid,
      name: data.name,
      description: data.description,
      display_order: data.display_order || 0
    });
  }

  async updateStep(wizardUuid, phaseUuid, stepUuid, userUuid, data) {
    const wizard = await this.getWizard(wizardUuid, userUuid); // Check ownership
    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found');
    
    const step = await this.repository.getStepByUuid(stepUuid, phaseUuid);
    if (!step) throw new Error('Step not found');
    
    if (data.template_uuid && data.template_uuid !== step.template_uuid) {
      const isValid = await this.repository.isTemplateBelongsToObject(data.template_uuid, wizard.object_uuid);
      if (!isValid) {
        throw new Error('Template does not belong to the selected Object');
      }
    }
    
    return await this.repository.updateStep(stepUuid, phaseUuid, {
      template_uuid: data.template_uuid,
      name: data.name,
      description: data.description,
      display_order: data.display_order
    });
  }

  async deleteStep(wizardUuid, phaseUuid, stepUuid, userUuid) {
    await this.getWizard(wizardUuid, userUuid); // Check ownership
    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found');
    
    const step = await this.repository.getStepByUuid(stepUuid, phaseUuid);
    if (!step) throw new Error('Step not found');
    
    return await this.repository.deleteStep(stepUuid, phaseUuid);
  }
  
  // --- Public View ---
  async getPublicWizard(name) {
    const wizard = await this.repository.getWizardByName(name);
    if (!wizard) throw new Error('Wizard not found');
    if (wizard.type !== 'EXTERNAL') throw new Error('Wizard is not accessible publicly');
    
    // Get phases
    const phases = await this.repository.listPhases(wizard.uuid);
    const phasesWithSteps = [];
    
    // We need object's fields to construct the template
    const fields = await this.objectsRepository.listFields(wizard.object_uuid);
    
    for (const phase of phases) {
      const steps = await this.repository.listSteps(phase.uuid);
      const enrichedSteps = [];
      
      for (const step of steps) {
        // Fetch template
        const template = await this.objectsRepository.getTemplateByUuid(wizard.object_uuid, step.template_uuid);
        let layout = [];
        if (template && template.jsonBuilderConfig) {
           let config = template.jsonBuilderConfig;
           if (typeof config === 'string') {
             try { config = JSON.parse(config); } catch (e) { config = []; }
           }
           layout = config;
        }
        
        enrichedSteps.push({
          ...step,
          template: {
            uuid: template ? template.uuid : null,
            name: template ? template.name : null,
            layout: layout
          }
        });
      }
      
      phasesWithSteps.push({
        ...phase,
        steps: enrichedSteps
      });
    }
    
    return {
      wizard: {
        uuid: wizard.uuid,
        name: wizard.name,
        type: wizard.type,
      },
      phases: phasesWithSteps,
      fields: fields.map(f => ({
        uuid: f.uuid,
        field_name: f.field_name,
        label: f.label,
        field_type: f.field_type,
        placeholder: f.placeholder,
        default_value: f.default_value,
        is_required: f.is_required,
        options: f.options,
        validation_rules: f.validation_rules
      }))
    };
  }

  async submitPublicWizard(name, payload) {
    const wizard = await this.repository.getWizardByName(name);
    if (!wizard) throw new Error('Wizard not found');
    if (wizard.type !== 'EXTERNAL') throw new Error('Wizard is not accessible publicly');
    
    const fields = await this.objectsRepository.listFields(wizard.object_uuid);
    const recordData = {};
    
    for (const field of fields) {
      let val = payload[field.field_name];
      
      // Validation
      if (field.is_required && (val === undefined || val === null || val === '')) {
        throw new Error(`Field ${field.label} is required`);
      }
      
      if (val !== undefined && val !== null && val !== '') {
        if (field.field_type === 'NUMBER' && isNaN(Number(val))) {
          throw new Error(`Field ${field.label} must be a valid number`);
        }
        
        if (field.options && (field.field_type === 'SELECT' || field.field_type === 'RADIO')) {
          let opts = field.options;
          if (typeof opts === 'string') opts = JSON.parse(opts);
          const validValues = Array.isArray(opts) ? opts.map(o => o.value || o) : [];
          if (!validValues.includes(val)) {
             throw new Error(`Invalid value for ${field.label}`);
          }
        }
        
        recordData[field.field_name] = String(val);
      }
    }
    
    await this.objectsRepository.createRecord(wizard.object_uuid, recordData);
    return { success: true };
  }
}

module.exports = FormWizardsService;
