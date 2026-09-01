import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSystemEvents, createWorkflow, getEmailTemplates, updateWorkflow, getWorkflowDetails } from './communicationService';
import toast from 'react-hot-toast';
import { Workflow, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SButton from '../../../components/common/SButton';

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

const WorkflowEditor = ({ mode = 'create' }) => { // modes: 'create', 'edit', 'view'
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const isViewing = mode === 'view';
  const isEditing = mode === 'edit';

  const [systemEvents, setSystemEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const getInitialWorkflowState = () => ({
    name: '',
    trigger_event_key: '',
    conditions: [{ operator: 'ALWAYS', field_path: '', expected_value: '' }],
    actions: [{ 
      action_type: 'SEND_EMAIL', 
      configuration: { template_key: '', recipient_field: '' } 
    }]
  });

  const [newWorkflow, setNewWorkflow] = useState(getInitialWorkflowState());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [evRes, tplRes] = await Promise.all([
          getSystemEvents(),
          getEmailTemplates()
        ]);
        setSystemEvents(evRes.data || evRes || []);
        setTemplates(tplRes.data || tplRes || []);

        if (id && (isEditing || isViewing)) {
          const detailsRes = await getWorkflowDetails(id);
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
        }
      } catch (err) {
        toast.error('Failed to load workflow configuration data');
        navigate('/admin/workflows');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditing, isViewing, navigate]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (isEditing && id) {
        await updateWorkflow(id, newWorkflow);
        toast.success('Workflow updated successfully');
      } else {
        await createWorkflow(newWorkflow);
        toast.success('Workflow created successfully');
      }
      navigate('/admin/workflows');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || (isEditing ? 'Failed to update workflow' : 'Failed to create workflow'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/workflows');
  };

  const eventFields = useMemo(() => {
    if (!newWorkflow.trigger_event_key) return [];
    const evt = systemEvents.find(e => e.event_key === newWorkflow.trigger_event_key);
    if (!evt || !evt.payload_schema) return [];
    return flattenSchema(evt.payload_schema);
  }, [newWorkflow.trigger_event_key, systemEvents]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
          <Workflow /> {isViewing ? 'View Workflow' : isEditing ? 'Edit Workflow' : 'Create Workflow'}
        </h1>
      </div>

      <div style={{ background: 'var(--bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label>
                <span style={{display:'block', marginBottom:'0.25rem', fontWeight:500}}>Workflow Name</span>
                <input type="text" disabled={isViewing} value={newWorkflow.name} onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})} style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </label>
              <label>
                <span style={{display:'block', marginBottom:'0.25rem', fontWeight:500}}>Trigger Event</span>
                <select disabled={isViewing} value={newWorkflow.trigger_event_key} onChange={(e) => setNewWorkflow({...newWorkflow, trigger_event_key: e.target.value})} style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}>
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
          </div>
        </div>
        
        {/* Actions Footer */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', justifyContent: 'flex-start' }}>
          {!isViewing && (
            <SButton onClick={handleSave} size="m" icon={<Save size={16} />} loading={isSaving} disabled={isSaving}>
              {isEditing ? 'Update Workflow' : 'Save Workflow'}
            </SButton>
          )}
          <SButton onClick={handleCancel} size="m" color={isViewing ? "primary" : "secondary"} icon={isViewing ? undefined : <X size={16} />}>
            {isViewing ? 'Back' : 'Cancel'}
          </SButton>
        </div>

      </div>
    </div>
  );
};

export default WorkflowEditor;
