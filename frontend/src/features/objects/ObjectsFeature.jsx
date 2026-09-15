import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import SDataTable from '@/components/common/SDataTable';
import SModal from '@/components/common/SModal';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import * as objectsService from './objectsService';

const ObjectsFeature = () => {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ isOpen: false, type: null, object: null });
  const navigate = useRouter();
  const { t } = useTranslation();

  const { control, handleSubmit, reset, formState: { isValid, isSubmitting } } = useForm({
    mode: 'onChange',
    defaultValues: { name: '' }
  });

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const response = await objectsService.getObjects();
      const objectsData = Array.isArray(response) ? response : (response?.data || []);
      setObjects(objectsData);
    } catch (err) {
      console.error('Failed to fetch objects', err);
      toast.error('Failed to fetch objects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects();
  }, []);

  const handleView = (object) => {
    navigate.push(`/objects/${object.uuid}`);
  };

  const onFormSubmit = async (data) => {
    const { type } = modalState;
    try {
      if (type === 'create') {
        await objectsService.createObject(data);
        toast.success('Object created successfully');
      } else if (type === 'edit') {
        await objectsService.updateObject(modalState.object.uuid, data);
        toast.success('Object updated successfully');
      }
      setModalState({ isOpen: false, type: null, object: null });
      fetchObjects();
    } catch (err) {
      console.error(`Failed to ${type} object`, err);
      toast.error(err.response?.data?.error || err.response?.data?.message || `Failed to ${type} object.`);
    }
  };

  const confirmAction = async () => {
    const { type } = modalState;
    if (type === 'create' || type === 'edit') {
      await handleSubmit(onFormSubmit)();
    } else if (type === 'delete') {
      try {
        await objectsService.deleteObject(modalState.object.uuid);
        toast.success('Object deleted successfully');
        setModalState({ isOpen: false, type: null, object: null });
        fetchObjects();
      } catch (err) {
        console.error(`Failed to delete object`, err);
        toast.error(err.response?.data?.error || err.response?.data?.message || `Failed to delete object.`);
      }
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Object Name',
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
    {
      key: 'created_at',
      label: 'Created At',
      render: (row) => new Date(row.created_at).toLocaleString()
    },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <SDataTable
        title="Objects"
        data={objects}
        columns={columns}
        loading={loading}
        actions={['view', 'edit', 'delete']}
        onAction={(action, row) => {
          if (action === 'view') handleView(row);
          if (action === 'edit') {
            reset({ name: row.name });
            setModalState({ isOpen: true, type: 'edit', object: row });
          }
          if (action === 'delete') {
            setModalState({ isOpen: true, type: 'delete', object: row });
          }
        }}
        canExecuteAction={() => true}
        headerActions={
          <SButton
            text="Create Object"
            onClick={() => {
              reset({ name: '' });
              setModalState({ isOpen: true, type: 'create', object: null });
            }}
            style={{ background: 'var(--accent)', color: 'white' }}
          />
        }
      />

      <SModal
        isOpen={modalState.isOpen}
        title={modalState.type === 'create' ? 'Create Object' : modalState.type === 'edit' ? 'Edit Object' : 'Delete Object'}
        onConfirm={confirmAction}
        onCancel={() => setModalState({ isOpen: false, type: null, object: null })}
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
              rules={{ required: 'Object name is required' }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <STextField
                  label="Object Name"
                  text={value}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  error={error?.message}
                />
              )}
            />
          </form>
        )}
        {modalState.type === 'delete' && modalState.object && (
          <div style={{ paddingTop: '1rem' }}>
            Are you sure you want to delete object <strong>{modalState.object.name}</strong>? This action cannot be undone.
          </div>
        )}
      </SModal>
    </div>
  );
};

export default ObjectsFeature;
