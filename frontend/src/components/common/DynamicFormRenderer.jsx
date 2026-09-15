import React from 'react';
import { Controller } from 'react-hook-form';
import STextField from './STextField';
import SLongText from './SLongText';
import SDate from './SDate';
import SEmail from './SEmail';
import SPhoneNumber from './SPhoneNumber';
import SNumber from './SNumber';
import SRadio from './SRadio';
import SCheckbox from './SCheckbox';
import SFileUpload from './SFileUpload';
import SDropdown from './SDropdown';
import { validateEmail, validatePhone } from '@/common/validations';

const DynamicFormRenderer = ({ fields, control }) => {
  if (!fields || fields.length === 0) return null;

  return (
    <>
      {fields.map(field => {
        const rules = { required: field.is_required ? `${field.label} is required` : false };
        const type = (field.field_type || '').toLowerCase();
        
        if (type === 'email') {
          rules.validate = (value) => validateEmail(value) || true;
        }
        if (type === 'phone' || type === 'phonenumber') {
          rules.validate = (value) => validatePhone(value) || true;
        }

        return (
          <Controller
            key={field.uuid || field.field_name || field.id}
            name={field.field_name}
            control={control}
            rules={rules}
            defaultValue={field.default_value || ''}
            render={({ field: { onChange, value }, fieldState: { error } }) => {
              const commonProps = {
                label: field.label,
                required: field.is_required,
                error: error?.message,
                marginBottom: "0"
              };
              
              switch(type) {
                case 'longtext':
                case 'textarea':
                  return <SLongText text={value} onChange={(e) => onChange(e.target.value)} {...commonProps} />;
                case 'email':
                  return <SEmail text={value} onChange={(e) => onChange(e.target.value)} {...commonProps} />;
                case 'phonenumber':
                case 'phone':
                  return <SPhoneNumber text={value} onChange={(e) => onChange(e.target.value)} {...commonProps} />;
                case 'number':
                  return <SNumber text={value} onChange={(e) => onChange(e.target.value)} {...commonProps} />;
                case 'date':
                  return <SDate text={value} onChange={(e) => onChange(e.target.value)} {...commonProps} />;
                case 'dropdown':
                case 'select':
                  let dropOptions = [];
                  try {
                    dropOptions = typeof field.options_config === 'string' ? JSON.parse(field.options_config) : (field.options_config || field.options || []);
                    if (typeof dropOptions === 'string') dropOptions = JSON.parse(dropOptions); // In case it was in field.options string
                  } catch(e) {}
                  
                  dropOptions = dropOptions.map(o => ({ label: o.label || o, value: o.value || o }));
                  if (dropOptions.length > 0 && dropOptions[0].value !== '') {
                     dropOptions = [{ label: `Select ${field.label}`, value: '' }, ...dropOptions];
                  }
                  return (
                    <div style={{ marginBottom: 0 }}>
                      <SDropdown value={value} options={dropOptions} onChange={(v) => onChange(v)} {...commonProps} />
                      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error.message}</div>}
                    </div>
                  );
                case 'radio':
                  let radioOptions = [];
                  try {
                    radioOptions = typeof field.options_config === 'string' ? JSON.parse(field.options_config) : (field.options_config || field.options || []);
                    if (typeof radioOptions === 'string') radioOptions = JSON.parse(radioOptions);
                  } catch(e) {}
                  radioOptions = radioOptions.map(o => ({ label: o.label || o, value: o.value || o }));
                  return <SRadio value={value} options={radioOptions} onChange={(v) => onChange(v)} {...commonProps} />;
                case 'checkbox':
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {field.label} {field.is_required && '*'}
                      </label>
                      <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        style={{ width: '1.25rem', height: '1.25rem' }}
                      />
                      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error.message}</div>}
                    </div>
                  );
                case 'fileupload':
                  return <SFileUpload file={value} onChange={(f) => onChange(f)} {...commonProps} />;
                default:
                  return <STextField text={value || ''} placeholder={field.placeholder || ''} onChange={(e) => onChange(e.target.value)} {...commonProps} />;
              }
            }}
          />
        );
      })}
    </>
  );
};

export default DynamicFormRenderer;
