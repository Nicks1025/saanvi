import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import SDataTable from '@/components/common/SDataTable';
import SModal from '@/components/common/SModal';
import SDeleteConfirmation from '@/components/common/SDeleteConfirmation';
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
      const objects = await objectsService.getObjects();
      setObjects(objects);
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
    navigate.push(`/objects/${object.uuid}?tab=records`);
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
      label: t('admin.objects.objectName'),
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
      key: 'createdAt',
      label: t('admin.objects.createdAt'),
      render: (row) => {
        const val = row.createdAt;
        return val ? new Date(val).toLocaleString() : '';
      }
    },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <SDataTable
        title={t('admin.objects.title')}
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
            text={t('admin.objects.addObject')}
            onClick={() => {
              reset({ name: '' });
              setModalState({ isOpen: true, type: 'create', object: null });
            }}
            style={{ background: 'var(--accent)', color: 'white' }}
          />
        }
      />

      <SModal
        isOpen={modalState.isOpen && (modalState.type === 'create' || modalState.type === 'edit')}
        title={modalState.type === 'create' ? t('admin.objects.addObject') : t('admin.objects.editObject')}
        onConfirm={confirmAction}
        onCancel={() => setModalState({ isOpen: false, type: null, object: null })}
        isProcessing={isSubmitting}
        confirmDisabled={!isValid}
        confirmText={modalState.type === 'create' ? t('common.save') : t('common.save')}
        confirmColor="primary"
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
          <Controller
            name="name"
            control={control}
            rules={{ required: 'Object name is required' }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <STextField
                label={t('admin.objects.objectName')}
                text={value}
                onChange={(e) => onChange(e.target.value)}
                required
                error={error?.message}
              />
            )}
          />
        </form>
      </SModal>

      <SDeleteConfirmation
        isOpen={modalState.isOpen && modalState.type === 'delete'}
        title={t('admin.objects.deleteObject')}
        onConfirm={confirmAction}
        onCancel={() => setModalState({ isOpen: false, type: null, object: null })}
        isProcessing={isSubmitting}
        itemName={modalState.object?.name}
        itemType="object"
      />
    </div>
  );
};

export default ObjectsFeature;
