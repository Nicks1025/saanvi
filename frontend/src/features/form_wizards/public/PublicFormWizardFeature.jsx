import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import SButton from '@/components/common/SButton';
import DynamicFormRenderer from '@/components/common/dynamic_form';
import * as formWizardsService from '../formWizardsService';
import './PublicFormWizard.css';

const PublicFormWizardFeature = () => {
  const { t } = useTranslation();
  const params = useParams();
  const identifier = params?.targetUrl || params?.name;

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
    if (identifier) {
      fetchWizard();
    }
  }, [identifier]);

  const fetchWizard = async () => {
    try {
      const res = await formWizardsService.getPublicWizard(identifier);
      const data = res.wizard ? res : res.data;
      setWizardData(data);
      if (data && data.fields) {
        const initialData = {};
        data.fields.forEach(f => {
          const fieldKey = f.fieldName;
          const defaultVal = f.defaultValue;
          if (defaultVal) initialData[fieldKey] = defaultVal;
        });
        reset(initialData);
      }
    } catch (err) {
      toast.error(t('admin.wizards.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pfw-loading">
        <div className="pfw-spinner" />
        <p>{t('admin.wizards.loading')}</p>
      </div>
    );
  }

  if (!wizardData) {
    return <div className="pfw-error">{t('admin.wizards.notFound')}</div>;
  }

  if (isSuccess) {
    return (
      <div className="pfw-success">
        <div className="pfw-success-icon"><Check size={40} strokeWidth={3} /></div>
        <h1>{t('admin.wizards.successTitle')}</h1>
        <p>{t('admin.wizards.successDesc')}</p>
      </div>
    );
  }

  const { wizard, phases, fields } = wizardData;

  const currentPhase = phases[currentPhaseIndex];
  if (!currentPhase) return <div className="pfw-error">{t('admin.wizards.noPhases')}</div>;

  const currentStep = currentPhase.steps[currentStepIndex];
  if (!currentStep) return <div className="pfw-error">{t('admin.wizards.noSteps')}</div>;

  const stepLayout = currentStep.template?.layout || [];
  const stepFields = fields.filter((f) => stepLayout.some((l) => l.field_uuid === f.uuid));

  const handleNext = async () => {
    const requiredFieldNames = stepFields.map((f) => f.fieldName);
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
      await formWizardsService.submitPublicWizard(identifier, getValues());
      setIsSuccess(true);
      toast.success(t('admin.wizards.submittedSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || t('admin.wizards.submissionFailed'));
    }
  };

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
    const requiredFieldNames = stepFields.map(f => f.fieldName);
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
    const requiredFieldNames = stepFields.map(f => f.fieldName);
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
              {stepFields.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{t('admin.wizards.noFields')}</p>
              ) : (
                <DynamicFormRenderer
                  fields={fields}
                  layout={stepLayout}
                  control={control}
                />
              )}
            </div>

          <div className="pfw-form-footer">
            <SButton
              text={t('admin.wizards.prev')}
              onClick={handleBack}
              disabled={isFirstStep}
              color="secondary"
            />
            <SButton
              text={isLastStep ? t('admin.wizards.submit') : t('admin.wizards.next')}
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
