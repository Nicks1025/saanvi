const FormWizardsService = require('./formWizardsService');

describe('FormWizardsService - Step Creation & Relationship Validation', () => {
  let service;
  let mockRepo;
  let mockObjectsRepo;

  const userUuid = 'user-uuid-1';
  const wizardUuid = 'wizard-uuid-1';
  const objectUuid = 'object-uuid-1';
  const phaseUuid = 'phase-uuid-1';
  const templateUuid = 'template-uuid-1';

  beforeEach(() => {
    mockRepo = {
      getWizardByUuid: jest.fn(),
      getPhaseByUuid: jest.fn(),
      getStepByUuid: jest.fn(),
      isTemplateBelongsToObject: jest.fn(),
      createStep: jest.fn(),
      updateStep: jest.fn(),
    };

    mockObjectsRepo = {
      getObjectByUuid: jest.fn(),
    };

    service = new FormWizardsService();
    service.repository = mockRepo;
    service.objectsRepository = mockObjectsRepo;
  });

  test('successfully creates a step when wizard, phase, and template belong to the linked object', async () => {
    // 1. Wizard exists and linked to objectUuid
    mockRepo.getWizardByUuid.mockResolvedValue({
      uuid: wizardUuid,
      name: 'Test Wizard',
      object_uuid: objectUuid,
      created_by: userUuid,
    });

    // 2. Phase exists and belongs to wizard
    mockRepo.getPhaseByUuid.mockResolvedValue({
      uuid: phaseUuid,
      wizard_uuid: wizardUuid,
      name: 'Phase 1',
    });

    // 3. Template belongs to object
    mockRepo.isTemplateBelongsToObject.mockResolvedValue(true);

    // 4. Step creation returns created step
    mockRepo.createStep.mockResolvedValue({
      uuid: 'step-uuid-1',
      phase_uuid: phaseUuid,
      template_uuid: templateUuid,
      name: 'Step 1',
      description: 'Step 1 description',
      display_order: 1,
      created_at: new Date().toISOString(),
    });

    const result = await service.createStep(wizardUuid, phaseUuid, userUuid, {
      templateUuid,
      name: 'Step 1',
      description: 'Step 1 description',
      displayOrder: 1,
    });

    expect(result).toBeDefined();
    expect(result.uuid).toBe('step-uuid-1');
    expect(result.templateUuid).toBe(templateUuid);
    expect(result.phaseUuid).toBe(phaseUuid);

    // Verify isTemplateBelongsToObject was called with the authoritative objectUuid from the wizard!
    expect(mockRepo.isTemplateBelongsToObject).toHaveBeenCalledWith(templateUuid, objectUuid);
  });

  test('rejects step creation when template belongs to a different object (cross-object rejection)', async () => {
    mockRepo.getWizardByUuid.mockResolvedValue({
      uuid: wizardUuid,
      name: 'Test Wizard',
      object_uuid: objectUuid,
      created_by: userUuid,
    });

    mockRepo.getPhaseByUuid.mockResolvedValue({
      uuid: phaseUuid,
      wizard_uuid: wizardUuid,
      name: 'Phase 1',
    });

    // Template belongs to another object -> false
    mockRepo.isTemplateBelongsToObject.mockResolvedValue(false);

    await expect(service.createStep(wizardUuid, phaseUuid, userUuid, {
      templateUuid: 'foreign-template-uuid',
      name: 'Foreign Step',
    })).rejects.toThrow('Template does not belong to the selected Object');

    expect(mockRepo.createStep).not.toHaveBeenCalled();
  });

  test('rejects step creation when wizard does not exist or user lacks permission', async () => {
    mockRepo.getWizardByUuid.mockResolvedValue(null);

    await expect(service.createStep(wizardUuid, phaseUuid, userUuid, {
      templateUuid,
      name: 'Step 1',
    })).rejects.toThrow('Wizard not found or you do not have permission');

    expect(mockRepo.isTemplateBelongsToObject).not.toHaveBeenCalled();
    expect(mockRepo.createStep).not.toHaveBeenCalled();
  });

  test('rejects step creation when phase does not belong to the wizard', async () => {
    mockRepo.getWizardByUuid.mockResolvedValue({
      uuid: wizardUuid,
      name: 'Test Wizard',
      object_uuid: objectUuid,
      created_by: userUuid,
    });

    // Phase not found for this wizard
    mockRepo.getPhaseByUuid.mockResolvedValue(null);

    await expect(service.createStep(wizardUuid, phaseUuid, userUuid, {
      templateUuid,
      name: 'Step 1',
    })).rejects.toThrow('Phase not found or does not belong to this Wizard');

    expect(mockRepo.isTemplateBelongsToObject).not.toHaveBeenCalled();
    expect(mockRepo.createStep).not.toHaveBeenCalled();
  });

  test('rejects step creation when templateUuid is missing before repository call', async () => {
    mockRepo.getWizardByUuid.mockResolvedValue({
      uuid: wizardUuid,
      name: 'Test Wizard',
      object_uuid: objectUuid,
      created_by: userUuid,
    });

    mockRepo.getPhaseByUuid.mockResolvedValue({
      uuid: phaseUuid,
      wizard_uuid: wizardUuid,
      name: 'Phase 1',
    });

    await expect(service.createStep(wizardUuid, phaseUuid, userUuid, {
      name: 'Step 1',
    })).rejects.toThrow('templateUuid is required');

    expect(mockRepo.isTemplateBelongsToObject).not.toHaveBeenCalled();
    expect(mockRepo.createStep).not.toHaveBeenCalled();
  });
});
