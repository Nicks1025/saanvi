import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Plus, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import SDataTable from '@/components/common/SDataTable';
import SButton from '@/components/common/SButton';
import SModal from '@/components/common/SModal';
import { getCampaigns, sendCampaign, deleteCampaign } from '../emailService';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/AuthContext';

const EmailCampaignsFeature = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendCampaignUuid, setSendCampaignUuid] = useState(null);
  const [deleteCampaignUuid, setDeleteCampaignUuid] = useState(null);
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

  const confirmDelete = async () => {
    if (!deleteCampaignUuid) return;
    setIsProcessing(true);
    try {
      await deleteCampaign(deleteCampaignUuid);
      toast.success('Campaign deleted successfully!');
      setDeleteCampaignUuid(null);
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete campaign');
      setDeleteCampaignUuid(null);
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
          hasPermission('admin.email.campaign.create') && (
            <SButton 
              type="button" 
              onClick={handleCreateNew} 
              icon="add" 
              text={t('admin.email.create_campaign', 'Create Campaign')}
              color="primary"
            />
          )
        }
        columns={columns}
        data={campaigns}
        loading={loading}
        actions={['edit', 'send', 'delete']}
        canExecuteAction={(action) => {
          if (action === 'edit') return hasPermission('admin.email.campaign.update');
          if (action === 'delete') return hasPermission('admin.email.campaign.delete');
          if (action === 'send') return hasPermission('admin.email.campaign.send');
          return true;
        }}
        onAction={(action, row) => {
          if (action === 'send') {
            setSendCampaignUuid(row.uuid);
          } else if (action === 'edit') {
            router.push(`/email/campaigns/${row.uuid}/edit`);
          } else if (action === 'delete') {
            setDeleteCampaignUuid(row.uuid);
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

      <SModal
        isOpen={!!deleteCampaignUuid}
        title="Delete Campaign"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteCampaignUuid(null)}
        confirmText="Delete"
        confirmColor="danger"
        isProcessing={isProcessing}
        text="Are you sure you want to delete this campaign? This action cannot be undone."
      />
    </div>
  );
};

export default EmailCampaignsFeature;
