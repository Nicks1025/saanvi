import React from 'react';
import { useTranslation } from 'react-i18next';
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

/**
 * A generic renderer that dynamically displays fields based on database configuration.
 *
 * @param {Array} fields - Array of field config objects from the backend
 * @param {Object} form - Form state object
 * @param {Object} errors - Validation errors object
 * @param {Function} onChange - (field_name, value) callback
 */
const DynamicFormRenderer = ({ fields, form, errors, onChange }) => {
  const { t } = useTranslation();

  if (!fields || fields.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {fields.map(field => {
        const label = field.label;
        
        switch(field.field_type) {
          case 'shorttext':
            return (
              <STextField
                key={field.id}
                label={label}
                text={form[field.field_name] || ''}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                error={errors[field.field_name]}
                required={field.is_required}
                marginBottom="0"
              />
            );
          
          case 'longtext':
            return (
              <SLongText
                key={field.id}
                label={label}
                text={form[field.field_name] || ''}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                error={errors[field.field_name]}
                required={field.is_required}
                marginBottom="0"
              />
            );

          case 'email':
            return (
              <SEmail
                key={field.id}
                label={label}
                text={form[field.field_name] || ''}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                error={errors[field.field_name]}
                required={field.is_required}
                marginBottom="0"
              />
            );

          case 'phonenumber':
            return (
              <SPhoneNumber
                key={field.id}
                label={label}
                text={form[field.field_name] || ''}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                error={errors[field.field_name]}
                required={field.is_required}
                marginBottom="0"
              />
            );

          case 'number':
            return (
              <SNumber
                key={field.id}
                label={label}
                text={form[field.field_name] || ''}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                error={errors[field.field_name]}
                required={field.is_required}
                marginBottom="0"
              />
            );
            
          case 'date':
            return (
              <SDate
                key={field.id}
                label={label}
                text={form[field.field_name] || ''}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                error={errors[field.field_name]}
                required={field.is_required}
                marginBottom="0"
              />
            );
            
          case 'dropdown':
            let dropOptions = [];
            try {
              dropOptions = typeof field.options_config === 'string' ? JSON.parse(field.options_config) : (field.options_config || []);
            } catch(e) {}
            
            if (dropOptions.length > 0 && dropOptions[0].value !== '') {
               dropOptions = [{ label: `Select ${field.label}`, value: '' }, ...dropOptions];
            }
            return (
              <div key={field.id} style={{ marginBottom: 0 }}>
                <SDropdown
                  label={label}
                  value={form[field.field_name] || ''}
                  options={dropOptions}
                  onChange={(v) => onChange(field.field_name, v)}
                  required={field.is_required}
                />
                {errors[field.field_name] && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{errors[field.field_name]}</div>}
              </div>
            );
            
          case 'radio':
            let radioOptions = [];
            try {
              radioOptions = typeof field.options_config === 'string' ? JSON.parse(field.options_config) : (field.options_config || []);
            } catch(e) {}
            return (
              <SRadio
                key={field.id}
                label={label}
                value={form[field.field_name] || ''}
                options={radioOptions}
                onChange={(v) => onChange(field.field_name, v)}
                required={field.is_required}
                error={errors[field.field_name]}
                marginBottom="0"
              />
            );

          case 'checkbox':
            return (
              <SCheckbox
                key={field.id}
                label={label}
                checked={!!form[field.field_name]}
                onChange={(v) => onChange(field.field_name, v)}
                required={field.is_required}
                error={errors[field.field_name]}
                marginBottom="0"
              />
            );
            
          case 'fileupload':
            return (
              <SFileUpload
                key={field.id}
                label={label}
                file={form[field.field_name]}
                onChange={(file) => onChange(field.field_name, file)}
                required={field.is_required}
                error={errors[field.field_name]}
                marginBottom="0"
              />
            );
            
          default:
            return (
              <STextField
                key={field.id}
                label={label}
                text={form[field.field_name] || ''}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                error={errors[field.field_name]}
                marginBottom="0"
              />
            );
        }
      })}
    </div>
  );
};

export default DynamicFormRenderer;
