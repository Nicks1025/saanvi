import React, { useState, useEffect } from 'react';
import STextField from './STextField';

const SDataTable = ({
  columns = [],
  data = [],
  pagination = {}, // e.g., { page, limit, total, onPageChange, onLimitChange }
  serverSideSearch = false,
  onSearch = () => { },
  searchPlaceholder = 'Search...',
  loading = false,
  title = '',
  headerActions = null,
  topTabs = null
}) => {
  const { page = 1, limit = 10, total = 0, onPageChange, onLimitChange } = pagination;
  const [internalSearch, setInternalSearch] = useState('');
  const [filteredData, setFilteredData] = useState(data);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false);

  // Sync internal data when props change (for server-side or initial load)
  useEffect(() => {
    const safeData = Array.isArray(data) ? data : [];
    if (serverSideSearch) {
      setFilteredData(safeData);
    } else {
      if (!internalSearch) {
        setFilteredData(safeData);
      } else {
        const lowerSearch = internalSearch.toLowerCase();
        const filtered = safeData.filter(row => {
          return Object.values(row || {}).some(val =>
            String(val).toLowerCase().includes(lowerSearch)
          );
        });
        setFilteredData(filtered);
      }
    }
  }, [data, internalSearch, serverSideSearch]);

  const [previousSearch, setPreviousSearch] = useState(internalSearch);

  // Debounce server-side search
  useEffect(() => {
    if (serverSideSearch && internalSearch !== previousSearch) {
      const handler = setTimeout(() => {
        setPreviousSearch(internalSearch);
        onSearch(internalSearch);
      }, 500); // 500ms debounce
      return () => clearTimeout(handler);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalSearch, serverSideSearch, previousSearch]);

  const sortedData = React.useMemo(() => {
    if (!Array.isArray(filteredData)) return [];
    let sortableItems = [...filteredData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="s-data-table page-container" style={{ position: 'relative' }}>
      <style>{`
        @keyframes sdt-indeterminate {
          0% { left: -30%; width: 30%; }
          50% { left: 30%; width: 70%; }
          100% { left: 100%; width: 30%; }
        }
        .sdt-progress-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 3px;
          background-color: var(--primary, #007bff);
          animation: sdt-indeterminate 1.5s infinite linear;
        }
        .sdt-progress-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background-color: rgba(0, 0, 0, 0.05);
          overflow: hidden;
          z-index: 10;
        }
      `}</style>
      
      {topTabs && (
        <div style={{ padding: '1rem 1rem 0 1rem' }}>
          {topTabs}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
        <div>
          {title && <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>{title}</h2>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {headerActions}
          <div style={{ width: '300px' }}>
            <STextField
              placeholder={searchPlaceholder}
              text={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              marginBottom="0"
            />
          </div>
        </div>
      </div>
      <div style={{ position: 'relative', width: '100%' }}>
        {loading && (
          <div className="sdt-progress-container">
            <div className="sdt-progress-bar"></div>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid var(--border, #e5e5e5)', borderBottom: '1px solid var(--border, #e5e5e5)' }}>
        <thead>
          <tr>
              {columns.map((col, index) => {
                const isObject = typeof col === 'object';
                const label = isObject ? col.label : col;
                const isSortable = isObject && col.sortable;
                const colKey = isObject ? col.key : col;

                return (
                  <th
                    key={index}
                    onClick={isSortable ? () => handleSort(colKey) : undefined}
                    style={{
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: '#f5f5f5',
                      cursor: isSortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      fontWeight: 600
                    }}
                  >
                    {label}
                    {isSortable && sortConfig.key === colKey && (
                      <span style={{ marginLeft: '4px' }}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                );
              })}
          </tr>
        </thead>
        <tbody>
            {sortedData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => {
                const isObject = typeof col === 'object';
                const cellKey = isObject ? col.key : col;
                const cellContent = isObject && col.render ? col.render(row) : row[cellKey];

                return (
                  <td key={colIndex} style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)' }}>
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        </table>
        
        {/* Pagination Footer */}
        {onPageChange && onLimitChange && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderTop: '1px solid var(--border, #e5e5e5)',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.875rem' }}>
              Total Records: {total}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.875rem' }}>Rows per page:</span>
                <div style={{ position: 'relative' }}>
                  <div 
                    onClick={() => setIsLimitDropdownOpen(!isLimitDropdownOpen)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border, #e5e5e5)',
                      backgroundColor: 'white',
                      color: 'var(--text, #0f172a)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      minWidth: '60px',
                      justifyContent: 'space-between'
                    }}
                  >
                    {limit} 
                    <span style={{ fontSize: '0.6rem', transform: isLimitDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▲</span>
                  </div>
                  {isLimitDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: '0.25rem',
                      backgroundColor: 'white',
                      border: '1px solid var(--border, #e5e5e5)',
                      borderRadius: '4px',
                      boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.1)',
                      zIndex: 50,
                      minWidth: '100%',
                      overflow: 'hidden'
                    }}>
                      {[10, 20, 50, 100].map(val => (
                        <div 
                          key={val}
                          onClick={() => {
                            onLimitChange(val);
                            setIsLimitDropdownOpen(false);
                          }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            backgroundColor: val === limit ? '#f8fafc' : 'transparent',
                            color: 'var(--text, #0f172a)',
                            transition: 'background-color 0.1s'
                          }}
                          onMouseOver={(e) => { if (val !== limit) e.target.style.backgroundColor = '#f1f5f9'; }}
                          onMouseOut={(e) => { if (val !== limit) e.target.style.backgroundColor = 'transparent'; }}
                        >
                          {val}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                  style={{
                    padding: '0.25rem 0.75rem',
                    border: '1px solid var(--border, #e5e5e5)',
                    borderRadius: '4px',
                    background: page <= 1 ? '#f8fafc' : 'white',
                    color: page <= 1 ? '#94a3b8' : 'var(--text, #0f172a)',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Prev
                </button>
                <span style={{ fontSize: '0.875rem', color: 'var(--text, #0f172a)' }}>
                  Page {page} of {Math.max(1, Math.ceil(total / limit))}
                </span>
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    border: '1px solid var(--border, #e5e5e5)',
                    borderRadius: '4px',
                    background: page >= Math.ceil(total / limit) ? '#f8fafc' : 'white',
                    color: page >= Math.ceil(total / limit) ? '#94a3b8' : 'var(--text, #0f172a)',
                    cursor: page >= Math.ceil(total / limit) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SDataTable;
