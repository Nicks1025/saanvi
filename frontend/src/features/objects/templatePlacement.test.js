import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPlacement, generatePlacementUuid } from './useTemplateBuilder.js';

describe('Template Builder Field Reuse & Placement Model', () => {
  it('should generate distinct placement UUIDs for identical field UUIDs', () => {
    const fieldUuid = 'field-first-name-123';
    const placement1 = createPlacement(fieldUuid);
    const placement2 = createPlacement(fieldUuid);

    assert.equal(placement1.fieldUuid, fieldUuid);
    assert.equal(placement2.fieldUuid, fieldUuid);
    assert.notEqual(placement1.placementUuid, placement2.placementUuid);
  });

  it('should preserve explicit placementUuid when rehydrating saved layout', () => {
    const fieldUuid = 'field-email-456';
    const existingPlacementUuid = 'placement-xyz-999';
    const placement = createPlacement(fieldUuid, existingPlacementUuid);

    assert.equal(placement.fieldUuid, fieldUuid);
    assert.equal(placement.placementUuid, existingPlacementUuid);
  });

  it('should allow multiple instances of the same field in one column and support removing one placement without affecting others', () => {
    const fieldUuid = 'field-phone-789';
    const placementA = createPlacement(fieldUuid, 'placement-a');
    const placementB = createPlacement(fieldUuid, 'placement-b');
    const placementC = createPlacement('field-address-101', 'placement-c');

    let columnFields = [placementA, placementB, placementC];
    assert.equal(columnFields.length, 3);
    assert.equal(columnFields.filter(p => p.fieldUuid === fieldUuid).length, 2);

    // Remove placementA by placementUuid
    const removalTargetPlacementUuid = 'placement-a';
    columnFields = columnFields.filter(p => p.placementUuid !== removalTargetPlacementUuid);

    // Verify placementA was removed but placementB (same fieldUuid) remains intact
    assert.equal(columnFields.length, 2);
    const remainingSameFields = columnFields.filter(p => p.fieldUuid === fieldUuid);
    assert.equal(remainingSameFields.length, 1);
    assert.equal(remainingSameFields[0].placementUuid, 'placement-b');
  });

  it('should support deterministic DOM input ID derivation from placementUuid', () => {
    const placement = createPlacement('field-uuid-1', 'p-uuid-99');
    const inputId = placement.placementUuid ? `input_${placement.placementUuid}` : `input_${placement.fieldUuid}`;
    assert.equal(inputId, 'input_p-uuid-99');
  });
});
