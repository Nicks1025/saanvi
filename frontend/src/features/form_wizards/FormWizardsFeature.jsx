import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import SDataTable from '@/components/common/SDataTable';
import SModal from '@/components/common/SModal';
import SDeleteConfirmation from '@/components/common/SDeleteConfirmation';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import SDropdown from '@/components/common/SDropdown';
import * as formWizardsService from './formWizardsService';
import * as objectsService from '../objects/objectsService';
import STooltip from '@/components/common/STooltip';
import './form-wizards.css';

const sanitizeUrl = (text) => (text || '').trim().replace(/\s+/g, '-');

const FormWizardsFeature = () => {
  const [wizards, setWizards] = useState([]);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ isOpen: false, type: null, wizard: null });
  const [urlManuallyEdited, setUrlManuallyEdited] = useState(false);
  const navigate = useRouter();

  const { control, handleSubmit, reset, watch, setValue, getValues, formState: { isValid, isSubmitting } } = useForm({
    mode: 'onChange'
  });

  const watchedType = watch('type');
  const watchedUrl = watch('url');

  const fetchWizards = async () => {
    setLoading(true);
    try {
      const response = await formWizardsService.getWizards();
      const wizardsData = Array.isArray(response) ? response : (response?.data || []);
      setWizards(wizardsData);
    } catch (err) {
      console.error('Failed to fetch wizards', err);
      toast.error('Failed to fetch wizards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWizards();
  }, []);

  const handleView = (wizard) => {
    navigate.push(`/form-wizards/${wizard.uuid}`);
  };

  const handleCopyUrl = (wizard) => {
    const slug = wizard.url || sanitizeUrl(wizard.name);
    const route = wizard.type === 'INTERNAL' ? `/wizard/${slug}` : `/form/${slug}`;
    const url = `${window.location.origin}${route}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Wizard URL copied to clipboard!');
    });
  };

  const onFormSubmit = async (data) => {
    const { type } = modalState;
    try {
      const slug = (data.url || '').trim() || sanitizeUrl(data.name);
      if (type === 'create') {
        await formWizardsService.createWizard({
          name: data.name,
          type: data.type || 'INTERNAL',
          objectUuid: data.objectUuid,
          url: slug
        });
        toast.success('Wizard created successfully');
      } else if (type === 'edit') {
        await formWizardsService.updateWizard(modalState.wizard.uuid, {
          name: data.name,
          type: data.type || 'INTERNAL',
          url: slug
        });
        toast.success('Wizard updated successfully');
      }
      setModalState({ isOpen: false, type: null, wizard: null });
      fetchWizards();
    } catch (err) {
      console.error(`Failed to ${type} wizard`, err);
      toast.error(err.response?.data?.error || err.response?.data?.message || `Failed to ${type} wizard.`);
    }
  };

  const confirmAction = async () => {
    const { type } = modalState;
    if (type === 'create' || type === 'edit') {
      await handleSubmit(onFormSubmit)();
    } else if (type === 'delete') {
      try {
        await formWizardsService.deleteWizard(modalState.wizard.uuid);
        toast.success('Wizard deleted successfully');
        setModalState({ isOpen: false, type: null, wizard: null });
        fetchWizards();
      } catch (err) {
        console.error(`Failed to delete wizard`, err);
        toast.error(err.response?.data?.error || err.response?.data?.message || `Failed to delete wizard.`);
      }
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Wizard Name', 
      sortable: true,
      render: (row) => (
        <span 
          className="wizard-name-link"
          onClick={(e) => { e.stopPropagation(); handleView(row); }}
        >
          {row.name}
        </span>
      )
    },
    { key: 'type', label: 'Type', sortable: true },
    { 
      key: 'url', 
      label: 'Page URL',
      render: (row) => {
        const slug = row.url || sanitizeUrl(row.name);
        const isInternal = row.type === 'INTERNAL';
        const routePath = isInternal ? `/wizard/${slug}` : `/form/${slug}`;
        const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${routePath}` : routePath;

        if (!isInternal) {
          return (
            <SButton
              size="xs"
              color="ghost"
              icon="copy"
              text="Copy URL"
              className="wizard-copy-btn"
              onClick={(e) => { e.stopPropagation(); handleCopyUrl(row); }}
              title={`Copy ${fullUrl}`}
            />
          );
        }

        return (
          <a 
            href={routePath}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="wizard-url-link"
            title={fullUrl}
          >
            {routePath}
          </a>
        );
      }
    },
    { 
      key: 'createdAt', 
      label: 'Created At',
      render: (row) => new Date(row.createdAt).toLocaleString()
    },
  ];

  const objectOptions = objects.map(o => ({ label: o.name, value: o.uuid }));

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <SDataTable 
        title="Form Wizards"
        data={wizards}
        columns={columns}
        loading={loading}
        actions={['view', 'edit', 'delete']}
        onAction={(action, row) => {
          if (action === 'view') handleView(row);
          if (action === 'edit') {
            setUrlManuallyEdited(true);
            reset({
              name: row.name,
              type: row.type || 'INTERNAL',
              objectUuid: row.objectUuid,
              url: row.url || sanitizeUrl(row.name)
            });
            setModalState({ isOpen: true, type: 'edit', wizard: row });
          }
          if (action === 'delete') {
            setModalState({ isOpen: true, type: 'delete', wizard: row });
          }
        }}
        canExecuteAction={() => true}
        headerActions={
          <SButton
            text="Create Wizard"
            color="primary"
            onClick={async () => {
              setUrlManuallyEdited(false);
              reset({ name: '', type: 'INTERNAL', objectUuid: '', url: '' });
              setModalState({ isOpen: true, type: 'create', wizard: null });
              if (objects.length === 0) {
                try {
                  const objResponse = await objectsService.getObjects();
                  setObjects(Array.isArray(objResponse) ? objResponse : (objResponse?.data || []));
                } catch (e) {
                  console.error('Failed to load objects for create modal', e);
                }
              }
            }}
          />
        }
      />

      <SModal
        isOpen={modalState.isOpen && (modalState.type === 'create' || modalState.type === 'edit')}
        title={modalState.type === 'create' ? 'Create Wizard' : 'Edit Wizard'}
        onConfirm={confirmAction}
        onCancel={() => setModalState({ isOpen: false, type: null, wizard: null })}
        isProcessing={isSubmitting}
        confirmDisabled={!isValid}
        confirmText={modalState.type === 'create' ? 'Create' : 'Save Changes'}
        confirmColor="primary"
      >
        <form className="wizard-modal-form">
          <Controller
            name="name"
            control={control}
            rules={{ required: 'Wizard Name is required' }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <STextField
                label="Wizard Name (Must be unique)"
                text={value || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange(val);
                  if (modalState.type === 'create' && !urlManuallyEdited) {
                    setValue('url', sanitizeUrl(val), { shouldValidate: true });
                  }
                }}
                required
                error={error?.message}
              />
            )}
          />

          <Controller
            name="type"
            control={control}
            rules={{ required: 'Wizard Usage is required' }}
            defaultValue="INTERNAL"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="wizard-usage-container">
                <div className="wizard-usage-label-row">
                  <label className="wizard-field-label">
                    Wizard Usage
                  </label>
                  <STooltip 
                    content="Internal wizards provide authenticated record management at /wizard/pageUrl. External wizards provide a standalone public form at /form/pageUrl."
                    position="right"
                  />
                </div>
                
                <div className="wizard-usage-toggle-group">
                  <SButton
                    type="button"
                    size="s"
                    color={(value || 'INTERNAL') === 'INTERNAL' ? 'primary' : 'secondary'}
                    text="Internal"
                    onClick={() => onChange('INTERNAL')}
                  />
                  <SButton
                    type="button"
                    size="s"
                    color={value === 'EXTERNAL' ? 'primary' : 'secondary'}
                    text="External"
                    onClick={() => onChange('EXTERNAL')}
                  />
                </div>
                {error && <div className="wizard-field-error">{error.message}</div>}
              </div>
            )}
          />

          <Controller
            name="url"
            control={control}
            rules={{
              required: 'Page URL is required',
              pattern: {
                value: /^\S+$/,
                message: 'Page URL should not include space'
              }
            }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <STextField
                  label="Page URL"
                  text={value || ''}
                  placeholder="e.g. customer-survey"
                  onChange={(e) => {
                    setUrlManuallyEdited(true);
                    onChange(e.target.value);
                  }}
                  required
                  error={error?.message}
                />
                <div className="wizard-target-url-preview">
                  {watchedType === 'INTERNAL' || !watchedType ? (
                    <div>
                      Target URL:{' '}
                      <span className="wizard-target-url-code">
                        saanviworld.com/wizard/{value || 'pageUrl'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      Target URL:{' '}
                      <span className="wizard-target-url-code">
                        saanviworld.com/form/{value || 'pageUrl'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          />

          {modalState.type === 'create' && (
            <Controller
              name="objectUuid"
              control={control}
              rules={{ required: 'Target Object is required' }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <SDropdown
                    label="Target Object"
                    value={value || ''}
                    options={[{ label: 'Select Object', value: '' }, ...objectOptions]}
                    onChange={(val) => onChange(val)}
                    required
                  />
                  {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error.message}</div>}
                </div>
              )}
            />
          )}
        </form>
      </SModal>

      <SDeleteConfirmation
        isOpen={modalState.isOpen && modalState.type === 'delete'}
        title="Delete Wizard"
        onConfirm={confirmAction}
        onCancel={() => setModalState({ isOpen: false, type: null, wizard: null })}
        isProcessing={isSubmitting}
        itemName={modalState.wizard?.name}
        itemType="wizard"
      />
    </div>
  );
};

export default FormWizardsFeature;
