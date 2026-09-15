'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import * as formsService from '../formsService';

const PublicFormFeature = () => {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isFormValid = useMemo(() => {
    if (!form || !form.fields) return false;
    return form.fields.every(f => {
      if (!f.is_required) return true;
      const val = formData[f.field_name];
      return val !== undefined && val !== null && val !== '';
    });
  }, [form, formData]);

  useEffect(() => {
    fetchForm();
  }, [slug]);

  const fetchForm = async () => {
    try {
      const res = await formsService.getPublicForm(slug);
      setForm(res.data || res); // Depending on wrapper
    } catch (err) {
      toast.error('Form not found or unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setSubmitting(true);
    try {
      await formsService.submitPublicForm(slug, formData);
      setSubmitted(true);
      toast.success('Form submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading form...</div>;
  if (!form) return <div style={{ padding: '2rem', textAlign: 'center' }}>Form not found</div>;

  if (submitted) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', padding: '2rem', background: 'var(--surface)' }}>
        <h1 style={{ textAlign: 'center', color: 'var(--text-primary)', marginBottom: '1rem' }}>Thank You!</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Your submission has been received.</p>
      </div>
    );
  }

  // Very basic rendering of fields, no complex layout engine for this demonstration
  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '2rem', background: 'var(--surface)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--text-primary)' }}>{form.name}</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {form.template && form.template.layout && form.template.layout.length > 0 ? (
          (() => {
            const maxRow = Math.max(...form.template.layout.map(f => f.row_number || 0));
            const rows = [];
            for (let r = 0; r <= maxRow; r++) {
              const fieldsInRow = form.template.layout.filter(f => (f.row_number || 0) === r);
              if (fieldsInRow.length > 0) {
                const maxCol = Math.max(...fieldsInRow.map(f => f.column_number || 0));
                const columns = [];
                for (let c = 0; c <= maxCol; c++) {
                  const fieldsInCol = fieldsInRow
                    .filter(f => (f.column_number || 0) === c)
                    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                  if (fieldsInCol.length > 0) {
                    columns.push(fieldsInCol);
                  }
                }
                if (columns.length > 0) rows.push(columns);
              }
            }
            return rows.map((rowCols, rIdx) => (
              <div key={`row-${rIdx}`} style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
                {rowCols.map((colFields, cIdx) => {
                  const flexBasis = `${(colFields[0].width / 12) * 100}%`;
                  
                  return (
                    <div key={`col-${rIdx}-${cIdx}`} style={{ flex: `0 0 calc(${flexBasis} - ${((rowCols.length - 1) * 1) / rowCols.length}rem)`, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {colFields.map((layoutField, fIdx) => {
                        const field = form.fields.find(f => f.uuid === layoutField.field_uuid);
                        if (!field) return null;
                        
                        return (
                          <div key={`${field.uuid}-${rIdx}-${cIdx}-${fIdx}`}>
                            {field.field_type === 'TEXT' || field.field_type === 'EMAIL' || field.field_type === 'PHONE' || field.field_type === 'NUMBER' ? (
                              <STextField
                                label={field.label}
                                required={field.is_required}
                                placeholder={field.placeholder || ''}
                                text={formData[field.field_name] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                                type={field.field_type === 'NUMBER' ? 'number' : field.field_type === 'EMAIL' ? 'email' : 'text'}
                              />
                            ) : field.field_type === 'TEXTAREA' ? (
                              <div className="s-text-field">
                                <label className="s-text-field-label">{field.label} {field.is_required && '*'}</label>
                                <textarea
                                  className="s-text-field-input"
                                  required={field.is_required}
                                  placeholder={field.placeholder || ''}
                                  value={formData[field.field_name] || ''}
                                  onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                                  style={{ minHeight: '100px', padding: '0.75rem', resize: 'vertical' }}
                                />
                              </div>
                            ) : field.field_type === 'CHECKBOX' ? (
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                <input
                                  type="checkbox"
                                  required={field.is_required}
                                  checked={formData[field.field_name] === 'true' || formData[field.field_name] === true}
                                  onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.checked })}
                                />
                                {field.label} {field.is_required && '*'}
                              </label>
                            ) : (
                              <STextField
                                label={field.label}
                                required={field.is_required}
                                text={formData[field.field_name] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ));
          })()
        ) : (
          form.fields && form.fields.map((field) => (
          <div key={field.uuid}>
            {field.field_type === 'TEXT' || field.field_type === 'EMAIL' || field.field_type === 'PHONE' || field.field_type === 'NUMBER' ? (
              <STextField
                label={field.label}
                required={field.is_required}
                placeholder={field.placeholder || ''}
                text={formData[field.field_name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                type={field.field_type === 'NUMBER' ? 'number' : field.field_type === 'EMAIL' ? 'email' : 'text'}
              />
            ) : field.field_type === 'TEXTAREA' ? (
              <div className="s-text-field">
                <label className="s-text-field-label">{field.label} {field.is_required && '*'}</label>
                <textarea
                  className="s-text-field-input"
                  required={field.is_required}
                  placeholder={field.placeholder || ''}
                  value={formData[field.field_name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                  style={{ minHeight: '100px', padding: '0.75rem', resize: 'vertical' }}
                />
              </div>
            ) : field.field_type === 'CHECKBOX' ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  required={field.is_required}
                  checked={formData[field.field_name] === 'true' || formData[field.field_name] === true}
                  onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.checked })}
                />
                {field.label} {field.is_required && '*'}
              </label>
            ) : (
              <STextField
                label={field.label}
                required={field.is_required}
                text={formData[field.field_name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
              />
            )}
          </div>
          ))
        )}
        
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <SButton 
            type="submit" 
            text={submitting ? 'Submitting...' : 'Submit'} 
            disabled={submitting || !isFormValid} 
            style={{ padding: '0.5rem 1.5rem', background: 'var(--accent)', color: 'white', opacity: (!isFormValid || submitting) ? 0.5 : 1, cursor: (!isFormValid || submitting) ? 'not-allowed' : 'pointer' }} 
          />
        </div>
      </form>
    </div>
  );
};

export default PublicFormFeature;
