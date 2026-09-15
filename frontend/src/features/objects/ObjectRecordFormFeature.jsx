import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import SButton from '@/components/common/SButton';
import DynamicFormRenderer from '@/components/common/DynamicFormRenderer';
import axios from '@/services/axios.client';
import * as objectsService from './objectsService';

const ObjectRecordFormFeature = () => {
  const params = useParams();
  const uuid = params.uuid;
  const slug = params.slug || [];
  
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

  // Extract record_uuid from slug if present (it's the first segment for view/edit)
  const record_uuid = mode !== 'add' && slug.length > 0 ? slug[0] : null;

  const { control, handleSubmit, reset, formState: { isValid, isSubmitting } } = useForm({
    mode: 'onChange'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (mode === 'add') {
          const res = await objectsService.getFields(uuid);
          const sortedFields = (Array.isArray(res) ? res : (res.data || [])).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
          setFields(sortedFields);
        } else {
          const [fieldsRes, recordsRes] = await Promise.all([
            objectsService.getFields(uuid),
            objectsService.getRecords(uuid)
          ]);

          const sortedFields = (Array.isArray(fieldsRes) ? fieldsRes : (fieldsRes.data || [])).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
          setFields(sortedFields);

          const data = recordsRes.records ? recordsRes : (recordsRes.data || { records: [] });
          const record = (data.records || []).find(r => r.uuid === record_uuid);
          
          if (record) {
            reset(record);
          } else {
            toast.error('Record not found');
            navigate.push(`/objects/${uuid}?tab=records`);
          }
        }
      } catch (err) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [uuid, record_uuid, reset, navigate, mode]);

  const onSubmit = async (data) => {
    try {
      if (mode === 'add') {
        await axios.post(`/api/objects/${uuid}/records`, data);
        toast.success('Record created successfully');
      } else if (mode === 'edit') {
        await axios.put(`/api/objects/${uuid}/records/${record_uuid}`, data);
        toast.success('Record updated successfully');
      }
      navigate.push(`/objects/${uuid}?tab=records`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save record');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      Loading form...
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
            &larr; Back to Records
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'capitalize' }}>
            {mode} Record
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
                text="Cancel"
                color="danger"
                onClick={() => navigate.push(`/objects/${uuid}?tab=records`)}
              />
              <SButton
                type="submit"
                text={mode === 'add' ? "Create Record" : "Save Changes"}
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
              text="Close"
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
