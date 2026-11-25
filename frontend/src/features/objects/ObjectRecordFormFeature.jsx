import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import SButton from '@/components/common/SButton';
import DynamicFormRenderer from '@/components/common/dynamic_form';
import * as objectsService from './objectsService';

const ObjectRecordFormFeature = () => {
  const { t } = useTranslation();
  const params = useParams();
  const uuid = params.uuid;
  const navigate = useRouter();
  const pathname = usePathname();

  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  // Determine mode from URL path
  const mode = useMemo(() => {
    if (pathname.includes('/add')) return 'add';
    if (pathname.includes('/edit')) return 'edit';
    return 'view';
  }, [pathname]);

  // Extract record_uuid from params.record_uuid or slug fallback
  const record_uuid = mode !== 'add' ? (params.record_uuid || (Array.isArray(params.slug) ? params.slug[0] : params.slug) || null) : null;

  const { control, handleSubmit, reset, formState: { isValid, isSubmitting } } = useForm({
    mode: 'onChange'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (mode === 'add') {
          const fields = await objectsService.getFields(uuid);
          setFields(fields);
        } else {
          const [fields, record] = await Promise.all([
            objectsService.getFields(uuid),
            objectsService.getRecord(uuid, record_uuid)
          ]);

          setFields(fields);

          if (record) {
            reset(record);
          } else {
            toast.error(t('admin.objects.recordNotFound'));
            navigate.push(`/objects/${uuid}?tab=records`);
          }
        }
      } catch (err) {
        toast.error(t('admin.objects.loadDataFailed'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [uuid, record_uuid, reset, navigate, mode, t]);

  const onSubmit = async (data) => {
    try {
      if (mode === 'add') {
        await objectsService.createRecord(uuid, data);
        toast.success(t('admin.objects.recordCreated'));
      } else if (mode === 'edit') {
        await objectsService.updateRecord(uuid, record_uuid, data);
        toast.success(t('admin.objects.recordUpdated'));
      }
      navigate.push(`/objects/${uuid}?tab=records`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || err.message || t('admin.objects.saveRecordFailed'));
    }
  };

  const getPageTitle = () => {
    if (mode === 'add') return t('admin.objects.addRecord');
    if (mode === 'edit') return t('admin.objects.editRecord');
    return t('admin.objects.viewRecord');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      {t('admin.objects.loadingForm')}
    </div>
  );

  return (
    <div className="admin-users-container page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <button 
            type="button"
            onClick={() => navigate.push(`/objects/${uuid}?tab=records`)}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0, marginBottom: '0.5rem' }}
          >
            &larr; {t('admin.objects.backToRecords')}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {getPageTitle()}
          </h1>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--bg)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
        {mode === 'view' ? (
          <fieldset disabled style={{ border: 'none', padding: 0, margin: 0 }}>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <DynamicFormRenderer fields={fields} control={control} />
            </form>
          </fieldset>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <DynamicFormRenderer fields={fields} control={control} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingBottom: '2rem' }}>
              <SButton
                type="button"
                text={t('common.cancel')}
                color="danger"
                onClick={() => navigate.push(`/objects/${uuid}?tab=records`)}
              />
              <SButton
                type="submit"
                text={t('admin.objects.saveRecord')}
                color="primary"
                disabled={!isValid || isSubmitting}
              />
            </div>
          </form>
        )}

        {mode === 'view' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingBottom: '2rem' }}>
            <SButton
              type="button"
              text={t('common.close')}
              color="secondary"
              onClick={() => navigate.push(`/objects/${uuid}?tab=records`)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectRecordFormFeature;
