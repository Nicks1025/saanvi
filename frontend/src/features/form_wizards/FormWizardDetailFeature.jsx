import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import SDataTable from '@/components/common/SDataTable';
import SModal from '@/components/common/SModal';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import SDropdown from '@/components/common/SDropdown';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical, ArrowRight } from 'lucide-react';
import * as formWizardsService from './formWizardsService';
import * as objectsService from '../objects/objectsService';

const FormWizardDetailFeature = () => {
  const { uuid } = useParams();
  const navigate = useRouter();

  const [wizard, setWizard] = useState(null);
  const [phases, setPhases] = useState([]);
  const [steps, setSteps] = useState({}); // phaseUuid -> steps array
  const [templates, setTemplates] = useState([]); // from the target object
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState({});

  // Modals
  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null, phaseUuid: null });

  useEffect(() => {
    fetchWizardData();
  }, [uuid]);

  const fetchWizardData = async () => {
    setLoading(true);
    try {
      const res = await formWizardsService.getWizard(uuid);
      const wizardData = res.uuid ? res : (res.data || res);
      setWizard(wizardData);

      // Fetch templates for the target object
      const tplRes = await objectsService.getTemplates(wizardData.object_uuid);
      setTemplates(Array.isArray(tplRes) ? tplRes : (tplRes?.data || []));

      await fetchPhases(wizardData.uuid);
    } catch (err) {
      toast.error('Failed to load wizard details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhases = async (wizardUuid) => {
    try {
      const res = await formWizardsService.getPhases(wizardUuid);
      const phasesData = Array.isArray(res) ? res : (res.data || []);
      setPhases(phasesData);

      const stepsData = {};
      for (const phase of phasesData) {
        const sRes = await formWizardsService.getSteps(wizardUuid, phase.uuid);
        stepsData[phase.uuid] = Array.isArray(sRes) ? sRes : (sRes.data || []);
      }
      setSteps(stepsData);
    } catch (err) {
      toast.error('Failed to load phases');
    }
  };

  // --- Actions ---
  const handleConfirm = async () => {
    try {
      const { type, data, phaseUuid } = modalState;
      if (type === 'createPhase') {
        if (!data.name) return toast.error('Name is required');
        await formWizardsService.createPhase(wizard.uuid, data);
        toast.success('Phase created');
      } else if (type === 'editPhase') {
        if (!data.name) return toast.error('Name is required');
        await formWizardsService.updatePhase(wizard.uuid, data.uuid, data);
        toast.success('Phase updated');
      } else if (type === 'deletePhase') {
        await formWizardsService.deletePhase(wizard.uuid, data.uuid);
        toast.success('Phase deleted');
      } else if (type === 'createStep') {
        if (!data.name || !data.template_uuid) return toast.error('Name and Template are required');
        await formWizardsService.createStep(wizard.uuid, phaseUuid, data);
        toast.success('Step created');
      } else if (type === 'editStep') {
        if (!data.name || !data.template_uuid) return toast.error('Name and Template are required');
        await formWizardsService.updateStep(wizard.uuid, phaseUuid, data.uuid, data);
        toast.success('Step updated');
      } else if (type === 'deleteStep') {
        await formWizardsService.deleteStep(wizard.uuid, phaseUuid, data.uuid);
        toast.success('Step deleted');
      }

      setModalState({ isOpen: false, type: null, data: null, phaseUuid: null });
      fetchPhases(wizard.uuid);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save');
    }
  };

  const renderPhases = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', width: '100%' }}>

        {/* Table Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--accent)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Phases and Steps</h2>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '0.25rem' }}
            onClick={() => setModalState({ isOpen: true, type: 'createPhase', data: { name: '', description: '', display_order: 0 } })}
            title="Add Phase"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tree Table Body */}
        <div style={{ border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)' }}>
          {phases.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No phases added yet. Create a phase to get started.</div>
          ) : (
            phases.map((phase, phaseIdx) => {
              const isExpanded = expandedPhases[phase.uuid];
              const phaseOrder = phaseIdx + 1;
              const phasePath = `/wizard/${wizard.uuid}/[[UUID]]/${phase.uuid}`;

              return (
                <div key={phase.uuid} style={{ borderBottom: phaseIdx < phases.length - 1 ? '1px solid var(--border)' : 'none' }}>

                  {/* Phase Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--surface-hover, rgba(0, 0, 0, 0.02))',
                    cursor: 'pointer'
                  }} onClick={() => togglePhase(phase.uuid)}>

                    {/* Col 1: Chevron + Number + Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)', fontWeight: 500 }}>{phaseOrder}</span>
                      <span style={{ fontWeight: 500, marginLeft: '1rem' }}>{phase.name}</span>
                    </div>

                    {/* Col 3: Actions */}
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <button className="manage-btn" style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)' }} onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'createStep', phaseUuid: phase.uuid, data: { name: '', description: '', display_order: 0, template_uuid: '' } }) }} title="Add Step">
                        <Plus size={16} strokeWidth={2.5} />
                      </button>
                      <button className="manage-btn" style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)' }} onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'editPhase', data: phase }) }} title="Edit Phase">
                        <Pencil size={16} />
                      </button>
                      <button className="manage-btn" style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, type: 'deletePhase', data: phase }) }} title="Delete Phase">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Step Rows */}
                  {isExpanded && steps[phase.uuid] && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {steps[phase.uuid].map((step, stepIdx) => {
                        const stepOrder = `${phaseOrder}.${stepIdx + 1}`;
                        const stepPath = `/wizard/${wizard.uuid}/[[UUID]]/${phase.uuid}/${step.name}`;

                        return (
                          <div key={step.uuid} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem 0.75rem 3rem',
                            borderBottom: stepIdx < steps[phase.uuid].length - 1 ? '1px solid var(--border)' : 'none',
                            background: 'var(--surface)'
                          }}>
                            {/* Col 1: Drag + Number + Name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <GripVertical size={16} color="var(--text-secondary)" style={{ cursor: 'grab' }} />
                              <span style={{ fontSize: '0.875rem' }}>{stepOrder}</span>
                              <span style={{ fontSize: '0.875rem', marginLeft: '1rem' }}>{step.name}</span>
                            </div>

                            {/* Col 3: Actions */}
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                              <button className="manage-btn" style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)' }} onClick={() => setModalState({ isOpen: true, type: 'editStep', phaseUuid: phase.uuid, data: step })} title="Edit Step">
                                <Pencil size={16} />
                              </button>
                              <button className="manage-btn" style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)' }} onClick={() => navigate.push(`/objects/${wizard.object_uuid}/template/${step.template_uuid}`)} title="Go to Template">
                                <ArrowRight size={16} />
                              </button>
                              <button className="manage-btn" style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={() => setModalState({ isOpen: true, type: 'deleteStep', phaseUuid: phase.uuid, data: step })} title="Delete Step">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const templateOptions = templates.map(t => ({ label: t.name, value: t.uuid }));

  const togglePhase = (phaseUuid) => {
    setExpandedPhases(prev => ({ ...prev, [phaseUuid]: !prev[phaseUuid] }));
  };

  return (
    <div className="admin-users-container page-container">
      {wizard && (
        <div style={{ padding: '1rem 1.5rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>{wizard.name}</h1>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {!loading && wizard && renderPhases()}
      </div>

      <SModal
        isOpen={modalState.isOpen}
        title={
          modalState.type === 'createPhase' ? 'Create Phase' :
            modalState.type === 'editPhase' ? 'Edit Phase' :
              modalState.type === 'deletePhase' ? 'Delete Phase' :
                modalState.type === 'createStep' ? 'Create Step' :
                  modalState.type === 'editStep' ? 'Edit Step' : 'Delete Step'
        }
        onConfirm={handleConfirm}
        onCancel={() => setModalState({ isOpen: false, type: null, data: null, phaseUuid: null })}
        confirmColor={['deletePhase', 'deleteStep'].includes(modalState.type) ? 'danger' : 'primary'}
      >
        {modalState.data && ['createPhase', 'editPhase'].includes(modalState.type) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
            <STextField
              label="Phase Name"
              text={modalState.data.name || ''}
              onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, name: e.target.value } })}
            />
            <STextField
              label="Description"
              text={modalState.data.description || ''}
              onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, description: e.target.value } })}
            />
          </div>
        )}

        {modalState.data && ['createStep', 'editStep'].includes(modalState.type) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
            <STextField
              label="Step Name"
              text={modalState.data.name || ''}
              onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, name: e.target.value } })}
            />
            <STextField
              label="Description"
              text={modalState.data.description || ''}
              onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, description: e.target.value } })}
            />
            <SDropdown
              label="Template"
              value={modalState.data.template_uuid || ''}
              options={templateOptions}
              onChange={(val) => setModalState({ ...modalState, data: { ...modalState.data, template_uuid: val } })}
            />
          </div>
        )}

        {modalState.data && ['deletePhase', 'deleteStep'].includes(modalState.type) && (
          <div style={{ paddingTop: '1rem' }}>
            Are you sure you want to delete this {modalState.type === 'deletePhase' ? 'phase' : 'step'}?
          </div>
        )}
      </SModal>
    </div>
  );
};

export default FormWizardDetailFeature;
