import React from 'react';
import SDate from '../../SDate';

const FieldDate = ({
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
    <SDate
      id={inputId}
      name={field.fieldName}
      label={field.label}
      required={field.isRequired}
      text={value ?? ''}
      onChange={(e) => onChange(e?.target ? e.target.value : e)}
      error={error}
      disabled={disabled}
      marginBottom={marginBottom}
      {...props}
    />
  );
};

export default FieldDate;
