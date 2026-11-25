import React, { useMemo } from 'react';
import SRadio from '../../SRadio';

const parseRadioOptions = (field) => {
  let radioOptions = [];
  try {
    const rawOptions = field.optionsConfig ?? field.options_config ?? field.options ?? [];
    radioOptions = typeof rawOptions === 'string'
      ? JSON.parse(rawOptions)
      : rawOptions;
    if (typeof radioOptions === 'string') radioOptions = JSON.parse(radioOptions);
  } catch (e) {}

  if (!Array.isArray(radioOptions)) {
    radioOptions = [];
  }

  return radioOptions.map((o) => ({
    label: o?.label !== undefined ? o.label : o,
    value: o?.value !== undefined ? o.value : o,
  }));
};

const FieldRadio = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
  marginBottom = '0',
  ...props
}) => {
  const options = useMemo(() => parseRadioOptions(field), [field]);

  const inputId = field.placementUuid ? `input_${field.placementUuid}` : `input_${field.uuid}`;

  return (
    <SRadio
      id={inputId}
      name={field.fieldName}
      label={field.label}
      required={field.isRequired}
      value={value ?? ''}
      options={options}
      onChange={(val) => onChange(val)}
      error={error}
      disabled={disabled}
      marginBottom={marginBottom}
      {...props}
    />
  );
};

export default FieldRadio;
