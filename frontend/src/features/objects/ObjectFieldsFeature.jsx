import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import SDataTable from '@/components/common/SDataTable';
import SModal from '@/components/common/SModal';
import SDeleteConfirmation from '@/components/common/SDeleteConfirmation';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import SDropdown from '@/components/common/SDropdown';
import SAlert from '@/components/common/SAlert';
import SSwitch from '@/components/common/SSwitch';
import SIcon from '@/components/common/SIcon';
import { Plus, Trash2 } from 'lucide-react';
import * as objectsService from './objectsService';

const ObjectFieldsFeature = ({ onTabChange }) => {
  const { t } = useTranslation();
  const { uuid } = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const navigate = useRouter();

  const [object, setObject] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasExistingRecords, setHasExistingRecords] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });
  const [checkboxOptions, setCheckboxOptions] = useState([{ key: '', value: '' }]);
  const [isMultiselect, setIsMultiselect] = useState(false);

  const tabsConfig = [
    { id: 'records', label: t('admin.objects.records') },
    { id: 'fields', label: t('admin.objects.fields') },
    { id: 'templates', label: t('admin.objects.templates') }
  ];

  const handleTabChange = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('tab', tabId);
      navigate.push(`${pathname}?${params.toString()}`);
    }
  };

  const {
    control: fieldControl,
    handleSubmit: handleFieldFormSubmit,
    reset: resetFieldForm,
    watch: watchFieldForm,
    formState: { isValid: isFieldValid, isSubmitting: isFieldSubmitting }
  } = useForm({ mode: 'onChange' });

  const watchIsRequired = watchFieldForm('is_required');
  const isRequiredSelected = watchIsRequired === 'true' || watchIsRequired === true;
  const watchFieldType = watchFieldForm('field_type');

  useEffect(() => {
    if (uuid) {
      fetchObjectData();
      fetchFields();
      checkExistingRecords();
    }
  }, [uuid]);

  const checkExistingRecords = async () => {
    try {
      const res = await objectsService.getRecordCount(uuid);
      const count = res?.data?.count ?? res?.count ?? 0;
      setHasExistingRecords(count > 0);
      return count > 0;
    } catch (err) {
      console.error('Failed to check existing records', err);
      return false;
    }
  };

  const fetchObjectData = async () => {
    try {
      const res = await objectsService.getObject(uuid);
      setObject(res);
    } catch (err) {
      toast.error(t('admin.objects.loadObjectFailed'));
    }
  };

  const fetchFields = async () => {
    setLoading(true);
    try {
      const fields = await objectsService.getFields(uuid);
      setFields(fields);
    } catch (err) {
      toast.error(t('admin.objects.loadFieldsFailed'));
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  const handleFieldSubmit = async (formData) => {
    try {
      const isReq = formData.is_required === 'true' || formData.is_required === true;
      if (modalState.type === 'createField' && isReq && hasExistingRecords) {
        toast.error(
          t(
            'admin.objects.recordsExistWarning'
          )
        );
        return;
      }

      let formattedOptions = null;
      if (formData.field_type === 'CHECKBOX') {
        const valid = checkboxOptions
          .map((o) => ({
            key: (o.key || '').trim(),
            value: (o.value || '').trim() || (o.key || '').trim(),
            label: (o.value || '').trim() || (o.key || '').trim()
          }))
          .filter((o) => o.key || o.value);
        if (valid.length > 0) {
          formattedOptions = {
            multiselect: isMultiselect,
            options: valid
          };
        }
      }

      const payload = {
        label: formData.label,
        field_type: formData.field_type,
        placeholder: formData.placeholder,
        default_value: formData.default_value,
        is_required: isReq,
        options: formattedOptions,
        validation_rules: {
          ...(formData.validation_rules || {}),
          multiselect: isMultiselect
        },
        display_order: formData.display_order
      };

      if (modalState.type === 'createField') {
        payload.field_name = formData.field_name;
        await objectsService.createField(uuid, payload);
        toast.success(t('admin.objects.fieldCreated'));
      } else {
        await objectsService.updateField(uuid, modalState.data.uuid, payload);
        toast.success(t('admin.objects.fieldUpdated'));
      }
      setModalState({ isOpen: false, type: null, data: null });
      fetchFields();
    } catch (err) {
      const message = err?.error || err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to save field';
      if (message.includes('already contains records') || message.includes('existing record')) {
        toast(
          t(
            'admin.objects.recordsExistWarning'
          ),
          { icon: '⚠️', duration: 6000 }
        );
      } else {
        toast.error(message);
      }
    }
  };

  const handleDeleteField = async () => {
    try {
      await objectsService.archiveField(uuid, modalState.data.uuid);
      toast.success(t('admin.objects.fieldDeleted'));
      setModalState({ isOpen: false, type: null, data: null });
      fetchFields();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete field');
    }
  };

  const handleBulkSave = async () => {
    setIsProcessing(true);
    try {
      await objectsService.bulkSaveFields(uuid, fields, []);
      toast.success(t('admin.objects.fieldsSaved'));
      fetchFields();
    } catch (err) {
      toast.error('Failed to save fields');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = [
    { key: 'order', label: t('common.order'), render: (_, rowIndex) => rowIndex + 1 },
    { key: 'label', label: t('common.label') },
    { key: 'fieldType', label: t('common.type'), render: (row) => row.fieldType || '-' },
    { key: 'isRequired', label: t('common.required'), render: (row) => (row.isRequired ? t('common.yes') : t('common.no')) }
  ];

  return (
    <div className="admin-users-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', padding: '1rem 1.5rem 0' }}>
        <SButton
          onClick={() => navigate.push('/objects')}
          color="ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}
        >
          &larr; {t('admin.objects.backToObjects')}
        </SButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <SDataTable
          title={object?.name}
          subTitle={t('admin.objects.dragDropOrder')}
          data={fields}
          columns={columns}
          loading={loading || isProcessing}
          tabs={tabsConfig}
          activeTab="fields"
          onTabChange={handleTabChange}
          actions={['view', 'edit', 'delete']}
          onAction={(action, row) => {
            if (action === 'view') {
              setModalState({ isOpen: true, type: 'viewField', data: row });
            }
            if (action === 'edit') {
              let parsedOptions = [{ key: '', value: '' }];
              let multi = false;
              if (row.options) {
                try {
                  const parsed = typeof row.options === 'string' ? JSON.parse(row.options) : row.options;
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    parsedOptions = parsed.map((o) => ({
                      key: o.key,
                      value: o.value
                    }));
                    multi = row.validationRules?.multiselect ?? false;
                  } else if (parsed && typeof parsed === 'object') {
                    multi = parsed.multiselect ?? row.validationRules?.multiselect ?? false;
                    const list = parsed.options || [];
                    if (Array.isArray(list) && list.length > 0) {
                      parsedOptions = list.map((o) => ({
                        key: o.key,
                        value: o.value
                      }));
                    }
                  }
                } catch (e) {}
              }
              setIsMultiselect(Boolean(multi));
              setCheckboxOptions(parsedOptions);
              resetFieldForm({
                field_name: row.fieldName || '',
                label: row.label || '',
                field_type: row.fieldType || 'TEXT',
                is_required: Boolean(row.isRequired)
              });
              setModalState({ isOpen: true, type: 'editField', data: row });
            }
            if (action === 'delete') {
              setModalState({ isOpen: true, type: 'deleteField', data: row });
            }
          }}
          headerActions={
            <SButton
              text={t('admin.objects.addField')}
              onClick={() => {
                setIsMultiselect(false);
                setCheckboxOptions([{ key: '', value: '' }]);
                resetFieldForm({ field_name: '', label: '', field_type: 'TEXT', is_required: false });
                setModalState({ isOpen: true, type: 'createField', data: null });
                checkExistingRecords();
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
            text={t('common.cancel')}
            disabled={!hasUnsavedChanges || isProcessing}
            onClick={() => fetchFields()}
            color="secondary"
          />
          <SButton
            text={t('admin.objects.saveAllChanges')}
            color="primary"
            disabled={!hasUnsavedChanges || isProcessing}
            onClick={handleBulkSave}
          />
        </div>
      </div>

      <SModal
        isOpen={['createField', 'editField'].includes(modalState.type)}
        title={modalState.type === 'createField' ? 'Add Field' : 'Edit Field'}
        onConfirm={handleFieldFormSubmit(handleFieldSubmit)}
        onCancel={() => setModalState({ isOpen: false, type: null, data: null })}
        isProcessing={isFieldSubmitting}
        confirmDisabled={!isFieldValid || (modalState.type === 'createField' && hasExistingRecords && isRequiredSelected)}
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
                    { label: 'Checkbox', value: 'CHECKBOX' },
                    { label: 'Phone Number', value: 'PHONE' }
                  ]}
                  onChange={(val) => onChange(val)}
                  required
                />
                {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error.message}</div>}
              </div>
            )}
          />

          {watchFieldType === 'CHECKBOX' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
                    {t('admin.objects.checkboxOptions')}
                  </label>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('admin.objects.addCheckboxOptionsDesc')}
                  </div>
                </div>
                <SButton
                  type="button"
                  onClick={() => setCheckboxOptions((prev) => [...prev, { key: '', value: '' }])}
                  color="secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    fontSize: '0.8rem'
                  }}
                >
                  <Plus size={14} /> Add Option
                </SButton>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {checkboxOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <STextField
                        placeholder="Key (e.g. opt_1)"
                        text={opt.key}
                        onChange={(e) => {
                          const updated = [...checkboxOptions];
                          updated[idx].key = e.target.value;
                          setCheckboxOptions(updated);
                        }}
                        marginBottom="0"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <STextField
                        placeholder="Value (e.g. Option One)"
                        text={opt.value}
                        onChange={(e) => {
                          const updated = [...checkboxOptions];
                          updated[idx].value = e.target.value;
                          setCheckboxOptions(updated);
                        }}
                        marginBottom="0"
                      />
                    </div>
                    <SIcon
                      name="trash"
                      size={16}
                      color={checkboxOptions.length <= 1 ? 'muted' : 'danger'}
                      disabled={checkboxOptions.length <= 1}
                      onClick={() => {
                        if (checkboxOptions.length > 1) {
                          setCheckboxOptions(checkboxOptions.filter((_, i) => i !== idx));
                        }
                      }}
                      title="Remove option"
                      aria-label="Remove option"
                      subtle
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <Controller
            name="is_required"
            control={fieldControl}
            defaultValue={false}
            render={({ field: { onChange, value } }) => (
              <SSwitch
                label="Required"
                description="Require this field when adding records"
                checked={value === true || value === 'true'}
                onChange={(checked) => onChange(checked)}
              />
            )}
          />
          {watchFieldType === 'CHECKBOX' && (
            <SSwitch
              label="Allow Multi-Select"
              tooltip="When enabled, multiple checkboxes can be selected. When disabled, only one option can be selected."
              checked={isMultiselect}
              onChange={(checked) => setIsMultiselect(checked)}
            />
          )}
          {modalState.type === 'createField' && hasExistingRecords && isRequiredSelected && (
            <SAlert
              type="warning"
              text={t(
                'admin.objects.recordsExistWarning'
              )}
            />
          )}
        </form>
      </SModal>

      <SDeleteConfirmation
        isOpen={modalState.type === 'deleteField'}
        title={t('admin.objects.deleteFieldTitle')}
        onConfirm={handleDeleteField}
        onCancel={() => setModalState({ isOpen: false, type: null, data: null })}
        itemName={modalState.data?.label || modalState.data?.fieldName}
        itemType="field"
      />

      <SModal
        isOpen={modalState.type === 'viewField'}
        title="Field Details"
        onConfirm={() => setModalState({ isOpen: false, type: null, data: null })}
        confirmText="Close"
      >
        {modalState.data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingTop: '1rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Field Label</span>
              <div style={{ fontWeight: 500 }}>{modalState.data.label || '-'}</div>
            </div>
            {modalState.data.fieldName ? (
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Field Name (Key)</span>
                <div><code>{modalState.data.fieldName}</code></div>
              </div>
            ) : null}
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Field Type</span>
              <div>{modalState.data.fieldType || '-'}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Required</span>
              <div>{modalState.data.isRequired ? 'Yes' : 'No'}</div>
            </div>
            {modalState.data.options && (
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Options (Key : Value)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {(() => {
                    try {
                      const parsed = typeof modalState.data.options === 'string' ? JSON.parse(modalState.data.options) : modalState.data.options;
                      const opts = Array.isArray(parsed) ? parsed : (parsed?.options || []);
                      const isMulti = Array.isArray(parsed) ? (modalState.data.validationRules?.multiselect ?? false) : (parsed?.multiselect ?? false);
                      return (
                        <>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Selection Mode: <strong>{isMulti ? 'Multi-select' : 'Single-select'}</strong>
                          </div>
                          {opts.map((o, idx) => (
                            <div key={idx} style={{ fontSize: '0.85rem' }}>
                              <code>{o.key}</code>: {o.value}
                            </div>
                          ))}
                        </>
                      );
                    } catch (e) {}
                    return null;
                  })()}
                </div>
              </div>
            )}
            {modalState.data.placeholder && (
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Placeholder</span>
                <div>{modalState.data.placeholder}</div>
              </div>
            )}
            {modalState.data.default_value && (
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Default Value</span>
                <div>{modalState.data.default_value}</div>
              </div>
            )}
          </div>
        )}
      </SModal>
    </div>
  );
};

export default ObjectFieldsFeature;
