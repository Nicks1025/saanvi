import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import SDataTable from '@/components/common/SDataTable';
import SModal from '@/components/common/SModal';
import SDeleteConfirmation from '@/components/common/SDeleteConfirmation';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import * as objectsService from './objectsService';

const ObjectTemplatesFeature = ({ onTabChange }) => {
  const { t } = useTranslation();
  const { uuid } = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const navigate = useRouter();

  const [object, setObject] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });

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
    control: templateControl,
    handleSubmit: handleTemplateFormSubmit,
    reset: resetTemplateForm,
    formState: { isValid: isTemplateValid, isSubmitting: isTemplateSubmitting }
  } = useForm({ mode: 'onChange', defaultValues: { name: '' } });

  useEffect(() => {
    if (uuid) {
      fetchObjectData();
      fetchTemplates();
    }
  }, [uuid]);

  const fetchObjectData = async () => {
    try {
      const res = await objectsService.getObject(uuid);
      setObject(res);
    } catch (err) {
      toast.error(t('admin.objects.loadObjectFailed'));
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const templates = await objectsService.getTemplates(uuid);
      setTemplates(templates);
    } catch (err) {
      toast.error(t('admin.objects.loadTemplatesFailed'));
    } finally {
      setLoading(false);
    }
  };

  const onTemplateFormSubmit = async (data) => {
    try {
      if (modalState.type === 'createTemplate') {
        await objectsService.createTemplate(uuid, { name: data.name });
        toast.success('Template created');
      } else if (modalState.type === 'editTemplate') {
        await objectsService.updateTemplate(uuid, modalState.data.uuid, { name: data.name });
        toast.success('Template updated');
      }
      setModalState({ isOpen: false, type: null, data: null });
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to manage template');
    }
  };

  const handleTemplateDelete = async () => {
    try {
      await objectsService.deleteTemplate(uuid, modalState.data.uuid);
      toast.success('Template deleted');
      setModalState({ isOpen: false, type: null, data: null });
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete template');
    }
  };

  const columns = [
    { key: 'name', label: 'Template Name' }
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

      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <SDataTable
          title={object?.name}
          data={templates}
          columns={columns}
          loading={loading}
          tabs={tabsConfig}
          activeTab="templates"
          onTabChange={handleTabChange}
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
            <SButton
              text="Create Template"
              onClick={() => {
                resetTemplateForm({ name: '' });
                setModalState({ isOpen: true, type: 'createTemplate', data: null });
              }}
            />
          }
        />
      </div>

      <SModal
        isOpen={['createTemplate', 'editTemplate'].includes(modalState.type)}
        title={modalState.type === 'createTemplate' ? 'Create Template' : 'Edit Template'}
        onConfirm={handleTemplateFormSubmit(onTemplateFormSubmit)}
        onCancel={() => setModalState({ isOpen: false, type: null, data: null })}
        confirmText={modalState.type === 'createTemplate' ? 'Create' : 'Save Changes'}
        isProcessing={isTemplateSubmitting}
        confirmDisabled={!isTemplateValid}
      >
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
      </SModal>

      <SDeleteConfirmation
        isOpen={modalState.type === 'deleteTemplate'}
        title={t('admin.objects.deleteTemplateTitle')}
        onConfirm={handleTemplateDelete}
        onCancel={() => setModalState({ isOpen: false, type: null, data: null })}
        itemName={modalState.data?.name}
        itemType="template"
      />
    </div>
  );
};

export default ObjectTemplatesFeature;
