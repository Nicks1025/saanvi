import React, { useState, useEffect } from 'react';
import SDataTable from '../../../components/common/SDataTable';
import SModal from '../../../components/common/SModal';
import SButton from '../../../components/common/SButton';
import STextField from '../../../components/common/STextField';
import SDropdown from '../../../components/common/SDropdown';
import axios from '../../../services/axios.client';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Plus } from 'lucide-react';

const UserFieldsFeature = ({ disableContainer = false, topTabs }) => {
  const { t } = useTranslation();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ isOpen: false, type: 'add', field: null });
  const [isProcessing, setIsProcessing] = useState(false);

  const [form, setForm] = useState({
    field_name: '',
    label: '',
    field_type: 'shorttext',
    is_required: false,
    is_active: true,
    show_on_signup: false,
    show_on_admin_create: false,
    options_config: '' // Stored as comma-separated or json for now
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deletedFieldIds, setDeletedFieldIds] = useState([]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/users/fields');
      setFields(res.data);
    } catch (err) {
      toast.error('Failed to load user fields');
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
      setDeletedFieldIds([]);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleOpenAdd = () => {
    setForm({
      field_name: '',
      label: '',
      field_type: 'shorttext',
      is_required: false,
      is_active: true,
      show_on_signup: true,
      show_on_admin_create: true,
      options_config: ''
    });
    setModalState({ isOpen: true, type: 'add', field: null });
  };

  const handleOpenEdit = (field) => {
    let optionsStr = '';
    if (field.options_config) {
      try {
        const opts = typeof field.options_config === 'string' ? JSON.parse(field.options_config) : field.options_config;
        optionsStr = opts.map(o => o.value).join(', ');
      } catch(e) {}
    }

    setForm({
      ...field,
      options_config: optionsStr
    });
    setModalState({ isOpen: true, type: 'edit', field });
  };

  const handleOpenDelete = (field) => {
    setModalState({ isOpen: true, type: 'delete', field });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (payload.options_config && (payload.field_type === 'dropdown' || payload.field_type === 'radio')) {
      const parts = payload.options_config.split(',').map(s => s.trim()).filter(Boolean);
      payload.options_config = parts.map(p => ({ label: p, value: p }));
    } else {
      payload.options_config = null;
    }

    if (modalState.type === 'add') {
      const newField = { ...payload, id: `draft-${Date.now()}` };
      setFields([...fields, newField]);
    } else {
      setFields(fields.map(f => f.id === modalState.field.id ? { ...f, ...payload } : f));
    }
    
    setHasUnsavedChanges(true);
    setModalState({ isOpen: false, type: null, field: null });
  };

  const handleBulkSave = async () => {
    setIsProcessing(true);
    try {
      await axios.post('/api/admin/users/fields/bulk', { fields, deletedFieldIds });
      toast.success('All changes saved successfully');
      fetchFields();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save fields');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = () => {
    if (modalState.field.id.startsWith('draft-')) {
      setFields(fields.filter(f => f.id !== modalState.field.id));
      toast.success('Draft field removed');
    } else {
      setDeletedFieldIds([...deletedFieldIds, modalState.field.id]);
      setFields(fields.filter(f => f.id !== modalState.field.id));
      toast.success('Field removed locally. Click Save All Changes to confirm.');
    }
    setHasUnsavedChanges(true);
    setModalState({ isOpen: false, type: null, field: null });
  };

  const columns = [
    { key: 'order', label: 'Order', render: (_, rowIndex) => rowIndex + 1 },
    { key: 'field_name', label: 'Field Name' },
    { key: 'label', label: 'Label' },
    { key: 'field_type', label: 'Type' },
    { key: 'is_required', label: 'Required', render: (item) => item.is_required ? 'Yes' : 'No' },
    { key: 'show_on_signup', label: 'Signup', render: (item) => item.show_on_signup ? 'Yes' : 'No' },
    { key: 'show_on_admin_create', label: 'Admin', render: (item) => item.show_on_admin_create ? 'Yes' : 'No' }
  ];

  const TYPE_OPTIONS = [
    { label: 'Short Text', value: 'shorttext' },
    { label: 'Long Text', value: 'longtext' },
    { label: 'Date', value: 'date' },
    { label: 'Dropdown', value: 'dropdown' },
    { label: 'Email', value: 'email' },
    { label: 'Number', value: 'number' },
    { label: 'Radio', value: 'radio' },
    { label: 'Checkbox', value: 'checkbox' },
    { label: 'Phone Number', value: 'phonenumber' },
    { label: 'File Upload', value: 'fileupload' }
  ];

  const isFormValid = () => {
    if (!form.field_name || form.field_name.trim() === '') return false;
    if (!form.label || form.label.trim() === '') return false;
    if ((form.field_type === 'dropdown' || form.field_type === 'radio') && (!form.options_config || form.options_config.trim() === '')) return false;
    return true;
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <SDataTable 
        title="Users"
        disableContainer={disableContainer}
        data={fields} 
        columns={columns}
        loading={loading || isProcessing}
        topTabs={topTabs}
        actions={['edit', 'delete']}
        onAction={(action, row) => {
          if (action === 'edit') handleOpenEdit(row);
          if (action === 'delete') handleOpenDelete(row);
        }}
        canExecuteAction={(action, row) => {
          if (action === 'delete') return !row.is_system;
          return true;
        }}
        headerActions={
          <SButton
            text="Add Field"
            icon={<Plus size={16} />}
            onClick={handleOpenAdd}
            style={{ background: 'var(--accent)', color: 'white' }}
          />
        }
        isDraggable={true}
        hidePagination={true}
        onReorder={(newFields) => {
          setFields(newFields);
          setHasUnsavedChanges(true);
        }}
      />

      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', background: 'white' }}>
        <SButton
          text="Cancel"
          disabled={!hasUnsavedChanges || isProcessing}
          onClick={() => fetchFields()}
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
        />
        <SButton
          text="Save All Changes"
          color="primary"
          disabled={!hasUnsavedChanges || isProcessing}
          onClick={handleBulkSave}
        />
      </div>

      <SModal
        isOpen={modalState.isOpen && modalState.type !== 'delete'}
        title={modalState.type === 'add' ? 'Add User Field' : 'Edit User Field'}
        onConfirm={handleSave}
        onCancel={() => setModalState({ isOpen: false, type: null, field: null })}
        isProcessing={isProcessing}
        confirmText="Save Field"
        confirmDisabled={!isFormValid()}
      >
        <form id="field-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
          <STextField
            label="Field Name (Database Column)"
            text={form.field_name}
            onChange={(e) => setForm({ ...form, field_name: e.target.value.replace(/\s+/g, '') })}
            placeholder="e.g. department_name"
            required
            disabled={modalState.type === 'edit'}
            marginBottom="0"
          />
          <STextField
            label="Display Label"
            text={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. Department"
            required
            marginBottom="0"
          />
          <SDropdown
            label="Field Type"
            value={form.field_type}
            options={TYPE_OPTIONS}
            onChange={(v) => setForm({ ...form, field_type: v })}
            disabled={modalState.type === 'edit'}
          />

          {(form.field_type === 'dropdown' || form.field_type === 'radio') && (
            <STextField
              label="Options (Comma separated)"
              text={form.options_config}
              onChange={(e) => setForm({ ...form, options_config: e.target.value })}
              placeholder="e.g. Engineering, Sales, HR"
              marginBottom="0"
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
              <input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} />
              Required Field
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
              <input type="checkbox" checked={form.show_on_signup} onChange={(e) => setForm({ ...form, show_on_signup: e.target.checked })} />
              Show on Signup
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
              <input type="checkbox" checked={form.show_on_admin_create} onChange={(e) => setForm({ ...form, show_on_admin_create: e.target.checked })} />
              Show on Admin Create
            </label>
          </div>
        </form>
      </SModal>

      <SModal
        isOpen={modalState.isOpen && modalState.type === 'delete'}
        title={t('admin.deleteUserFieldTitle', 'Delete User Field')}
        onConfirm={handleDelete}
        onCancel={() => setModalState({ isOpen: false, type: null, field: null })}
        isProcessing={isProcessing}
        confirmText={t('admin.deleteUserFieldConfirmBtn', 'Delete Field')}
        confirmColor="danger"
        text={t('admin.deleteUserFieldConfirm', 'Are you sure you want to PERMANENTLY delete the {{fieldName}} field? This will irreversibly remove all stored values for this field across the entire database.', { fieldName: modalState.field?.label })}
      />
    </div>
  );
};

export default UserFieldsFeature;
