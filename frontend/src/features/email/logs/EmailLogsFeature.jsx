import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import SDataTable from '@/components/common/SDataTable';
import SButton from '@/components/common/SButton';
import { getEmailLogs } from '../emailService';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const EmailLogsFeature = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getEmailLogs();
      setLogs(Array.isArray(data) ? data : (data?.data || []));
    } catch (err) {
      toast.error(t('admin.email.fetch_logs_error', 'Failed to fetch email logs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = [
    {
      key: 'recipient',
      label: t('admin.email.column_recipient', 'Recipient'),
      sortable: true,
      render: (item) => (
        <strong style={{ color: 'var(--text-h)' }}>
          {item.recipient || item.to_email || item.to || '-'}
        </strong>
      )
    },
    {
      key: 'template_key',
      label: t('admin.email.column_template', 'Template'),
      sortable: true,
      render: (item) => item.template_key || item.template || '-'
    },
    {
      key: 'subject',
      label: t('admin.email.column_subject', 'Subject'),
      render: (item) => item.subject || '-'
    },
    {
      key: 'status',
      label: t('admin.email.column_status', 'Status'),
      sortable: true,
      render: (item) => {
        const status = (item.status || 'SENT').toUpperCase();
        let bg = 'rgba(100, 116, 139, 0.1)';
        let fg = '#64748b';
        let Icon = FileText;

        if (['SENT', 'DELIVERED', 'SUCCESS', 'COMPLETED'].includes(status)) {
          bg = 'rgba(34, 197, 94, 0.1)';
          fg = '#22c55e';
          Icon = CheckCircle;
        } else if (['FAILED', 'ERROR', 'BOUNCED'].includes(status)) {
          bg = 'rgba(239, 68, 68, 0.1)';
          fg = '#ef4444';
          Icon = XCircle;
        } else if (['PENDING', 'QUEUED', 'PROCESSING'].includes(status)) {
          bg = 'rgba(245, 158, 11, 0.1)';
          fg = '#f59e0b';
          Icon = Clock;
        }

        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            backgroundColor: bg,
            color: fg
          }}>
            <Icon size={14} />
            {status}
          </span>
        );
      }
    },
    {
      key: 'error_details',
      label: t('admin.email.column_error', 'Error Details'),
      render: (item) => item.error_details ? (
        <span style={{
          color: '#ef4444',
          fontSize: '0.78rem',
          fontFamily: 'monospace',
          maxWidth: '300px',
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }} title={item.error_details}>
          {item.error_details}
        </span>
      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
    },
    {
      key: 'created_at',
      label: t('admin.email.column_sent_at', 'Sent At'),
      sortable: true,
      render: (item) => item.created_at || item.sent_at ? new Date(item.created_at || item.sent_at).toLocaleString() : '-'
    }
  ];


  return (
    <div style={{ padding: '1rem' }}>
      <SDataTable
        title={
          <div style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={22} />
            {t('admin.email.logs_title', 'Email Logs')}
          </div>
        }
        headerActions={
          <SButton 
            type="button" 
            onClick={fetchLogs} 
            icon="refresh" 
            text={t('common.refresh', 'Refresh')}
            color="secondary"
          />
        }
        columns={columns}
        data={logs}
        loading={loading}
        emptyText={t('admin.email.no_logs', 'No email logs found.')}
      />
    </div>
  );
};

export default EmailLogsFeature;
