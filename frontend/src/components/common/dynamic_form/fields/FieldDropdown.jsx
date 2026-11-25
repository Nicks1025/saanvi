import React, { useMemo } from 'react';
import SDropdown from '../../SDropdown';

const parseDropdownOptions = (field) => {
  let dropOptions = [];
  try {
    const rawOptions = field.optionsConfig ?? field.options_config ?? field.options ?? [];
    dropOptions = typeof rawOptions === 'string'
      ? JSON.parse(rawOptions)
      : rawOptions;
    if (typeof dropOptions === 'string') dropOptions = JSON.parse(dropOptions);
  } catch (e) {}

  if (!Array.isArray(dropOptions)) {
    dropOptions = [];
  }

  dropOptions = dropOptions.map((o) => ({
    label: o?.label !== undefined ? o.label : o,
    value: o?.value !== undefined ? o.value : o,
  }));

  if (dropOptions.length > 0 && dropOptions[0].value !== '') {
    dropOptions = [{ label: `Select ${field.label || 'option'}`, value: '' }, ...dropOptions];
  }
  return dropOptions;
};

const FieldDropdown = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
  marginBottom = '0',
  ...props
}) => {
  const options = useMemo(() => parseDropdownOptions(field), [field]);

  const inputId = field.placementUuid ? `input_${field.placementUuid}` : `input_${field.uuid}`;

  return (
    <div style={{ marginBottom }}>
      <SDropdown
        id={inputId}
        name={field.fieldName}
        label={field.label}
        required={field.isRequired}
        value={value ?? ''}
        options={options}
        onChange={(val) => onChange(val)}
        disabled={disabled}
        marginBottom="0"
        {...props}
      />
      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error}</div>}
    </div>
  );
};

export default FieldDropdown;
