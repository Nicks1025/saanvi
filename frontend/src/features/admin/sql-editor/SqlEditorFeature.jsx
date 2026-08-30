import React, { useState, useEffect } from 'react';
import { Play, Database, Download } from 'lucide-react';
import SButton from '../../../components/common/SButton';
import SDataTable from '../../../components/common/SDataTable';
import axios from '../../../services/axios.client';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';


const SqlEditorFeature = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [databaseId, setDatabaseId] = useState('primary');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tablesList, setTablesList] = useState([]);
  
  // Fetch tables on component mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await axios.post('/api/admin/sql/execute', {
          databaseId: 'primary',
          query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
        });
        if (response.success && response.data && response.data.rows) {
          setTablesList(response.data.rows.map(r => r.table_name));
        }
      } catch (err) {
        console.error('Failed to fetch tables list:', err);
      }
    };
    fetchTables();
  }, []);
  

  const executeQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }
    
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/admin/sql/execute', {
        databaseId,
        query
      });

      if (response.success) {
        setResult(response.data);
        toast.success(`Query executed successfully`);
      } else {
        const errorMsg = response.message || 'An unknown error occurred';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err.message || 'Execution failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunClick = () => {
    executeQuery();
  };

  const downloadJson = () => {
    if (!result || !result.rows) return;
    const blob = new Blob([JSON.stringify(result.rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.href = url;
    downloadAnchorNode.download = "query_results.json";
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    
    // Add a small delay before revoking the URL to prevent the browser from 
    // cancelling the download stream and creating an empty/corrupted file.
    setTimeout(() => {
      document.body.removeChild(downloadAnchorNode);
      URL.revokeObjectURL(url);
    }, 500);
  };

  // Convert result rows to SDataTable format
  const columns = result && result.fields ? result.fields.map(f => ({
    key: f,
    label: f,
    render: (row) => {
      const val = row[f];
      if (val === null) return <span style={{color: '#9ca3af', fontStyle: 'italic'}}>NULL</span>;
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }
  })) : [];

  return (
    <div className="sql-editor-container page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={24} /> {t('admin.sql.title', 'SQL Editor')}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t('admin.sql.target_database', 'Target Database:')}</label>
          <select 
            value={databaseId} 
            onChange={(e) => setDatabaseId(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          >
            <option value="primary">Primary (Saanvi PostgreSQL)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: '1rem', marginTop: '1rem' }}>
        {/* Left Sidebar for Tables */}
        <div style={{ 
          width: '250px', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          background: 'var(--bg)', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'rgba(0,0,0,0.02)' }}>
            {t('admin.sql.tables', 'Tables')} ({tablesList.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {tablesList.map(table => (
              <div 
                key={table} 
                style={{ 
                  padding: '0.5rem', 
                  fontSize: '0.85rem', 
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => setQuery(`SELECT * FROM ${table} LIMIT 100;`)}
              >
                {table}
              </div>
            ))}
          </div>
        </div>

        {/* Query Editor & Results Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.sql.placeholder', "Enter SQL statements here (e.g., SELECT * FROM users;)\nNote: DROP statements are strictly prohibited.")}
            style={{
              width: '100%',
              height: '200px',
              fontFamily: '"Fira Code", "JetBrains Mono", monospace',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'rgba(0,0,0,0.02)',
              color: 'var(--text)',
              fontSize: '0.95rem',
              resize: 'vertical',
              outline: 'none'
            }}
            spellCheck="false"
          />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <SButton size="s" text={isExecuting ? t('admin.sql.executing', 'Executing...') : t('admin.sql.run_query', 'Run Query')} icon={<Play size={16} />} onClick={handleRunClick} disabled={isExecuting} style={{ background: '#4f46e5', color: 'white' }} />
          </div>


          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
            <span style={{ fontWeight: 500 }}>{t('admin.sql.affected_rows', 'Affected Rows:')} {result.rowCount}</span>
            <span style={{ fontWeight: 500 }}>{t('admin.sql.execution_time', 'Execution Time:')} {result.executionTimeMs}ms</span>
          </div>
              
              {columns.length > 0 && result.rows.length > 0 ? (
                <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <SDataTable 
                    columns={columns} 
                    data={result.rows} 
                    keyExtractor={(row, idx) => row.uuid || row.id || idx}
                    headerActions={
                      <SButton 
                        icon={<Download size={18} />} 
                        onClick={downloadJson} 
                        style={{ background: '#f3f4f6', color: '#4b5563', padding: '0.5rem', minWidth: 'auto', borderRadius: '6px' }} 
                        title={t('admin.sql.download_json', 'Download JSON')}
                      />
                    }
                  />
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {t('admin.sql.no_result_set', 'No result set returned (e.g. successful INSERT/UPDATE/DELETE).')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SqlEditorFeature;
