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
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async (currentPage = pageNumber, currentLimit = pageSize, currentSearch = searchQuery) => {
    try {
      setLoading(true);
      const response = await getEmailLogs(currentPage, currentLimit, currentSearch);
      if (response?.data && response?.pagination) {
        setLogs(response.data);
        setTotalRecords(response.pagination.totalRecords);
      } else {
        setLogs([]);
        setTotalRecords(0);
      }
    } catch (err) {
      toast.error(t('admin.email.fetch_logs_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(pageNumber, pageSize, searchQuery);
  }, []);

  const columns = [
    {
      key: 'recipient',
      label: t('admin.email.column_recipient'),
      sortable: true,
      render: (item) => (
        <strong style={{ color: 'var(--text-h)' }}>
          {item.recipient}
        </strong>
      )
    },
    {
      key: 'templateKey',
      label: t('admin.email.column_template'),
      sortable: true,
      render: (item) => item.templateKey || '-'
    },
    {
      key: 'subject',
      label: t('admin.email.column_subject'),
      render: (item) => item.subject || '-'
    },
    {
      key: 'status',
      label: t('admin.email.column_status'),
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
      key: 'errorMessage',
      label: t('admin.email.column_error'),
      render: (item) => item.errorMessage ? (
        <span style={{
          color: '#ef4444',
          fontSize: '0.78rem',
          fontFamily: 'monospace',
          maxWidth: '300px',
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }} title={item.errorMessage}>
          {item.errorMessage}
        </span>
      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
    },
    {
      key: 'createdAt',
      label: t('admin.email.column_sent_at'),
      sortable: true,
      render: (item) => item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'
    }
  ];


  return (
    <div style={{ padding: '1rem' }}>
      <SDataTable
        title={
          <div style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={22} />
            {t('admin.email.logs_title')}
          </div>
        }
        headerActions={
          <SButton 
            type="button" 
            onClick={() => fetchLogs(pageNumber, pageSize, searchQuery)} 
            icon="refresh" 
            text={t('common.refresh')}
            color="secondary"
          />
        }
        columns={columns}
        data={logs}
        loading={loading}
        emptyText={t('admin.email.no_logs')}
        serverSideSearch={true}
        onSearch={(term) => {
          setSearchQuery(term);
          setPageNumber(1);
          fetchLogs(1, pageSize, term);
        }}
        pagination={{
          page: pageNumber,
          limit: pageSize,
          total: totalRecords,
          onPageChange: (newPage) => {
            setPageNumber(newPage);
            fetchLogs(newPage, pageSize, searchQuery);
          },
          onLimitChange: (newLimit) => {
            setPageSize(newLimit);
            setPageNumber(1);
            fetchLogs(1, newLimit, searchQuery);
          }
        }}
      />
    </div>
  );
};

export default EmailLogsFeature;
