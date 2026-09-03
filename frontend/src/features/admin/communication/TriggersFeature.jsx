import React, { useState, useEffect } from 'react';
import { getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, getSystemEvents, getEmailTemplates } from './communicationService';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import SButton from '@/components/common/SButton';
import SModal from '@/components/common/SModal';
import SDataTable from '@/components/common/SDataTable';
import SLongText from '@/components/common/SLongText';
import axios from '@/services/axios.client';
import { useTranslation } from 'react-i18next';

const RuleBuilder = ({ conditions, onChange, fields }) => {
  if (!conditions || !conditions.type) {
    conditions = { type: 'group', operator: 'AND', rules: [] };
  }

  const handleGroupOperatorChange = (operator) => {
    onChange({ ...conditions, operator });
  };

  const addRule = () => {
    onChange({
      ...conditions,
      rules: [...(conditions.rules || []), { type: 'rule', field: '', operator: 'EQUALS', value: '' }]
    });
  };

  const addGroup = () => {
    onChange({
      ...conditions,
      rules: [...(conditions.rules || []), { type: 'group', operator: 'AND', rules: [] }]
    });
  };

  const updateChild = (index, newChild) => {
    const newRules = [...conditions.rules];
    newRules[index] = newChild;
    onChange({ ...conditions, rules: newRules });
  };

  const removeChild = (index) => {
    const newRules = [...conditions.rules];
    newRules.splice(index, 1);
    onChange({ ...conditions, rules: newRules });
  };

  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
      <div style={{ width: '4px', background: 'var(--accent)' }}></div>
      <div style={{ flex: 1, padding: '1rem', background: 'var(--hover-bg, #f9fafb)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', border: '1px solid var(--accent)', borderRadius: '4px', overflow: 'hidden' }}>
            <button 
              onClick={() => handleGroupOperatorChange('AND')}
              style={{ padding: '0.25rem 1rem', background: conditions.operator === 'AND' ? 'var(--accent)' : 'transparent', color: conditions.operator === 'AND' ? '#fff' : 'var(--accent)', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >AND</button>
            <button 
              onClick={() => handleGroupOperatorChange('OR')}
              style={{ padding: '0.25rem 1rem', background: conditions.operator === 'OR' ? 'var(--accent)' : 'transparent', color: conditions.operator === 'OR' ? '#fff' : 'var(--accent)', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >OR</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={addRule} style={{ padding: '0.25rem 0.75rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>+ Rule</button>
            <button onClick={addGroup} style={{ padding: '0.25rem 0.75rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>+ Group</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {conditions.rules?.map((rule, idx) => (
            <div key={idx}>
              {rule.type === 'group' ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <RuleBuilder conditions={rule} onChange={(newGroup) => updateChild(idx, newGroup)} fields={fields} />
                  </div>
                  <button onClick={() => removeChild(idx)} style={{ padding: '0.5rem', color: 'var(--error, #ef4444)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <select value={rule.field} onChange={(e) => updateChild(idx, { ...rule, field: e.target.value })} style={{ flex: 1, padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)' }}>
                    <option value="">Select Field</option>
                    {fields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={rule.operator} onChange={(e) => updateChild(idx, { ...rule, operator: e.target.value })} style={{ width: '150px', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)' }}>
                    <option value="EQUALS">Equals</option>
                    <option value="NOT_EQUALS">Not Equals</option>
                    <option value="CONTAINS">Contains</option>
                    <option value="EXISTS">Exists</option>
                    <option value="GREATER_THAN">Greater Than</option>
                    <option value="LESS_THAN">Less Than</option>
                  </select>
                  <input type="text" value={rule.value} onChange={(e) => updateChild(idx, { ...rule, value: e.target.value })} placeholder="Value" style={{ flex: 1, padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)' }} />
                  <button onClick={() => removeChild(idx)} style={{ padding: '0.25rem', color: 'var(--error, #ef4444)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
              )}
            </div>
          ))}
          {(!conditions.rules || conditions.rules.length === 0) && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '4px' }}>
              No rules defined. Click "+ Rule" to add one.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const TriggerForm = ({ trigger, onSave, onCancel, systemEvents, templates, eventFields }) => {
  const [formData, setFormData] = useState(JSON.parse(JSON.stringify(trigger)));
  const [showActionForm, setShowActionForm] = useState(false);

  const handleSave = () => {
    onSave(formData);
  };

  const handleAddAction = () => {
    setShowActionForm(true);
  };

  const saveAction = (actionData) => {
    setFormData({
      ...formData,
      actions: [...(formData.actions || []), actionData]
    });
    setShowActionForm(false);
  };

  const removeAction = (idx) => {
    const newActions = [...formData.actions];
    newActions.splice(idx, 1);
    setFormData({ ...formData, actions: newActions });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '65vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Trigger Name</label>
          <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)' }} />
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-h)' }}>Conditions</h4>
        <RuleBuilder conditions={formData.conditions_json} onChange={c => setFormData({...formData, conditions_json: c})} fields={eventFields} />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-h)' }}>Actions</h4>
          <button onClick={handleAddAction} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Plus size={18} /></button>
        </div>

        {formData.actions?.map((action, idx) => (
          <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{action.action_type === 'SEND_EMAIL' ? 'Send Email' : action.action_type}</strong>
              {action.configuration?.subject && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Subject: {action.configuration.subject}</div>}
              {action.configuration?.template_key && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Template: {action.configuration.template_key}</div>}
            </div>
            <button onClick={() => removeAction(idx)} style={{ color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
          </div>
        ))}

        {showActionForm && (
          <ActionForm templates={templates} onSave={saveAction} onCancel={() => setShowActionForm(false)} eventFields={eventFields} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <SButton onClick={onCancel} color="danger">Cancel</SButton>
        <SButton onClick={handleSave} color="primary" icon="save">Save Trigger</SButton>
      </div>
    </div>
  );
};

const ActionForm = ({ templates, onSave, onCancel, eventFields }) => {
  const [config, setConfig] = useState({
    subject: '',
    html_body: '',
    template_key: '',
    sender: 'system@saanviworld.com',
    recipient_type: 'DYNAMIC',
    recipient_field: 'email',
    variables: {}
  });

  const [selectedTemplateVars, setSelectedTemplateVars] = useState([]);

  useEffect(() => {
    if (config.template_key) {
      const template = templates.find(t => t.template_key === config.template_key);
      if (template && template.available_variables) {
        try {
          const vars = JSON.parse(template.available_variables);
          // Filter out global dynamic variables (which start and end with $$) from manual mapping requirements
          setSelectedTemplateVars(Array.isArray(vars) ? vars.filter(v => !(v.startsWith('$$') && v.endsWith('$$'))) : []);
        } catch (e) {
          setSelectedTemplateVars([]);
        }
      } else {
        setSelectedTemplateVars([]);
      }
    } else {
      setSelectedTemplateVars([]);
    }
  }, [config.template_key, templates]);

  const handleVariableMapChange = (variableName, mappedValue) => {
    setConfig(prev => ({
      ...prev,
      variables: {
        ...(prev.variables || {}),
        [variableName]: mappedValue
      }
    }));
  };

  return (
    <div style={{ border: '1px solid var(--accent)', borderRadius: '4px', padding: '1rem', background: 'var(--bg)', marginBottom: '1rem' }}>
      <h5 style={{ margin: '0 0 1rem 0' }}>Configure Email Action</h5>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Subject</span>
          <input type="text" value={config.subject} onChange={e => setConfig({...config, subject: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--input-bg)' }} />
        </label>

        <label>
          <SLongText 
            label="Body (HTML)"
            text={config.html_body} 
            onChange={e => setConfig({...config, html_body: e.target.value})}
            rows={10}
            placeholder="Type your email body here. You can use HTML tags like <b>, <i>, <br> for formatting."
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label>
            <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>E-mail template *</span>
            <select value={config.template_key} onChange={e => setConfig({...config, template_key: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)' }}>
              <option value="">Select Template...</option>
              {templates.map(t => <option key={t.template_key} value={t.template_key}>{t.name}</option>)}
            </select>
          </label>
          <label>
            <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>E-mail sender *</span>
            <select value={config.sender} onChange={e => setConfig({...config, sender: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)' }}>
              <option value="system@saanviworld.com">System (system@saanviworld.com)</option>
              <option value="admin@saanviworld.com">Admin (admin@saanviworld.com)</option>
            </select>
          </label>
        </div>

        <div>
          <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Recipient Type</span>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input type="radio" name="recipient_type" checked={config.recipient_type === 'DYNAMIC'} onChange={() => setConfig({...config, recipient_type: 'DYNAMIC'})} /> DYNAMIC
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input type="radio" name="recipient_type" checked={config.recipient_type === 'FIXED'} onChange={() => setConfig({...config, recipient_type: 'FIXED'})} /> FIXED
            </label>
          </div>
        </div>

        {selectedTemplateVars.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <h6 style={{ margin: '0 0 1rem 0', color: 'var(--text-h)' }}>Map Template Variables</h6>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedTemplateVars.map(varName => (
                <div key={varName} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '150px', fontWeight: 500, fontSize: '0.85rem' }}>{varName}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>→</div>
                  <select 
                    value={(config.variables && config.variables[varName]) || ''} 
                    onChange={e => handleVariableMapChange(varName, e.target.value)}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--input-bg)', color: 'var(--text)' }}
                  >
                    <option value="">Select event field...</option>
                    {eventFields?.map(f => (
                      <option key={f} value={`event.data.${f}`}>event.data.{f}</option>
                    ))}
                    <option value="STATIC_VALUE">-- Static Value -- (Not fully implemented yet)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '1rem', marginTop: '1rem' }}>
          <SButton onClick={onCancel} size="s" color="danger">Cancel</SButton>
          <SButton onClick={() => onSave({ action_type: 'SEND_EMAIL', configuration: config })} size="s">Save Action</SButton>
        </div>
      </div>
    </div>
  );
};


const TriggersFeature = ({ topTabs }) => {
  const { t } = useTranslation();
  const [triggers, setTriggers] = useState([]);
  const [systemEvents, setSystemEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [eventFields, setEventFields] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalState, setModalState] = useState({ isOpen: false, type: null, trigger: null });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wfRes, evRes, tplRes, fieldsRes] = await Promise.all([
        getWorkflows(),
        getSystemEvents(),
        getEmailTemplates(),
        axios.get('/api/admin/users/fields')
      ]);
      setTriggers(wfRes.data || wfRes || []);
      setSystemEvents(evRes.data || evRes || []);
      setTemplates(tplRes.data || tplRes || []);
      
      const fields = fieldsRes.data || [];
      const fieldNames = ['firstName', 'lastName', 'email', 'status', 'role'].concat(fields.map(f => f.field_name));
      setEventFields([...new Set(fieldNames)]);
    } catch (err) {
      toast.error('Failed to load triggers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddTrigger = () => {
    const newTrigger = {
      id: `new-${Date.now()}`,
      name: `Trigger ${triggers.length + 1}`,
      trigger_event_key: 'USER_CREATED',
      active: true,
      conditions_json: { type: 'group', operator: 'AND', rules: [] },
      actions: [],
      isNew: true
    };
    setModalState({ isOpen: true, type: 'edit', trigger: newTrigger });
  };

  const handleEditTrigger = (trigger) => {
    setModalState({ isOpen: true, type: 'edit', trigger });
  };

  const handleDeleteTrigger = (trigger) => {
    setModalState({ isOpen: true, type: 'delete', trigger });
  };

  const handleSaveTrigger = async (triggerData) => {
    setIsProcessing(true);
    try {
      if (triggerData.isNew) {
        await createWorkflow(triggerData);
        toast.success('Trigger created successfully');
      } else {
        await updateWorkflow(triggerData.id, triggerData);
        toast.success('Trigger updated successfully');
      }
      setModalState({ isOpen: false, type: null, trigger: null });
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to save trigger');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    const { trigger } = modalState;
    if (!trigger) return;
    setIsProcessing(true);
    try {
      if (!trigger.id.toString().startsWith('new-')) {
        await deleteWorkflow(trigger.id);
      }
      toast.success('Trigger deleted');
      setModalState({ isOpen: false, type: null, trigger: null });
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to delete trigger');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Trigger Name', sortable: true },
    { key: 'active', label: 'Active', render: (item) => (
      <span style={{ 
        padding: '0.1rem 0.5rem', 
        fontSize: '0.75rem', 
        borderRadius: '12px',
        background: item.active ? 'var(--success-bg, #d1fae5)' : 'var(--error-bg, #fee2e2)',
        color: item.active ? 'var(--success, #10b981)' : 'var(--error, #ef4444)'
      }}>
        {item.active ? 'Yes' : 'No'}
      </span>
    )},
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <SDataTable 
        title="Users"
        data={triggers}
        columns={columns}
        loading={loading}
        topTabs={topTabs}
        actions={['edit', 'delete']}
        onAction={(action, row) => {
          if (action === 'edit') handleEditTrigger(row);
          if (action === 'delete') handleDeleteTrigger(row);
        }}
        headerActions={
          <SButton text="Add Trigger" icon="add" onClick={handleAddTrigger} color="primary" />
        }
      />

      <SModal
        isOpen={modalState.isOpen && modalState.type === 'edit'}
        title={modalState.trigger?.isNew ? 'Create Trigger' : 'Edit Trigger'}
        onCancel={() => setModalState({ isOpen: false, type: null, trigger: null })}
        hideFooter={true}
        width="1200px"
      >
        {modalState.trigger && (
          <TriggerForm 
            trigger={modalState.trigger} 
            onSave={handleSaveTrigger}
            onCancel={() => setModalState({ isOpen: false, type: null, trigger: null })}
            systemEvents={systemEvents}
            templates={templates}
            eventFields={eventFields}
          />
        )}
      </SModal>

      <SModal
        isOpen={modalState.isOpen && modalState.type === 'delete'}
        title={t('admin.deleteTriggerTitle', 'Delete Trigger')}
        onConfirm={confirmDelete}
        onCancel={() => setModalState({ isOpen: false, type: null, trigger: null })}
        confirmColor="danger"
        confirmText={t('common.delete', 'Delete')}
        text={modalState.trigger ? t('admin.deleteTriggerConfirm', 'Are you sure you want to delete trigger {{triggerName}}? This action cannot be undone.', { triggerName: modalState.trigger.name }) : ''}
      />
    </div>
  );
};

export default TriggersFeature;
