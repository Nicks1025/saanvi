import React from 'react';
import { Controller } from 'react-hook-form';
import DynamicFormField from './DynamicFormField';

/**
 * DynamicFormRenderer (equivalent to default-template.vue)
 * Form container that iterates through fields and delegates each field's rendering to DynamicFormField.
 *
 * Supports both:
 * 1. Controlled mode: fields, record/form, errors, onChange, isDirty, isSaveAttempted
 * 2. React Hook Form mode: fields, control
 */
const DynamicFormRenderer = ({
  fields = [],
  control,
  record,
  form,
  errors,
  onChange,
  disabled = false,
  isDirty = false,
  isSaveAttempted = false,
  className = '',
  style = {},
}) => {
  if (!fields || fields.length === 0) return null;

  // Filter valid renderable fields
  const renderFields = fields.filter((f) => f && f.is_active !== false);
  const activeRecord = record || form || {};

  // Standardized updateRecord handler matching the shared reference implementation
  const updateRecord = (val, field) => {
    if (onChange) {
      const fieldKey = field.fieldName;
      // Supports both onChange(fieldName, value, field) and onChange(value, field)
      onChange(fieldKey, val, field);
    }
  };

  // React Hook Form Mode
  if (control) {
    return (
      <div className={`dynamic-form-container ${className}`.trim()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', ...style }}>
        {renderFields.map((field, index) => {
          const fieldKey = field.fieldName;
          const rules = { required: field.isRequired ? `${field.label} is required` : false };

          return (
            <Controller
              key={field.placementUuid || field.uuid || field.id || fieldKey || index}
              name={fieldKey}
              control={control}
              rules={rules}
              defaultValue={field.defaultValue || ''}
              render={({ field: { onChange: controllerOnChange, value }, fieldState: { error } }) => (
                <DynamicFormField
                  field={field}
                  value={value}
                  onChange={(val) => controllerOnChange(val)}
                  error={error?.message}
                  disabled={disabled}
                  isDirty={isDirty}
                  isSaveAttempted={isSaveAttempted}
                />
              )}
            />
          );
        })}
      </div>
    );
  }

  // Controlled Form Mode (Signup, Public forms, etc.)
  return (
    <div className={`dynamic-form-container ${className}`.trim()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', ...style }}>
      {renderFields.map((field, index) => {
        const fieldKey = field.fieldName;
        const val = activeRecord[fieldKey] !== undefined ? activeRecord[fieldKey] : (field.defaultValue || '');
        const err = errors ? errors[fieldKey] : undefined;

        return (
          <DynamicFormField
            key={field.placementUuid || field.uuid || field.id || fieldKey || index}
            field={field}
            value={val}
            onChange={updateRecord}
            error={err}
            disabled={disabled}
            isDirty={isDirty}
            isSaveAttempted={isSaveAttempted}
          />
        );
      })}
    </div>
  );
};

export default DynamicFormRenderer;
