import React, { useState, useEffect } from 'react';
import SDataTable from '../../../components/common/SDataTable';
import { getAuditLogs } from './auditLogsService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

const AuditLogsFeature = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchLogs = async (page) => {
    try {
      setLoading(true);
      const res = await getAuditLogs({ page, limit: pageSize });
      if (res.success) {
        setLogs(res.data.data);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleLimitChange = (newLimit) => {
    setPageSize(newLimit);
    setCurrentPage(1);
  };

  const columns = [
    {
      key: 'created_at',
      label: 'Date',
      render: (row) => {
        if (!row.created_at) return '-';
        const d = new Date(row.created_at);
        return isNaN(d.getTime()) ? '-' : format(d, 'MMM dd yyyy, HH:mm:ss');
      }
    },
    {
      key: 'user_name',
      label: 'User Name',
      render: (row) => row.user_name || 'System/Guest'
    },
    {
      key: 'user_email',
      label: 'Email',
      render: (row) => row.user_email || '-'
    },
    {
      key: 'action',
      label: 'Action'
    },
    {
      key: 'endpoint',
      label: 'Endpoint',
      render: (row) => (
        <div style={{ wordBreak: 'break-all', maxWidth: '200px' }}>
          {row.method} {row.endpoint}
        </div>
      )
    },
    {
      key: 'is_error',
      label: 'Status',
      render: (row) => (
        <span style={{ color: row.is_error ? 'red' : 'green', fontWeight: 'bold' }}>
          {row.is_error ? 'Error' : 'Success'}
        </span>
      )
    }
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{t('navigation.audit_logs', 'Audit Logs')}</h1>
      </div>
      
      <div className="admin-page-content">
        <SDataTable
          columns={columns}
          data={logs}
          loading={loading}
          pagination={{
            page: currentPage,
            limit: pageSize,
            total: total,
            onPageChange: handlePageChange,
            onLimitChange: handleLimitChange
          }}
        />
      </div>
    </div>
  );
};

export default AuditLogsFeature;
