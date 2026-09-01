import React, { useState, useEffect } from 'react';
import SModal from '../../../../components/common/SModal';
import STextField from '../../../../components/common/STextField';
import SDropdown from '../../../../components/common/SDropdown';
import SCheckbox from '../../../../components/common/SCheckbox';
import SButton from '../../../../components/common/SButton';
import axios from '../../../../services/axios.client';
import toast from 'react-hot-toast';

const DynamicVariableModal = ({ isOpen, onClose, variable, mode = 'add', onSuccess }) => {
  const isEditing = mode === 'edit';
  const isView = mode === 'view';

  const [formData, setFormData] = useState({
    variable_name: '',
    label: '',
    description: '',
    value: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if ((isEditing || isView) && variable) {
      setFormData({
        variable_name: variable.variable_name || '',
        label: variable.label || '',
        description: variable.description || '',
        value: variable.value || ''
      });
    }
  }, [isEditing, isView, variable]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateName = (name) => {
    const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!regex.test(name)) return 'Variable name must start with a letter and contain only letters, numbers, and underscores.';
    if (name.includes(' ')) return 'Variable name cannot contain spaces.';
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!isEditing) {
      const nameError = validateName(formData.variable_name);
      if (nameError) {
        setError(nameError);
        return;
      }
    }

    if (!formData.label) {
      setError('Label is required.');
      return;
    }

    if (!formData.value) {
      setError('Value is required.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await axios.put(`/api/admin/dynamic-variables/${variable.uuid}`, formData);
        toast.success('Dynamic variable updated');
      } else {
        await axios.post('/api/admin/dynamic-variables', formData);
        toast.success('Dynamic variable created');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save dynamic variable.');
    } finally {
      setLoading(false);
    }
  };



  const modalTitle = isView ? 'View Dynamic Variable' : isEditing ? 'Edit Dynamic Variable' : 'Add Dynamic Variable';

  return (
    <SModal
      isOpen={isOpen}
      onCancel={onClose}
      onConfirm={!isView ? handleSubmit : undefined}
      cancelText={isView ? 'Close' : 'Cancel'}
      confirmText={loading ? 'Saving...' : 'Save Variable'}
      isProcessing={loading}
      title={modalTitle}
      width="500px"
    >
      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      <div style={{ marginBottom: '16px' }}>
        <STextField
          label="Variable Name"
          text={formData.variable_name}
          onChange={(e) => handleChange('variable_name', e.target.value)}
          required
          disabled={isView}
          placeholder="e.g. companyName"
        />
        {!isEditing && !isView && (
          <small style={{ color: '#888', display: 'block', marginTop: '4px' }}>
            Preview: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              $${formData.variable_name || 'variableName'}$$
            </span>
          </small>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <STextField
          label="Label"
          text={formData.label}
          onChange={(e) => handleChange('label', e.target.value)}
          required
          disabled={isView}
          placeholder="e.g. Company Name"
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <STextField
          label="Description"
          text={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          disabled={isView}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <STextField
          label="Value"
          text={formData.value}
          onChange={(e) => handleChange('value', e.target.value)}
          placeholder="e.g. John Doe"
          required
          disabled={isView}
        />
      </div>

    </SModal>
  );
};

export default DynamicVariableModal;
