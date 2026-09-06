import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import SDropdown from '@/components/common/SDropdown';
import { createCampaign, updateCampaign, getCampaign } from '../emailService';

const CampaignFormFeature = ({ editUuid }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editUuid);
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    type: 'TEMPLATE',
    template_key: '',
    html_body: '',
    audience_type: 'ALL',
    target_emails: ''
  });

  useEffect(() => {
    if (editUuid) {
      const fetchCampaign = async () => {
        try {
          const campaign = await getCampaign(editUuid);
          let targetEmailsStr = '';
          try {
            const arr = JSON.parse(campaign.target_emails);
            targetEmailsStr = Array.isArray(arr) ? arr.join(', ') : '';
          } catch (e) {
            targetEmailsStr = campaign.target_emails || '';
          }

          setFormData({
            name: campaign.name || '',
            subject: campaign.subject || '',
            type: campaign.html_body && !campaign.template_key ? 'CUSTOM_HTML' : 'TEMPLATE',
            template_key: campaign.template_key || '',
            html_body: campaign.html_body || '',
            audience_type: campaign.audience_type || 'ALL',
            target_emails: targetEmailsStr
          });
        } catch (err) {
          toast.error('Failed to load campaign for editing.');
          router.push('/email/campaigns');
        } finally {
          setInitialLoading(false);
        }
      };
      fetchCampaign();
    }
  }, [editUuid, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDropdownChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.subject) {
      toast.error('Name and Subject are required');
      return;
    }
    if (formData.type === 'TEMPLATE' && !formData.template_key) {
      toast.error('Template Key is required for Email Template campaigns.');
      return;
    }
    if (formData.type === 'CUSTOM_HTML' && !formData.html_body) {
      toast.error('HTML Body is required for Custom HTML campaigns.');
      return;
    }

    setLoading(true);
    try {
      let parsedEmails = [];
      if (formData.audience_type === 'SPECIFIC') {
        parsedEmails = formData.target_emails.split(',').map(e => e.trim()).filter(e => e);
        if (parsedEmails.length === 0) {
          toast.error('Please enter at least one target email address.');
          setLoading(false);
          return;
        }
      }

      const payload = {
        name: formData.name,
        subject: formData.subject,
        template_key: formData.type === 'TEMPLATE' ? formData.template_key : null,
        html_body: formData.type === 'CUSTOM_HTML' ? formData.html_body : (formData.html_body || null),
        audience_type: formData.audience_type,
        target_emails: parsedEmails
      };

      if (editUuid) {
        await updateCampaign(editUuid, payload);
        toast.success('Campaign updated successfully!');
      } else {
        await createCampaign(payload);
        toast.success(t('admin.email.create_success', 'Campaign created successfully!'));
      }
      router.push('/email/campaigns');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div style={{ padding: '2rem' }}>Loading campaign...</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
        <SButton 
          type="button" 
          onClick={() => router.push('/email/campaigns')} 
          color="secondary"
          className="btn-icon"
          icon="back"
        />
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Mail size={24} />
          {editUuid ? 'Edit Campaign' : t('admin.email.create_title', 'Create New Campaign')}
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

          <SDropdown
            label="Campaign Type"
            value={formData.type}
            options={[
              { label: 'Email Template', value: 'TEMPLATE' },
              { label: 'Custom HTML', value: 'CUSTOM_HTML' }
            ]}
            onChange={(val) => handleDropdownChange('type', val)}
            required
          />

          {formData.type === 'TEMPLATE' && (
            <STextField
              label="Template Key"
              text={formData.template_key}
              onChange={(e) => handleChange({ target: { name: 'template_key', value: e.target.value } })}
              placeholder="e.g., SUMMER_SALE_TEMPLATE"
              required
            />
          )}

          {formData.type === 'CUSTOM_HTML' && (
            <div className="form-group">
              <label className="form-label">HTML Body <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                name="html_body"
                className="form-input"
                value={formData.html_body}
                onChange={handleChange}
                placeholder="<h1>Hello World!</h1>"
                rows={12}
                style={{ fontFamily: 'monospace', width: '100%' }}
                required
              />
            </div>
          )}

          <SDropdown
            label="Audience Type"
            value={formData.audience_type}
            options={[
              { label: 'All Opted-In Active Users', value: 'ALL' },
              { label: 'Specific Users Only', value: 'SPECIFIC' }
            ]}
            onChange={(val) => handleDropdownChange('audience_type', val)}
            required
          />

          {formData.audience_type === 'SPECIFIC' && (
            <div className="form-group">
              <label className="form-label">Target Email Addresses <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                name="target_emails"
                className="form-input"
                value={formData.target_emails}
                onChange={handleChange}
                placeholder="user1@example.com, user2@example.com"
                rows={4}
                style={{ fontFamily: 'monospace', width: '100%' }}
                required
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Enter a comma-separated list of exact email addresses.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '1rem', marginTop: '1rem' }}>
            <SButton 
              type="submit" 
              color="primary"
              loading={loading}
              icon="save"
              text={editUuid ? 'Save Changes' : t('common.save', 'Save')}
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

export default CampaignFormFeature;
