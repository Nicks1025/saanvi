import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import SButton from '@/components/common/SButton';
import DynamicFormRenderer from '@/components/common/DynamicFormRenderer';
import { createUser, getFormConfig } from './usersService';
import toast from 'react-hot-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AddUserFeature = () => {
  const { t } = useTranslation();
  const navigate = useRouter();

  const { control, handleSubmit, formState: { errors, isValid, isSubmitting }, setError, clearErrors } = useForm({
    mode: 'onChange',
    defaultValues: { email: '' }
  });

  const [formConfig, setFormConfig] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await getFormConfig('admin_create');
        setFormConfig(config);
      } catch (err) {
        toast.error('Failed to load user fields configuration.');
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, email: data.email.trim() };
      const result = await createUser(payload);

      toast.success(result?.message || 'User created successfully. A welcome email has been queued for delivery.');
      navigate.push('/admin/users');
    } catch (err) {
      const respData = err.response?.data;
      let msg = 'Something went wrong. Please try again.';
      if (respData?.details && Array.isArray(respData.details) && respData.details.length > 0) {
        msg = respData.details[0];
      } else if (respData?.error) {
        msg = respData.error;
      } else if (err.message) {
        msg = err.message;
      }
      toast.error(msg);
    }
  };

  const handleCancel = () => navigate.push('/admin/users');

  return (
    <div className="admin-users-container page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <button
            onClick={() => navigate.push('/admin/users')}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0, marginBottom: '0.5rem' }}
          >
            &larr; {t('admin.backToUsers', 'Back to Users')}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={22} />
            {t('admin.addUser', 'Add User')}
          </h1>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--bg)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
        {configLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 className="spin" size={32} />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <DynamicFormRenderer fields={formConfig} control={control} />
            </div>

            {/* Info box: password is auto-generated */}
            <div style={{
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              padding: '0.75rem 1rem',
              background: 'var(--accent-bg, rgba(170,59,255,0.08))',
              border: '1px solid var(--accent-border, rgba(170,59,255,0.3))',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: 'var(--text)',
              lineHeight: '1.5'
            }}>
              🔐 {t('admin.passwordGenDesc', "Password will be randomly generated and securely sent to the user's email address.")}
            </div>

            {/* Actions — Submit + Cancel at bottom right */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingBottom: '2rem' }}>
              <SButton
                type="button"
                color="danger"
                text={t('common.cancel', 'Cancel')}
                onClick={handleCancel}
              />
              <SButton
                type="submit"
                color="primary"
                disabled={!isValid || isSubmitting}
                icon={isSubmitting ? <Loader2 className="spin" size={16} /> : null}
                text={isSubmitting ? t('common.creating', 'Creating...') : t('admin.createUser', 'Create User')}
                style={!isValid ? undefined : { background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 600 }}
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddUserFeature;
