import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Save } from 'lucide-react';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import { createCampaign } from '../emailService';

const CreateCampaignFeature = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    template_key: '',
    html_body: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.subject) {
      toast.error('Name and Subject are required');
      return;
    }
    if (!formData.template_key && !formData.html_body) {
      toast.error('Either Template Key or HTML Body is required');
      return;
    }

    setLoading(true);
    try {
      await createCampaign({
        name: formData.name,
        subject: formData.subject,
        template_key: formData.template_key || null,
        html_body: formData.html_body || null
      });
      toast.success(t('admin.email.create_success', 'Campaign created successfully!'));
      router.push('/email/campaigns');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
        <SButton 
          type="button" 
          onClick={() => router.push('/email/campaigns')} 
          color="secondary"
          className="btn-icon"
          icon="back"
        >
        </SButton>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Mail size={24} />
          {t('admin.email.create_title', 'Create New Campaign')}
        </h1>
      </div>

      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
          
          <STextField
            label={t('admin.email.name_label', 'Campaign Name')}
            text={formData.name}
            onChange={(e) => handleChange({ target: { name: 'name', value: e.target.value } })}
            placeholder={t('admin.email.name_placeholder', 'e.g., Summer Sale')}
            required
          />

          <STextField
            label={t('admin.email.subject_label', 'Subject Line')}
            text={formData.subject}
            onChange={(e) => handleChange({ target: { name: 'subject', value: e.target.value } })}
            placeholder={t('admin.email.subject_placeholder', 'Don\'t miss our summer sale!')}
            required
          />

          <STextField
            label={t('admin.email.template_key_label', 'Template Key (Optional)')}
            text={formData.template_key}
            onChange={(e) => handleChange({ target: { name: 'template_key', value: e.target.value } })}
            placeholder="e.g., SUMMER_SALE_TEMPLATE"
          />

          <div className="form-group">
            <label className="form-label">{t('admin.email.html_body_label', 'HTML Body (Optional if Template used)')}</label>
            <textarea
              name="html_body"
              className="form-input"
              value={formData.html_body}
              onChange={handleChange}
              placeholder="<h1>Hello World!</h1>"
              rows={12}
              style={{ fontFamily: 'monospace', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '1rem', marginTop: '1rem' }}>
            <SButton 
              type="submit" 
              color="primary"
              loading={loading}
              icon="save"
              text={t('common.save', 'Save')}
            />
            <SButton 
              type="button" 
              onClick={() => router.push('/email/campaigns')} 
              color="secondary"
              text={t('common.cancel', 'Cancel')}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCampaignFeature;
