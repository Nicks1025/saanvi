import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { Check } from 'lucide-react';
import SButton from '@/components/common/SButton';
import DynamicFormRenderer from '@/components/common/DynamicFormRenderer';
import * as formWizardsService from '../formWizardsService';
import './PublicFormWizard.css';

const PublicFormWizardFeature = () => {
  const { name } = useParams();

  const [wizardData, setWizardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isSuccess, setIsSuccess] = useState(false);

  const { control, trigger, getValues, reset, formState: { isSubmitting } } = useForm({
    mode: 'onChange'
  });

  useEffect(() => {
    fetchWizard();
  }, [name]);

  const fetchWizard = async () => {
    try {
      const res = await formWizardsService.getPublicWizard(name);
      const data = res.wizard ? res : res.data;
      setWizardData(data);
      if (data && data.fields) {
        const initialData = {};
        data.fields.forEach(f => {
          if (f.default_value) initialData[f.field_name] = f.default_value;
        });
        reset(initialData);
      }
    } catch (err) {
      toast.error('Failed to load wizard or it does not exist');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pfw-loading">
        <div className="pfw-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!wizardData) {
    return <div className="pfw-error">Wizard not found.</div>;
  }

  if (isSuccess) {
    return (
      <div className="pfw-success">
        <div className="pfw-success-icon"><Check size={40} strokeWidth={3} /></div>
        <h1>Submitted Successfully!</h1>
        <p>Your information has been received. Thank you!</p>
      </div>
    );
  }

  const { wizard, phases, fields } = wizardData;

  const currentPhase = phases[currentPhaseIndex];
  if (!currentPhase) return <div className="pfw-error">No phases configured for this wizard.</div>;

  const currentStep = currentPhase.steps[currentStepIndex];
  if (!currentStep) return <div className="pfw-error">No steps configured for this phase.</div>;

  const getStepFields = () => {
    const layout = currentStep.template?.layout || [];
    return layout.reduce((acc, layoutField) => {
      const fieldDef = fields.find(f => f.uuid === layoutField.field_uuid);
      if (fieldDef) acc.push({ ...fieldDef, ...layoutField });
      return acc;
    }, []);
  };

  // Groups step fields into rows/columns matching the template layout grid
  const getStepRows = () => {
    const stepFields = getStepFields();
    if (stepFields.length === 0) return [];

    const rowMap = {};
    stepFields.forEach(field => {
      const r = field.row_number ?? 0;
      const c = field.column_number ?? 0;
      if (!rowMap[r]) rowMap[r] = {};
      if (!rowMap[r][c]) rowMap[r][c] = [];
      rowMap[r][c].push(field);
    });

    return Object.keys(rowMap)
      .sort((a, b) => Number(a) - Number(b))
      .map(r => ({
        rowKey: r,
        cols: Object.keys(rowMap[r])
          .sort((a, b) => Number(a) - Number(b))
          .map(c => ({ colKey: c, fields: rowMap[r][c], width: rowMap[r][c][0]?.width || 12 }))
      }));
  };

  const handleNext = async () => {
    const requiredFieldNames = getStepFields().map(f => f.field_name);
    const isStepValid = await trigger(requiredFieldNames);
    if (!isStepValid) return;

    // Mark current step as completed
    const globalIdx = phases.slice(0, currentPhaseIndex).reduce((acc, p) => acc + p.steps.length, 0) + currentStepIndex;
    setCompletedSteps(prev => new Set([...prev, globalIdx]));

    if (currentStepIndex < currentPhase.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else if (currentPhaseIndex < phases.length - 1) {
      setCurrentPhaseIndex(currentPhaseIndex + 1);
      setCurrentStepIndex(0);
    } else {
      submitForm();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    } else if (currentPhaseIndex > 0) {
      setCurrentPhaseIndex(currentPhaseIndex - 1);
      const prevPhase = phases[currentPhaseIndex - 1];
      setCurrentStepIndex(prevPhase.steps.length - 1);
    }
  };

  const submitForm = async () => {
    try {
      await formWizardsService.submitPublicWizard(name, getValues());
      setIsSuccess(true);
      toast.success('Submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Submission failed');
    }
  };

  const stepFields = getStepFields();
  const stepRows = getStepRows();
  const isFirstStep = currentPhaseIndex === 0 && currentStepIndex === 0;
  const isLastStep = currentPhaseIndex === phases.length - 1 && currentStepIndex === currentPhase.steps.length - 1;

  // Global step offset for completed check
  const globalStepOffset = phases.slice(0, currentPhaseIndex).reduce((acc, p) => acc + p.steps.length, 0);

  const navigateToPhase = async (pIdx) => {
    // Going backward — no validation needed
    if (pIdx <= currentPhaseIndex) {
      setCurrentPhaseIndex(pIdx);
      setCurrentStepIndex(0);
      return;
    }
    // Going forward — validate current step first
    const requiredFieldNames = getStepFields().map(f => f.field_name);
    const isValid = await trigger(requiredFieldNames);
    if (!isValid) return;
    const globalIdx = phases.slice(0, currentPhaseIndex).reduce((acc, p) => acc + p.steps.length, 0) + currentStepIndex;
    setCompletedSteps(prev => new Set([...prev, globalIdx]));
    setCurrentPhaseIndex(pIdx);
    setCurrentStepIndex(0);
  };

  const navigateToStep = async (sIdx) => {
    // Going backward — no validation needed
    if (sIdx <= currentStepIndex) {
      setCurrentStepIndex(sIdx);
      return;
    }
    // Going forward — validate current step first
    const requiredFieldNames = getStepFields().map(f => f.field_name);
    const isValid = await trigger(requiredFieldNames);
    if (!isValid) return;
    const globalIdx = phases.slice(0, currentPhaseIndex).reduce((acc, p) => acc + p.steps.length, 0) + currentStepIndex;
    setCompletedSteps(prev => new Set([...prev, globalIdx]));
    setCurrentStepIndex(sIdx);
  };

  return (
    <div className="pfw-root">

      {/* Page Header */}
      <div className="pfw-header">
        <h1 className="pfw-title">{wizard.name}</h1>
        {wizard.description && <p className="pfw-subtitle">{wizard.description}</p>}
      </div>

      {/* Phase Tabs */}
      <div className="pfw-phase-tabs">
        {phases.map((phase, pIdx) => {
          const isPhaseActive = pIdx === currentPhaseIndex;
          const isPhaseCompleted = pIdx < currentPhaseIndex;

          return (
            <div
              key={phase.uuid}
              className={`pfw-phase-tab ${isPhaseActive ? 'active' : ''} ${isPhaseCompleted ? 'done' : ''}`}
              onClick={() => navigateToPhase(pIdx)}
            >
              <span className="pfw-phase-tab-num">
                {isPhaseCompleted ? <Check size={12} strokeWidth={3} /> : pIdx + 1}
              </span>
              {phase.name}
            </div>
          );
        })}
      </div>

      {/* Step Stepper (for current phase's steps) */}
      {currentPhase.steps.length > 1 && (
        <div className="pfw-stepper">
          {currentPhase.steps.map((step, sIdx) => {
            const globalIdx = globalStepOffset + sIdx;
            const isActive = sIdx === currentStepIndex;
            const isDone = completedSteps.has(globalIdx);
            const isLast = sIdx === currentPhase.steps.length - 1;

            return (
              <React.Fragment key={step.uuid}>
                <div
                  className={`pfw-step-node ${isActive ? 'active' : isDone ? 'done' : ''}`}
                  onClick={() => navigateToStep(sIdx)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="pfw-step-circle">
                    {isDone ? <Check size={13} strokeWidth={3} /> : <span>{sIdx + 1}</span>}
                  </div>
                  <span className="pfw-step-name">{step.name}</span>
                </div>
                {!isLast && <div className={`pfw-step-connector ${isDone ? 'done' : ''}`} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Centered Form */}
      <div className="pfw-body">
        <div className="pfw-form-card">

          {currentStep.description && (
            <p className="pfw-step-desc">{currentStep.description}</p>
          )}

            <div className="pfw-form-body">
              {stepRows.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No fields in this step.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {stepRows.map(({ rowKey, cols }) => (
                    <div key={rowKey} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {cols.map(({ colKey, fields: colFields, width }) => (
                        <div
                          key={colKey}
                          style={{
                            flex: `0 0 calc(${(width / 12) * 100}% - 0.5rem)`,
                            minWidth: '150px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                          }}
                        >
                          {colFields.map((field, idx) => (
                            <DynamicFormRenderer key={`${field.uuid}-${idx}`} fields={[field]} control={control} />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

          <div className="pfw-form-footer">
            <SButton
              text="← Back"
              onClick={handleBack}
              disabled={isFirstStep}
              color="secondary"
            />
            <SButton
              text={isLastStep ? 'Submit' : 'Next →'}
              onClick={handleNext}
              color="primary"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default PublicFormWizardFeature;
