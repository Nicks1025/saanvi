import React from 'react';
import { getFieldComponent } from './fieldComponentsMap';

/**
 * DynamicFormField (equivalent to object-field.vue)
 * Resolves the appropriate field component from the registry, cleanses input, and delegates rendering.
 */
const DynamicFormField = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
  isDirty = false,
  isSaveAttempted = false,
  className = '',
  ...props
}) => {
  if (!field) return null;

  const Component = getFieldComponent(field.fieldType);

  const handleUpdate = (val) => {
    // Clean zero-width chars as in the shared reference implementation
    let cleanVal = val;
    if (typeof cleanVal === 'string') {
      cleanVal = cleanVal.replace(/[\u200B-\u200D\uFEFF]/g, ' ');
    }
    if (onChange) {
      onChange(cleanVal, field);
    }
  };

  return (
    <div
      className={`dynamic-form-field ${className}`.trim()}
      data-field-name={field.fieldName}
      data-field-type={field.fieldType}
    >
      <Component
        field={field}
        value={value}
        onChange={handleUpdate}
        error={error}
        disabled={disabled}
        {...props}
      />
    </div>
  );
};

export default DynamicFormField;
