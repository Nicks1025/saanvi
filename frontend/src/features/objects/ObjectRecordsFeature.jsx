import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import SDataTable from '@/components/common/SDataTable';
import SDeleteConfirmation from '@/components/common/SDeleteConfirmation';
import SButton from '@/components/common/SButton';
import * as objectsService from './objectsService';

const ObjectRecordsFeature = ({ onTabChange }) => {
  const { t } = useTranslation();
  const { uuid } = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const navigate = useRouter();

  const [object, setObject] = useState(null);
  const [records, setRecords] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });

  const tabsConfig = [
    { id: 'records', label: t('admin.objects.records') },
    { id: 'fields', label: t('admin.objects.fields') },
    { id: 'templates', label: t('admin.objects.templates') }
  ];

  const handleTabChange = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('tab', tabId);
      navigate.push(`${pathname}?${params.toString()}`);
    }
  };

  useEffect(() => {
    if (uuid) {
      fetchObjectData();
      fetchRecords();
    }
  }, [uuid]);

  const fetchObjectData = async () => {
    try {
      const res = await objectsService.getObject(uuid);
      setObject(res);
    } catch (err) {
      toast.error(t('admin.objects.loadObjectFailed'));
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await objectsService.getRecords(uuid);
      setRecords(data.records || []);
      setFields(data.fields || []);
    } catch (err) {
      toast.error(t('admin.objects.loadRecordsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async () => {
    try {
      await objectsService.deleteRecord(uuid, modalState.data.uuid);
      toast.success(t('admin.objects.recordDeleted'));
      setModalState({ isOpen: false, type: null, data: null });
      fetchRecords();
    } catch (err) {
      toast.error(t('admin.objects.loadRecordsFailed'));
    }
  };

  const columns = fields.map((f) => {
    const fieldKey = f.fieldName;
    return {
      key: fieldKey,
      label: f.label,
      sortable: true,
      render: (row) => {
        const val = row[fieldKey];
        if (val === null || val === undefined || val === '') return '-';

        // Resolve options (e.g. CHECKBOX, SELECT, RADIO) to display their human-readable value
        let opts = [];
        try {
          let raw = f.options || f.optionsConfig || f.options_config;
          if (typeof raw === 'string') raw = JSON.parse(raw);
          if (Array.isArray(raw)) {
            opts = raw;
          } else if (raw && typeof raw === 'object') {
            opts = raw.options || raw.items || [];
          }
        } catch (e) {}

        if (opts.length > 0) {
          const getLabel = (k) => {
            const found = opts.find((o) => (o.key ?? o.value) === k || o.value === k || o === k);
            return found ? (found.value ?? found.label ?? found.key ?? found) : k;
          };

          if (Array.isArray(val)) {
            return val.map(getLabel).join(', ');
          }
          if (typeof val === 'string') {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                return parsed.map(getLabel).join(', ');
              }
            } catch (e) {}
          }
          return getLabel(val);
        }

        if (typeof val === 'boolean') {
          return val ? 'Yes' : 'No';
        }

        if (typeof val === 'object') {
          return JSON.stringify(val);
        }

        return String(val);
      }
    };
  });

  columns.push({
    key: 'createdAt',
    label: t('admin.objects.createdAt'),
    render: (row) => new Date(row.createdAt || row.created_at).toLocaleString()
  });

  return (
    <div className="admin-users-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', padding: '1rem 1.5rem 0' }}>
        <SButton
          onClick={() => navigate.push('/objects')}
          color="ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}
        >
          &larr; {t('admin.objects.backToObjects')}
        </SButton>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <SDataTable
          title={object?.name}
          data={records}
          columns={columns}
          loading={loading}
          tabs={tabsConfig}
          activeTab="records"
          onTabChange={handleTabChange}
          actions={['view', 'edit', 'delete']}
          onAction={(action, row) => {
            if (action === 'view') {
              navigate.push(`/objects/${uuid}/records/${row.uuid}`);
            }
            if (action === 'edit') {
              navigate.push(`/objects/${uuid}/records/${row.uuid}/edit`);
            }
            if (action === 'delete') {
              setModalState({ isOpen: true, type: 'deleteRecord', data: row });
            }
          }}
          headerActions={
            <SButton
              text={t('admin.objects.addRecord')}
              onClick={() => {
                if (fields.length === 0) {
                  toast.error(t('admin.objects.noFields'));
                } else {
                  navigate.push(`/objects/${uuid}/records/add`);
                }
              }}
            />
          }
        />
      </div>

      <SDeleteConfirmation
        isOpen={modalState.type === 'deleteRecord'}
        title={t('admin.objects.deleteRecordTitle')}
        onConfirm={handleDeleteRecord}
        onCancel={() => setModalState({ isOpen: false, type: null, data: null })}
      />
    </div>
  );
};

export default ObjectRecordsFeature;
