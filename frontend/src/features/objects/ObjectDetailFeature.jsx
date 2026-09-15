import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import SDataTable from '@/components/common/SDataTable';
import SModal from '@/components/common/SModal';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import SDropdown from '@/components/common/SDropdown';
import * as objectsService from './objectsService';


const ObjectDetailFeature = () => {
  const { uuid } = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const navigate = useRouter();

  const [activeTab, setActiveTabState] = useState(searchParams?.get('tab') || 'records');
  const [object, setObject] = useState(null);

  // States for tabs
  const [records, setRecords] = useState([]);
  const [fields, setFields] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [loading, setLoading] = useState(true);

  // Modals
  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });

  // react-hook-form instances
  const {
    control: fieldControl,
    handleSubmit: handleFieldFormSubmit,
    reset: resetFieldForm,
    formState: { isValid: isFieldValid, isSubmitting: isFieldSubmitting }
  } = useForm({ mode: 'onChange' });

  const {
    control: templateControl,
    handleSubmit: handleTemplateFormSubmit,
    reset: resetTemplateForm,
    formState: { isValid: isTemplateValid, isSubmitting: isTemplateSubmitting }
  } = useForm({ mode: 'onChange', defaultValues: { name: '' } });

  // Field Ordering
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    navigate.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    fetchObjectData();
  }, [uuid]);

  useEffect(() => {
    if (activeTab === 'records') fetchRecords();
    if (activeTab === 'fields') fetchFields();
    if (activeTab === 'templates') fetchTemplates();
  }, [activeTab, uuid]);

  const fetchObjectData = async () => {
    try {
      const res = await objectsService.getObject(uuid);
      setObject(res.uuid ? res : (res.data || res));
    } catch (err) {
      toast.error('Failed to load object details');
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await objectsService.getRecords(uuid);
      const data = res.records ? res : (res.data || { records: [], fields: [] });
      setRecords(data.records || []);
      setFields(data.fields || []);
    } catch (err) {
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await objectsService.getFields(uuid);
      const sortedFields = (Array.isArray(res) ? res : (res.data || [])).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      setFields(sortedFields);
    } catch (err) {
      toast.error('Failed to load fields');
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await objectsService.getTemplates(uuid);
      setTemplates(Array.isArray(res) ? res : (res.data || []));
    } catch (err) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // --- RECORD TAB ---
  const handleDeleteRecord = async () => {
    try {
      await objectsService.deleteRecord(uuid, modalState.data.uuid);
      toast.success('Record deleted successfully');
      setModalState({ isOpen: false });
      fetchRecords();
    } catch (err) {
      toast.error('Failed to delete record');
    }
  };

  const renderRecordsTab = () => {
    const columns = fields.map(f => ({
      key: f.field_name,
      label: f.label,
      sortable: true
    }));

    // Add default columns
    columns.push({ key: 'created_at', label: 'Created At', render: (row) => new Date(row.created_at).toLocaleString() });

    return (
      <SDataTable
        title={object?.name}
        data={records}
        columns={columns}
        loading={loading}
        tabs={tabsConfig}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actions={['view', 'edit', 'delete']}
        onAction={(action, row) => {
          if (action === 'view') {
            navigate.push(`/objects/${uuid}/records/${row.uuid}`);
          }
          if (action === 'edit') {
            navigate.push(`/objects/${uuid}/records/${row.uuid}/edit`);
          }
          if (action === 'delete') {
            setModalState({ isOpen: true, type: 'deleteRecord', data: row });
          }
        }}
        headerActions={
          <SButton text="Add Record" onClick={() => {
            if (fields.length === 0) {
              toast.error('Add field first to add records');
            } else {
              navigate.push(`/objects/${uuid}/records/add`);
            }
          }} />
        }
      />
    );
  };

  // --- FIELDS TAB ---
  const handleFieldSubmit = async (formData) => {
    try {
      const payload = {
        label: formData.label,
        field_type: formData.field_type,
        placeholder: formData.placeholder,
        default_value: formData.default_value,
        is_required: formData.is_required,
        options: formData.options,
        validation_rules: formData.validation_rules,
        display_order: formData.display_order
      };

      if (modalState.type === 'createField') {
        payload.field_name = formData.field_name;
        await objectsService.createField(uuid, payload);
        toast.success('Field created');
      } else {
        await objectsService.updateField(uuid, modalState.data.uuid, payload);
        toast.success('Field updated');
      }
      setModalState({ isOpen: false });
      fetchFields();
    } catch (err) {
      const message = err?.error || err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to save field';
      if (message.includes('existing record')) {
        toast(message, { icon: '⚠️', duration: 6000 });
      } else {
        toast.error(message);
      }
    }
  };

  const handleBulkSave = async () => {
    setIsProcessing(true);
    try {
      await objectsService.bulkSaveFields(uuid, fields, []);
      toast.success('All changes saved successfully');
      fetchFields();
    } catch (err) {
      toast.error('Failed to save fields');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFieldsTab = () => {
    const columns = [
      { key: 'order', label: 'Order', render: (_, rowIndex) => rowIndex + 1 },
      { key: 'label', label: 'Label' },
      { key: 'field_type', label: 'Type' },
      { key: 'is_required', label: 'Required', render: (row) => row.is_required ? 'Yes' : 'No' }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <SDataTable
          title={object?.name}
          subTitle="(drag and drop fields to change their order)"
          data={fields}
          columns={columns}
          loading={loading || isProcessing}
          tabs={tabsConfig}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={['edit']}
          onAction={(action, row) => {
            if (action === 'edit') {
              resetFieldForm({
                field_name: row.field_name,
                label: row.label,
                field_type: row.field_type,
                is_required: row.is_required ? 'true' : 'false'
              });
              setModalState({ isOpen: true, type: 'editField', data: row });
            }
            if (action === 'delete') {
              setModalState({ isOpen: true, type: 'deleteField', data: row });
            }
          }}
          headerActions={
            <SButton
              text="Add Field"
              onClick={() => {
                resetFieldForm({ field_name: '', label: '', field_type: 'TEXT', is_required: 'false' });
                setModalState({ isOpen: true, type: 'createField', data: null });
              }}
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

        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <SButton
            text="Cancel"
            disabled={!hasUnsavedChanges || isProcessing}
            onClick={() => fetchFields()}
            color="secondary"
          />
          <SButton
            text="Save All Changes"
            color="primary"
            disabled={!hasUnsavedChanges || isProcessing}
            onClick={handleBulkSave}
          />
        </div>
      </div>
    );
  };

  // --- TEMPLATES TAB ---
  const onTemplateFormSubmit = async (data) => {
    try {
      if (modalState.type === 'createTemplate') {
        await objectsService.createTemplate(uuid, { name: data.name });
        toast.success('Template created');
      } else if (modalState.type === 'editTemplate') {
        await objectsService.updateTemplate(uuid, modalState.data.uuid, { name: data.name });
        toast.success('Template updated');
      }
      setModalState({ isOpen: false });
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to manage template');
    }
  };

  const handleTemplateAction = async () => {
    if (modalState.type === 'createTemplate' || modalState.type === 'editTemplate') {
      await handleTemplateFormSubmit(onTemplateFormSubmit)();
    } else if (modalState.type === 'deleteTemplate') {
      try {
        await objectsService.deleteTemplate(uuid, modalState.data.uuid);
        toast.success('Template deleted');
        setModalState({ isOpen: false });
        fetchTemplates();
      } catch (err) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete template');
      }
    }
  };

  const renderTemplatesTab = () => {
    const columns = [
      { key: 'name', label: 'Template Name' }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <SDataTable
          title={object?.name}
          data={templates}
          columns={columns}
          loading={loading}
          tabs={tabsConfig}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={['edit', 'delete']}
          onAction={(action, row) => {
            if (action === 'edit') {
              resetTemplateForm({ name: row.name });
              setModalState({ isOpen: true, type: 'editTemplate', data: row });
            }
            if (action === 'delete') {
              setModalState({ isOpen: true, type: 'deleteTemplate', data: row });
            }
          }}
          customActions={[
            {
              title: 'Design Layout',
              icon: 'edit',
              onClick: (row) => navigate.push(`/objects/${uuid}/template/${row.uuid}`)
            }
          ]}
          headerActions={
            <SButton text="Create Template" onClick={() => {
              resetTemplateForm({ name: '' });
              setModalState({ isOpen: true, type: 'createTemplate', data: null });
            }} />
          }
        />
      </div>
    );
  };

  const tabsConfig = [
    { id: 'records', label: 'Records' },
    { id: 'fields', label: 'Fields' },
    { id: 'templates', label: 'Templates' }
  ];

  return (
    <div className="admin-users-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', padding: '1rem 1.5rem 0' }}>
        <button
          onClick={() => navigate.push('/objects')}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0, fontSize: '0.9rem', fontWeight: 500 }}
        >
          &larr; Back to Objects
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
        {activeTab === 'records' && renderRecordsTab()}
        {activeTab === 'fields' && renderFieldsTab()}
        {activeTab === 'templates' && renderTemplatesTab()}
      </div>

      <SModal
        isOpen={['createField', 'editField'].includes(modalState.type)}
        title={modalState.type === 'createField' ? 'Add Field' : 'Edit Field'}
        onConfirm={handleFieldFormSubmit(handleFieldSubmit)}
        onCancel={() => setModalState({ isOpen: false })}
        isProcessing={isFieldSubmitting}
        confirmDisabled={!isFieldValid}
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
          {modalState.type === 'createField' && (
            <Controller
              name="field_name"
              control={fieldControl}
              rules={{ required: 'Field Name is required' }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <STextField
                  label="Field Name (Internal key, e.g. 'first_name')"
                  text={value || ''}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  error={error?.message}
                />
              )}
            />
          )}
          <Controller
            name="label"
            control={fieldControl}
            render={({ field: { onChange, value } }) => (
              <STextField
                label="Field Label (Display Name)"
                text={value || ''}
                onChange={(e) => onChange(e.target.value)}
              />
            )}
          />
          <Controller
            name="field_type"
            control={fieldControl}
            rules={{ required: 'Field Type is required' }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SDropdown
                  label="Field Type"
                  value={value || 'TEXT'}
                  options={[
                    { label: 'Text', value: 'TEXT' },
                    { label: 'Text Area', value: 'TEXTAREA' },
                    { label: 'Number', value: 'NUMBER' },
                    { label: 'Checkbox', value: 'CHECKBOX' }
                  ]}
                  onChange={(val) => onChange(val)}
                  required
                />
                {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error.message}</div>}
              </div>
            )}
          />
          <Controller
            name="is_required"
            control={fieldControl}
            render={({ field: { onChange, value } }) => (
              <SDropdown
                label="Required"
                value={value}
                options={[{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }]}
                onChange={(val) => onChange(val)}
              />
            )}
          />
        </form>
      </SModal>

      <SModal
        isOpen={['createTemplate', 'editTemplate', 'deleteTemplate', 'deleteRecord'].includes(modalState.type)}
        title={modalState.type === 'createTemplate' ? 'Create Template' : modalState.type === 'editTemplate' ? 'Edit Template' : modalState.type === 'deleteRecord' ? 'Delete Record' : 'Delete Template'}
        onConfirm={modalState.type === 'deleteRecord' ? handleDeleteRecord : handleTemplateAction}
        onCancel={() => setModalState({ isOpen: false })}
        confirmText={modalState.type === 'createTemplate' ? 'Create' : modalState.type === 'editTemplate' ? 'Save Changes' : 'Delete'}
        confirmColor={['deleteTemplate', 'deleteRecord'].includes(modalState.type) ? 'danger' : 'primary'}
        isProcessing={isTemplateSubmitting}
        confirmDisabled={(modalState.type === 'createTemplate' || modalState.type === 'editTemplate') && !isTemplateValid}
      >
        {(modalState.type === 'createTemplate' || modalState.type === 'editTemplate') && (
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
            <Controller
              name="name"
              control={templateControl}
              rules={{ required: 'Template name is required' }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <STextField
                  label="Template Name"
                  text={value || ''}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  error={error?.message}
                />
              )}
            />
          </form>
        )}
        {modalState.type === 'deleteTemplate' && modalState.data && (
          <div style={{ paddingTop: '1rem' }}>
            Are you sure you want to delete template <strong>{modalState.data.name}</strong>? This action cannot be undone.
          </div>
        )}
        {modalState.type === 'deleteRecord' && modalState.data && (
          <div style={{ paddingTop: '1rem' }}>
            Are you sure you want to delete this record? This action cannot be undone.
          </div>
        )}
      </SModal>
    </div>
  );
};

export default ObjectDetailFeature;
