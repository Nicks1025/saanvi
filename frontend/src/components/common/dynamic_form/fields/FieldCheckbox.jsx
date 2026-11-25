import React, { useMemo } from 'react';

const parseOptions = (field) => {
  let opts = field.options || field.optionsConfig || field.options_config || field.field_config?.options;
  if (typeof opts === 'string') {
    try { opts = JSON.parse(opts); } catch { opts = []; }
  }
  if (!Array.isArray(opts)) opts = opts?.options || opts?.items || [];
  return Array.isArray(opts) ? opts.map((o) => ({
    label: o?.label ?? o?.value ?? o,
    value: String(o?.value ?? o?.key ?? o),
  })) : [];
};

const FieldCheckbox = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
  marginBottom = '0.5rem',
}) => {
  const options = useMemo(() => parseOptions(field), [field]);

  // Multiple checkboxes
  if (options.length > 0) {
    const selected = Array.isArray(value)
      ? value.map(String)
      : typeof value === 'string' && value
      ? value.split(',').map((s) => s.trim())
      : [];

    const toggle = (optVal) => {
      if (disabled) return;
      const next = selected.includes(optVal)
        ? selected.filter((v) => v !== optVal)
        : [...selected, optVal];
      onChange(next);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {field.label} {field.isRequired && '*'}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '2px' }}>
          {options.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                color: 'var(--text-h, #08060d)',
                opacity: disabled ? 0.7 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                disabled={disabled}
                onChange={() => toggle(opt.value)}
                style={{ accentColor: 'var(--accent)', width: '1.1rem', height: '1.1rem', cursor: disabled ? 'not-allowed' : 'pointer' }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        {error && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}
      </div>
    );
  }

  // Single boolean checkbox
  const inputId = field.placementUuid ? `input_${field.placementUuid}` : `input_${field.uuid}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom }}>
      <label
        htmlFor={inputId}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--text-h, #08060d)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <input
          type="checkbox"
          id={inputId}
          checked={value === true || value === 'true'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: '1.15rem', height: '1.15rem', accentColor: 'var(--accent)', cursor: disabled ? 'not-allowed' : 'pointer' }}
        />
        <span>
          {field.label} {field.isRequired && '*'}
        </span>
      </label>
      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}
    </div>
  );
};

export default FieldCheckbox;
