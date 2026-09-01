import React, { useState, useEffect, useMemo } from 'react';
import { getWorkflows, getSystemEvents, createWorkflow, getEmailTemplates, updateWorkflow, deleteWorkflow, getWorkflowDetails } from './communicationService';
import toast from 'react-hot-toast';
import { Workflow, Plus, Trash2, Save, Edit2, Eye, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SDataTable from '../../../components/common/SDataTable';
import SButton from '../../../components/common/SButton';
import SModal from '../../../components/common/SModal';

const flattenSchema = (schema, prefix = '') => {
  let fields = [];
  if (typeof schema === 'string') {
    try { schema = JSON.parse(schema); } catch(e) { return fields; }
  }
  if (schema && schema.type === 'object' && schema.properties) {
    Object.keys(schema.properties).forEach(key => {
      const prop = schema.properties[key];
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      if (prop.type === 'object' && prop.properties) {
        fields = fields.concat(flattenSchema(prop, newPrefix));
      } else {
        fields.push(newPrefix);
      }
    });
  }
  return fields;
};

const WorkflowsFeature = ({ fixedEvent, disableContainer = false, topTabs }) => {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState([]);
  const [systemEvents, setSystemEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // New/Edit Workflow State
  const [isCreating, setIsCreating] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState(null);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const getInitialWorkflowState = () => ({
    name: '',
    trigger_event_key: fixedEvent || '',
    conditions: [{ operator: 'ALWAYS', field_path: '', expected_value: '' }],
    actions: [{ 
      action_type: 'SEND_EMAIL', 
      configuration: { template_key: '', recipient_field: '' } 
    }]
  });

  const [newWorkflow, setNewWorkflow] = useState(getInitialWorkflowState());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wfRes, evRes, tplRes] = await Promise.all([
        getWorkflows(),
        getSystemEvents(),
        getEmailTemplates()
      ]);
      let wfs = wfRes.data || wfRes || [];
      if (fixedEvent) {
        wfs = wfs.filter(w => w.trigger_event_key === fixedEvent);
      }
      setWorkflows(wfs);
      setSystemEvents(evRes.data || evRes || []);
      setTemplates(tplRes.data || tplRes || []);
    } catch (err) {
      toast.error('Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (editingWorkflowId && !isViewing) {
        await updateWorkflow(editingWorkflowId, newWorkflow);
        toast.success('Workflow updated successfully');
      } else if (!isViewing) {
        await createWorkflow(newWorkflow);
        toast.success('Workflow created successfully');
      }
      setIsCreating(false);
      setIsViewing(false);
      setEditingWorkflowId(null);
      setNewWorkflow(getInitialWorkflowState());
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || (editingWorkflowId ? 'Failed to update workflow' : 'Failed to create workflow'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (wf) => {
    setIsCreating(true);
    setLoading(true);
    try {
      const detailsRes = await getWorkflowDetails(wf.id);
      const details = detailsRes.data || detailsRes;
      setNewWorkflow({
        name: details.name,
        trigger_event_key: details.trigger_event_key,
        active: details.active,
        conditions: details.conditions?.length > 0 ? details.conditions : [{ operator: 'ALWAYS', field_path: '', expected_value: '' }],
        actions: details.actions?.length > 0 ? details.actions : [{ 
          action_type: 'SEND_EMAIL', 
          configuration: { template_key: '', recipient_field: '' } 
        }]
      });
      setEditingWorkflowId(details.id);
      setIsViewing(false);
    } catch (err) {
      toast.error('Failed to load workflow details');
      setIsCreating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteWorkflowId(id);
  };

  const confirmDelete = async () => {
    if (!deleteWorkflowId) return;
    setIsDeleting(true);
    try {
      await deleteWorkflow(deleteWorkflowId);
      toast.success('Workflow deleted');
      setDeleteWorkflowId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete workflow');
      setDeleteWorkflowId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = async (wf) => {
    setIsCreating(true);
    setLoading(true);
    try {
      const detailsRes = await getWorkflowDetails(wf.id);
      const details = detailsRes.data || detailsRes;
      setNewWorkflow({
        name: details.name,
        trigger_event_key: details.trigger_event_key,
        active: details.active,
        conditions: details.conditions?.length > 0 ? details.conditions : [{ operator: 'ALWAYS', field_path: '', expected_value: '' }],
        actions: details.actions?.length > 0 ? details.actions : [{ 
          action_type: 'SEND_EMAIL', 
          configuration: { template_key: '', recipient_field: '' } 
        }]
      });
      setEditingWorkflowId(details.id);
      setIsViewing(true);
    } catch (err) {
      toast.error('Failed to load workflow details');
      setIsCreating(false);
    } finally {
      setLoading(false);
    }
  };

  const eventFields = useMemo(() => {
    if (!newWorkflow.trigger_event_key) return [];
    const evt = systemEvents.find(e => e.event_key === newWorkflow.trigger_event_key);
    if (!evt || !evt.payload_schema) return [];
    return flattenSchema(evt.payload_schema);
  }, [newWorkflow.trigger_event_key, systemEvents]);



  if (loading) return <div>Loading Workflows...</div>;

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true
    },
    {
      key: 'trigger_event_key',
      label: 'Trigger Event',
      sortable: true
    },
    {
      key: 'active',
      label: 'Status',
      render: (wf) => (
        <span style={{ 
          padding: '0.25rem 0.5rem', 
          borderRadius: '12px', 
          fontSize: '0.85rem',
          background: wf.active ? 'var(--success-bg, #e6f4ea)' : 'var(--error-bg, #fce8e6)',
          color: wf.active ? 'var(--success-text, #137333)' : 'var(--error-text, #c5221f)'
        }}>
          {wf.active ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  return (
    <div className={`admin-workflows-container ${disableContainer ? '' : 'page-container'}`}>
      {topTabs && (
        <div style={{ padding: '1rem 1rem 0 1rem', margin: '-1rem -1rem 1rem -1rem' }}>
          {topTabs}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
          <Workflow /> Workflows
        </h1>
        <SButton 
          onClick={() => {
            setIsCreating(!isCreating);
            if (!isCreating) {
              setEditingWorkflowId(null);
              setIsViewing(false);
              setNewWorkflow(getInitialWorkflowState());
            }
          }} 
          size="s"
          icon={isCreating ? <X size={16} /> : <Plus size={16} />}
        >
          {isCreating ? 'Cancel' : 'Create Workflow'}
        </SButton>
      </div>

      {isCreating && (
        <div style={{ background: 'var(--bg)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
          <h3>{isViewing ? 'View Workflow Configuration' : editingWorkflowId ? 'Edit Workflow Configuration' : 'New Workflow Configuration'}</h3>
          <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label>
                <span style={{display:'block', marginBottom:'0.25rem', fontWeight:500}}>Workflow Name</span>
                <input type="text" disabled={isViewing} value={newWorkflow.name} onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})} style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </label>
              <label>
                <span style={{display:'block', marginBottom:'0.25rem', fontWeight:500}}>Trigger Event</span>
                <select disabled={isViewing || !!fixedEvent} value={newWorkflow.trigger_event_key} onChange={(e) => setNewWorkflow({...newWorkflow, trigger_event_key: e.target.value})} style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}>
                  <option value="">Select Event...</option>
                  {systemEvents.map(e => <option key={e.event_key} value={e.event_key}>{e.name} ({e.event_key})</option>)}
                </select>
              </label>
            </div>
            
            <div style={{ padding: '1rem', background: 'var(--hover-bg)', borderRadius: '4px', border: '1px solid var(--border)' }}>
              <strong style={{ display: 'block', marginBottom: '1rem' }}>Condition Configuration</strong>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {newWorkflow.conditions[0].operator !== 'ALWAYS' && (
                  <select
                    disabled={isViewing}
                    value={newWorkflow.conditions[0].field_path || ''}
                    onChange={(e) => {
                      const conditions = [...newWorkflow.conditions];
                      conditions[0].field_path = e.target.value;
                      setNewWorkflow({...newWorkflow, conditions});
                    }}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', flex: 1 }}
                  >
                    <option value="">Select payload field...</option>
                    {eventFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                )}

                <select 
                  disabled={isViewing} 
                  value={newWorkflow.conditions[0].operator}
                  onChange={(e) => {
                    const conditions = [...newWorkflow.conditions];
                    conditions[0].operator = e.target.value;
                    setNewWorkflow({...newWorkflow, conditions});
                  }}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', minWidth: '150px' }}
                >
                  <option value="ALWAYS">Always run</option>
                  <option value="EXISTS">Field exists</option>
                  <option value="EQUALS">Field equals</option>
                  <option value="NOT_EQUALS">Field not equals</option>
                </select>

                {newWorkflow.conditions[0].operator !== 'ALWAYS' && (newWorkflow.conditions[0].operator === 'EQUALS' || newWorkflow.conditions[0].operator === 'NOT_EQUALS') && (
                  <input
                    type="text"
                    placeholder="Expected value"
                    disabled={isViewing}
                    value={newWorkflow.conditions[0].expected_value || ''}
                    onChange={(e) => {
                      const conditions = [...newWorkflow.conditions];
                      conditions[0].expected_value = e.target.value;
                      setNewWorkflow({...newWorkflow, conditions});
                    }}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', flex: 1 }}
                  />
                )}
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--hover-bg)', borderRadius: '4px', border: '1px solid var(--border)' }}>
              <strong style={{ display: 'block', marginBottom: '1rem' }}>Action Configuration (SEND_EMAIL)</strong>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <label>
                  <span style={{display:'block', marginBottom:'0.25rem', fontWeight:500, fontSize: '0.9rem'}}>Email Template</span>
                  <select 
                    disabled={isViewing}
                    value={newWorkflow.actions[0].configuration.template_key} 
                    onChange={(e) => {
                      const actions = [...newWorkflow.actions];
                      actions[0].configuration.template_key = e.target.value;
                      setNewWorkflow({...newWorkflow, actions});
                    }}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                  >
                    <option value="">Select Template...</option>
                    {templates.map(t => <option key={t.template_key} value={t.template_key}>{t.name}</option>)}
                  </select>
                </label>
                
                <label>
                  <span style={{display:'block', marginBottom:'0.25rem', fontWeight:500, fontSize: '0.9rem'}}>Recipient Field (Event Payload)</span>
                  <select 
                    disabled={isViewing}
                    value={newWorkflow.actions[0].configuration.recipient_field}
                    onChange={(e) => {
                      const actions = [...newWorkflow.actions];
                      actions[0].configuration.recipient_field = e.target.value;
                      setNewWorkflow({...newWorkflow, actions});
                    }}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                  >
                    <option value="">Select recipient email field...</option>
                    {eventFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {!isViewing && (
              <SButton onClick={handleSave} size="s" style={{ width: 'fit-content' }} icon={<Save size={16} />} loading={isSaving} disabled={isSaving}>
                {editingWorkflowId ? 'Update Workflow' : 'Save Workflow'}
              </SButton>
            )}
          </div>
        </div>
      )}

      {!isCreating && (
        <SDataTable
          columns={columns}
          data={workflows}
          loading={loading}
          actions={['view', 'edit', 'delete']}
          onAction={(action, row) => {
            if (action === 'view') handleView(row);
            if (action === 'edit') handleEdit(row);
            if (action === 'delete') handleDelete(row.id);
          }}
          emptyText="No workflows configured."
        />
      )}

      <SModal
        isOpen={!!deleteWorkflowId}
        title={t('admin.deleteWorkflowTitle', 'Delete Workflow')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteWorkflowId(null)}
        confirmText={t('common.delete', 'Delete')}
        confirmColor="danger"
        text={t('admin.deleteWorkflowConfirm', 'Are you sure you want to delete this workflow? This action cannot be undone.')}
      />
    </div>
  );
};

export default WorkflowsFeature;
