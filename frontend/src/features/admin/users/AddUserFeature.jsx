import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import STextField from '../../../components/common/STextField';
import SDropdown from '../../../components/common/SDropdown';
import SButton from '../../../components/common/SButton';
import { createUser } from './usersService';
import { validateEmail } from '../../../common/validations';
import toast from 'react-hot-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GENDER_OPTIONS = [
  { label: 'Select Gender', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'हिंदी', value: 'hi' },
];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  displayName: '',
  email: '',
  phoneNumber: '',
  dateOfBirth: '',
  gender: '',
  language: 'en',
};

const AddUserFeature = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const translatedGenderOptions = [
    { label: t('admin.selectGender', 'Select Gender'), value: '' },
    { label: t('admin.genderMale', 'Male'), value: 'male' },
    { label: t('admin.genderFemale', 'Female'), value: 'female' },
    { label: t('admin.genderOther', 'Other'), value: 'other' },
    { label: t('admin.genderPreferNot', 'Prefer not to say'), value: 'prefer_not_to_say' },
  ];

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Live validation for email
    if (field === 'email') {
      const err = validateEmail(value);
      setErrors((prev) => ({ ...prev, email: err || undefined }));
      return;
    }

    // Live phone — only digits, 10 max
    if (field === 'phoneNumber') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setForm((prev) => ({ ...prev, phoneNumber: digits }));
      return;
    }

    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.displayName.trim()) e.displayName = 'Display name is required';
    const emailErr = validateEmail(form.email);
    if (emailErr) e.email = emailErr;
    if (!form.gender) e.gender = 'Please select a gender';
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
      const result = await createUser({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: form.displayName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        language: form.language || 'en',
      });

      // Show the generated password to admin before redirecting
      if (result?.data?.temporaryPassword) {
        toast.success(`User created! Temporary password: ${result.data.temporaryPassword}`, { duration: 10000 });
      } else {
        toast.success('User created successfully!');
      }

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
        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <STextField
            label={t('admin.firstName', 'First Name')}
            text={form.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            placeholder="Jane"
            required
            error={errors.firstName}
          />
          <STextField
            label={t('admin.lastName', 'Last Name')}
            text={form.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            placeholder="Doe"
            required
            error={errors.lastName}
          />
        </div>

        <STextField
          label={t('admin.displayName', 'Display Name')}
          text={form.displayName}
          onChange={(e) => handleChange('displayName', e.target.value)}
          placeholder={t('admin.displayNameDesc', 'How others will see you')}
          required
          error={errors.displayName}
        />

        <STextField
          label={t('admin.email', 'Email')}
          type="email"
          text={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="user@example.com"
          required
          error={errors.email}
          autoComplete="email"
        />

        <STextField
          label={t('admin.phoneNumber', 'Phone Number')}
          type="tel"
          text={form.phoneNumber}
          onChange={(e) => handleChange('phoneNumber', e.target.value)}
          placeholder={t('admin.phonePlaceholder', '10-digit number')}
          error={errors.phoneNumber}
          autoComplete="tel"
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <STextField
            label={t('admin.dob', 'Date of Birth')}
            type="date"
            text={form.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            error={errors.dateOfBirth}
            autoComplete="bday"
            marginBottom="0"
          />
          <div style={{ marginBottom: '1rem' }}>
            <SDropdown
              label={<span>{t('admin.gender', 'Gender')}<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span></span>}
              value={form.gender}
              options={translatedGenderOptions}
              onChange={(v) => handleChange('gender', v)}
            />
          </div>
        </div>

        <SDropdown
          label={t('admin.language', 'Language')}
          value={form.language}
          options={LANGUAGE_OPTIONS}
          onChange={(v) => handleChange('language', v)}
        />

        {/* Info box: password is auto-generated */}
        <div style={{
          marginTop: '0.5rem',
          marginBottom: '1.5rem',
          padding: '0.75rem 1rem',
          background: 'var(--accent-bg, rgba(170,59,255,0.08))',
          border: '1px solid var(--accent-border, rgba(170,59,255,0.3))',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: 'var(--text)',
          lineHeight: '1.5'
        }}>
          🔐 {t('admin.passwordGenDesc', 'Password will be randomly generated and shown to you once on submission. Share it securely with the user.')}
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
      </div>
    </div>
  );
};

export default AddUserFeature;
