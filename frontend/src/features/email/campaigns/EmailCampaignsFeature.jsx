import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Plus, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import SDataTable from '@/components/common/SDataTable';
import SButton from '@/components/common/SButton';
import SModal from '@/components/common/SModal';
import { getCampaigns, sendCampaign } from '../emailService';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const EmailCampaignsFeature = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendCampaignUuid, setSendCampaignUuid] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await getCampaigns();
      setCampaigns(data || []);
    } catch (err) {
      toast.error(t('admin.email.fetch_error', 'Failed to fetch campaigns'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateNew = () => router.push('/email/campaigns/create');

  const confirmSend = async () => {
    if (!sendCampaignUuid) return;
    setIsProcessing(true);
    try {
      await sendCampaign(sendCampaignUuid);
      toast.success(t('admin.email.send_success', 'Campaign dispatched successfully!'));
      setSendCampaignUuid(null);
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || t('admin.email.send_error', 'Failed to dispatch campaign'));
      setSendCampaignUuid(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: t('admin.email.column_name', 'Campaign Name'),
      sortable: true,
      render: (item) => <strong style={{ color: 'var(--accent)' }}>{item.name}</strong>
    },
    {
      key: 'subject',
      label: t('admin.email.column_subject', 'Subject')
    },
    {
      key: 'status',
      label: t('admin.email.column_status', 'Status'),
      render: (item) => {
        let bg = 'rgba(239, 68, 68, 0.1)';
        let fg = '#ef4444';
        let Icon = XCircle;

        if (item.status === 'COMPLETED') {
          bg = 'rgba(34, 197, 94, 0.1)';
          fg = '#22c55e';
          Icon = CheckCircle;
        } else if (item.status === 'DRAFT') {
          bg = 'rgba(100, 116, 139, 0.1)';
          fg = '#64748b';
          Icon = Mail;
        } else if (item.status === 'PROCESSING') {
          bg = 'rgba(59, 130, 246, 0.1)';
          fg = '#3b82f6';
          Icon = Clock;
        }

        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            backgroundColor: bg,
            color: fg
          }}>
            <Icon size={14} />
            {item.status}
          </span>
        );
      }
    },
    {
      key: 'scheduled_at',
      label: t('admin.email.column_scheduled_at', 'Scheduled At'),
      sortable: true,
      render: (item) => item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : '-'
    },
    {
      key: 'created_at',
      label: t('admin.email.column_created_at', 'Created At'),
      sortable: true,
      render: (item) => item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'
    }
  ];

  return (
    <div style={{ padding: '1rem' }}>
      <SDataTable
        title={
          <div style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={22} />
            {t('admin.email.campaigns_title', 'Marketing Campaigns')}
          </div>
        }
        headerActions={
          <SButton 
            type="button" 
            onClick={handleCreateNew} 
            icon="add" 
            text={t('admin.email.create_campaign', 'Create Campaign')}
            color="primary"
          />
        }
        columns={columns}
        data={campaigns}
        loading={loading}
        actions={['send']}
        onAction={(action, row) => {
          if (action === 'send' && row.status === 'DRAFT') {
            setSendCampaignUuid(row.uuid);
          } else if (action === 'send') {
            toast.error('Only DRAFT campaigns can be sent.');
          }
        }}
        emptyText={t('admin.email.no_campaigns', 'No campaigns found.')}
      />
      
      <SModal
        isOpen={!!sendCampaignUuid}
        title={t('admin.email.confirm_send_title', 'Send Campaign')}
        onConfirm={confirmSend}
        onCancel={() => setSendCampaignUuid(null)}
        confirmText={t('admin.email.action_send', 'Send')}
        confirmColor="primary"
        isProcessing={isProcessing}
        text={t('admin.email.confirm_send_desc', 'Are you sure you want to dispatch this campaign to all subscribed users? This action cannot be undone.')}
      />
    </div>
  );
};

export default EmailCampaignsFeature;
