import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import STextField from '../../../components/common/STextField';
import SButton from '../../../components/common/SButton';
import DynamicFormRenderer from '../../../components/common/DynamicFormRenderer';
import { createUser, getFormConfig } from './usersService';
import { validateEmail } from '../../../common/validations';
import toast from 'react-hot-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AddUserFeature = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [formConfig, setFormConfig] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await getFormConfig('admin_create');
        setFormConfig(config);

        const initialForm = { email: '' };
        config.forEach(f => {
          initialForm[f.field_name] = '';
        });
        setForm(initialForm);
      } catch (err) {
        toast.error('Failed to load user fields configuration.');
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === 'email') {
      const err = validateEmail(value);
      setErrors((prev) => ({ ...prev, email: err || undefined }));
      return;
    }

    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validate = () => {
    const e = {};
    const emailErr = validateEmail(form.email);
    if (emailErr) e.email = emailErr;

    // Validate dynamic required fields
    formConfig.forEach(field => {
      if (field.is_required && (!form[field.field_name] || String(form[field.field_name]).trim() === '')) {
        e[field.field_name] = `${field.label} is required`;
      }
    });

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error(Object.values(validationErrors)[0]);
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, email: form.email.trim() };
      const result = await createUser(payload);

      toast.success(result?.message || 'User created successfully. A welcome email has been queued for delivery.');
      navigate('/admin/users');
    } catch (err) {
      const data = err.response?.data;
      let msg = 'Something went wrong. Please try again.';
      if (data?.details && Array.isArray(data.details) && data.details.length > 0) {
        msg = data.details[0];
      } else if (data?.error) {
        msg = data.error;
      } else if (err.message) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => navigate('/admin/users');

  return (
    <div className="admin-users-container page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <button 
            onClick={() => navigate('/admin/users')}
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
            <form onSubmit={handleSubmit} noValidate autoComplete="off">



              <DynamicFormRenderer
                fields={formConfig}
                form={form}
                errors={errors}
                onChange={handleChange}
              />

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
                  color="default"
                  text={t('common.cancel', 'Cancel')}
                  onClick={handleCancel}
                  style={{ background: '#ffebee', color: '#d32f2f', border: 'none', fontWeight: 600 }}
                />
                <SButton
                  type="submit"
                  color="primary"
                  disabled={loading}
                  icon={loading ? <Loader2 className="signup-spinner" size={16} /> : null}
                  text={loading ? t('common.creating', 'Creating...') : t('admin.createUser', 'Create User')}
                  style={{ background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 600 }}
                />
              </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default AddUserFeature;
