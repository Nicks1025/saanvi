import React from 'react';
import SNumber from '../../SNumber';

const FieldNumber = ({
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
    <SNumber
      id={inputId}
      name={field.fieldName}
      label={field.label}
      required={field.isRequired}
      placeholder={field.placeholder || ''}
      text={value ?? ''}
      onChange={(e) => onChange(e?.target ? e.target.value : e)}
      error={error}
      disabled={disabled}
      marginBottom={marginBottom}
      {...props}
    />
  );
};

export default FieldNumber;
