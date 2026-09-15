import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import SDataTable from '@/components/common/SDataTable';
import SModal from '@/components/common/SModal';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import SDropdown from '@/components/common/SDropdown';
import * as formWizardsService from './formWizardsService';
import * as objectsService from '../objects/objectsService';

const FormWizardsFeature = () => {
  const [wizards, setWizards] = useState([]);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ isOpen: false, type: null, wizard: null });
  const navigate = useRouter();

  const { control, handleSubmit, reset, formState: { isValid, isSubmitting } } = useForm({
    mode: 'onChange'
  });

  const fetchWizards = async () => {
    setLoading(true);
    try {
      const response = await formWizardsService.getWizards();
      const wizardsData = Array.isArray(response) ? response : (response?.data || []);
      setWizards(wizardsData);
      
      const objResponse = await objectsService.getObjects();
      setObjects(Array.isArray(objResponse) ? objResponse : (objResponse?.data || []));
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
    const url = `${window.location.origin}/external-wizard/${wizard.name}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Wizard URL copied to clipboard!');
    });
  };

  const onFormSubmit = async (data) => {
    const { type } = modalState;
    try {
      if (type === 'create') {
        await formWizardsService.createWizard(data);
        toast.success('Wizard created successfully');
      } else if (type === 'edit') {
        await formWizardsService.updateWizard(modalState.wizard.uuid, { name: data.name, type: data.type });
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
          style={{ cursor: 'pointer', color: 'var(--accent)' }}
          onClick={(e) => { e.stopPropagation(); handleView(row); }}
          onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
        >
          {row.name}
        </span>
      )
    },
    { key: 'type', label: 'Type', sortable: true },
    { 
      key: 'url', 
      label: 'URL',
      render: (row) => {
        if (row.type !== 'EXTERNAL') return '-';
        return (
          <span 
            style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} 
            onClick={(e) => { e.stopPropagation(); handleCopyUrl(row); }}
          >
            Copy URL
          </span>
        );
      }
    },
    { 
      key: 'created_at', 
      label: 'Created At',
      render: (row) => new Date(row.created_at).toLocaleString()
    },
  ];

  const typeOptions = [
    { label: 'Internal', value: 'INTERNAL' },
    { label: 'External', value: 'EXTERNAL' }
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
            reset({ name: row.name, type: row.type, object_uuid: row.object_uuid });
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
            onClick={() => {
              reset({ name: '', type: '', object_uuid: '' });
              setModalState({ isOpen: true, type: 'create', wizard: null });
            }}
          />
        }
      />

      <SModal
        isOpen={modalState.isOpen}
        title={modalState.type === 'create' ? 'Create Wizard' : modalState.type === 'edit' ? 'Edit Wizard' : 'Delete Wizard'}
        onConfirm={confirmAction}
        onCancel={() => setModalState({ isOpen: false, type: null, wizard: null })}
        isProcessing={isSubmitting}
        confirmDisabled={(modalState.type === 'create' || modalState.type === 'edit') && !isValid}
        confirmText={modalState.type === 'create' ? 'Create' : modalState.type === 'edit' ? 'Save Changes' : 'Delete'}
        confirmColor={modalState.type === 'delete' ? 'danger' : 'primary'}
      >
        {(modalState.type === 'create' || modalState.type === 'edit') && (
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Wizard Name is required' }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <STextField
                  label="Wizard Name (Must be unique)"
                  text={value || ''}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  error={error?.message}
                />
              )}
            />
            <Controller
              name="type"
              control={control}
              rules={{ required: 'Wizard Type is required' }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <SDropdown
                    label="Wizard Type"
                    value={value || ''}
                    options={[{ label: 'Select Type', value: '' }, ...typeOptions]}
                    onChange={(val) => onChange(val)}
                    required
                  />
                  {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error.message}</div>}
                </div>
              )}
            />
            {modalState.type === 'create' && (
              <Controller
                name="object_uuid"
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
        )}
        {modalState.type === 'delete' && modalState.wizard && (
          <div style={{ paddingTop: '1rem' }}>
            Are you sure you want to delete wizard <strong>{modalState.wizard.name}</strong>? This action cannot be undone.
          </div>
        )}
      </SModal>
    </div>
  );
};

export default FormWizardsFeature;
