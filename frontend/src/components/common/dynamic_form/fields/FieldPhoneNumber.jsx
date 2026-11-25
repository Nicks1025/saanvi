import React from 'react';
import SPhoneNumber from '../../SPhoneNumber';

const FieldPhoneNumber = ({
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
    <SPhoneNumber
      id={inputId}
      name={field.fieldName}
      label={field.label}
      required={field.isRequired}
      placeholder={field.placeholder || 'Enter phone number'}
      value={value ?? ''}
      onChange={(e) => onChange(e?.target ? e.target.value : e)}
      error={error}
      disabled={disabled}
      marginBottom={marginBottom}
      {...props}
    />
  );
};

export default FieldPhoneNumber;
