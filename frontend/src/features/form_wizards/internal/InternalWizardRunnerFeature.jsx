import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import SButton from '@/components/common/SButton';
import DynamicFormRenderer from '@/components/common/dynamic_form';
import * as formWizardsService from '../formWizardsService';
import '../public/PublicFormWizard.css';

const InternalWizardRunnerFeature = () => {
  const { t } = useTranslation();
  const params = useParams();
  const pageUrl = params?.pageUrl;
  const navigate = useRouter();

  const [wizardData, setWizardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const { control, trigger, getValues, reset, formState: { isSubmitting } } = useForm({
    mode: 'onChange'
  });

  useEffect(() => {
    if (pageUrl) {
      loadData();
    }
  }, [pageUrl]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await formWizardsService.getInternalWizard(pageUrl);
      const data = res.wizard ? res : (res.data || {});
      setWizardData(data);

      const initialData = {};
      if (data.fields) {
        data.fields.forEach(f => {
          const fieldKey = f.fieldName;
          const defaultVal = f.defaultValue;
          if (defaultVal) initialData[fieldKey] = defaultVal;
        });
      }
      reset(initialData);
    } catch (err) {
      console.error('Failed to load internal wizard', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || t('admin.wizards.loadFailed'));
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

  if (!wizardData || !wizardData.wizard) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>{t('admin.wizards.notFound')}</p>
        <SButton
          text={t('admin.wizards.backToWizards')}
          color="secondary"
          onClick={() => navigate.push('/form-wizards')}
          style={{ marginTop: '1rem' }}
        />
      </div>
    );
  }

  const { wizard, phases = [], fields = [] } = wizardData;

  if (phases.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>{t('admin.wizards.noPhases')}</p>
        <SButton
          text={t('admin.wizards.backToRecords')}
          color="secondary"
          onClick={() => navigate.push(`/wizard/${pageUrl}`)}
          style={{ marginTop: '1rem' }}
        />
      </div>
    );
  }

  const currentPhase = phases[currentPhaseIndex] || phases[0];
  const steps = currentPhase?.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0];

  const stepLayout = currentStep?.template?.layout || [];
  const stepFields = fields.filter((f) => stepLayout.some((l) => l.field_uuid === f.uuid));

  const handleNext = async () => {
    const requiredFieldNames = stepFields.map((f) => f.fieldName);
    const isStepValid = await trigger(requiredFieldNames);
    if (!isStepValid) return;

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
      const payload = getValues();
      await formWizardsService.submitInternalWizard(pageUrl, payload);
      toast.success(t('admin.wizards.recordAddedSuccess'));
      const objectId = wizard?.objectUuid;
      if (objectId) {
        navigate.push(`/objects/${objectId}?tab=records`);
      } else {
        navigate.push('/form-wizards');
      }
    } catch (err) {
      console.error('Failed to submit form', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || t('admin.wizards.submissionFailed'));
    }
  };

  const isFirstStep = currentPhaseIndex === 0 && currentStepIndex === 0;
  const isLastStep = currentPhaseIndex === phases.length - 1 && currentStepIndex === currentPhase.steps.length - 1;
  const globalStepOffset = phases.slice(0, currentPhaseIndex).reduce((acc, p) => acc + p.steps.length, 0);

  const navigateToPhase = async (pIdx) => {
    if (pIdx <= currentPhaseIndex) {
      setCurrentPhaseIndex(pIdx);
      setCurrentStepIndex(0);
      return;
    }
    const requiredFieldNames = stepFields.map((f) => f.fieldName);
    const isValid = await trigger(requiredFieldNames);
    if (!isValid) return;
    const globalIdx = phases.slice(0, currentPhaseIndex).reduce((acc, p) => acc + p.steps.length, 0) + currentStepIndex;
    setCompletedSteps((prev) => new Set([...prev, globalIdx]));
    setCurrentPhaseIndex(pIdx);
    setCurrentStepIndex(0);
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top navigation back link */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
        <SButton
          text={t('admin.wizards.prev')}
          color="secondary"
          onClick={() => {
            const objectId = wizard?.objectUuid;
            if (objectId) {
              navigate.push(`/objects/${objectId}?tab=records`);
            } else {
              navigate.push('/form-wizards');
            }
          }}
        />
      </div>

      <div className="pfw-root" style={{ minHeight: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="pfw-header" style={{ borderRadius: '12px 12px 0 0' }}>
          <h1 className="pfw-title">{wizard.name}</h1>
          <p className="pfw-subtitle">
            Add Record &bull; Step {currentStepIndex + 1} of {currentPhase.steps.length} in Phase {currentPhaseIndex + 1}
          </p>
        </div>

        {/* Phase Tabs */}
        {phases.length > 1 && (
          <div className="pfw-phase-tabs">
            {phases.map((phase, pIdx) => {
              const isCurrent = pIdx === currentPhaseIndex;
              const isDone = pIdx < currentPhaseIndex;
              return (
                <div
                  key={phase.uuid}
                  className={`pfw-phase-tab ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
                  onClick={() => navigateToPhase(pIdx)}
                >
                  <span className="pfw-phase-tab-num">
                    {isDone ? <Check size={11} strokeWidth={3} /> : pIdx + 1}
                  </span>
                  <span>{phase.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Steps Stepper */}
        {steps.length > 0 && (
          <div className="pfw-stepper">
            {steps.map((step, sIdx) => {
              const globalIdx = globalStepOffset + sIdx;
              const isCurrent = sIdx === currentStepIndex;
              const isDone = completedSteps.has(globalIdx);
              const isLast = sIdx === steps.length - 1;

              return (
                <React.Fragment key={step.uuid}>
                  <div className={`pfw-step-node ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                    <div className="pfw-step-circle">
                      {isDone ? <Check size={14} strokeWidth={2.5} /> : sIdx + 1}
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
        <div className="pfw-body" style={{ padding: '1.5rem' }}>
          <div className="pfw-form-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {currentStep?.description && (
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
    </div>
  );
};

export default InternalWizardRunnerFeature;
