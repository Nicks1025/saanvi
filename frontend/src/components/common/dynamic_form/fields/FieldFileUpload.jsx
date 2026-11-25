import React from 'react';
import SFileUpload from '../../SFileUpload';

const FieldFileUpload = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
  marginBottom = '0',
  ...props
}) => {
  const inputId = field.placementUuid ? `input_${field.placementUuid}` : `input_${field.uuid}`;

  return (
    <SFileUpload
      id={inputId}
      name={field.fieldName}
      label={field.label}
      required={field.isRequired}
      file={value}
      onChange={(f) => onChange(f)}
      error={error}
      disabled={disabled}
      marginBottom={marginBottom}
      {...props}
    />
  );
};

export default FieldFileUpload;
