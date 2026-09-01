import React, { useState, useEffect } from 'react';
import SDataTable from '../../../components/common/SDataTable';
import { getSystemEvents } from './communicationService';
import { Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const SystemEventsFeature = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getSystemEvents();
      setEvents(data || []);
    } catch (err) {
      toast.error('Failed to fetch system events');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'event_key',
      label: 'Event Key',
      render: (item) => <strong style={{ color: 'var(--accent)' }}>{item.event_key}</strong>
    },
    {
      key: 'name',
      label: 'Name'
    },
    {
      key: 'description',
      label: 'Description'
    },
    {
      key: 'payload_schema',
      label: 'Payload Schema',
      render: (item) => (
        <div style={{ 
          background: 'var(--input-bg)', 
          padding: '0.5rem', 
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          {item.payload_schema ? JSON.stringify(item.payload_schema, null, 2) : '{}'}
        </div>
      )
    },
    {
      key: 'active',
      label: 'Status',
      render: (item) => (
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          backgroundColor: item.active ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
          color: item.active ? '#2ecc71' : '#e74c3c'
        }}>
          {item.active ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  return (
    <div className="page-container">
      <SDataTable
        title={
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} color="var(--accent)" /> System Events Catalog
          </h1>
        }
        data={events}
        columns={columns}
        keyExtractor={(item) => item.event_key}
        loading={loading}
        emptyText="No system events found."
      />
    </div>
  );
};

export default SystemEventsFeature;
