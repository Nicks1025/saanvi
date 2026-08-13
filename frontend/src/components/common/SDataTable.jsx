import React, { useState, useEffect } from 'react';
import STextField from './STextField';

const SDataTable = ({
  columns = [],
  data = [],
  pagination = {},
  serverSideSearch = false,
  onSearch = () => { },
  searchPlaceholder = 'Search...',
  loading = false,
  title = '',
  headerActions = null
}) => {
  const { sortColu, sortOrder, noOfPagesToDisplay } = pagination;
  const [internalSearch, setInternalSearch] = useState('');
  const [filteredData, setFilteredData] = useState(data);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Sync internal data when props change (for server-side or initial load)
  useEffect(() => {
    if (serverSideSearch) {
      setFilteredData(data);
    } else {
      if (!internalSearch) {
        setFilteredData(data);
      } else {
        const lowerSearch = internalSearch.toLowerCase();
        const filtered = data.filter(row => {
          return Object.values(row).some(val =>
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
    <div className="s-data-table" style={{ position: 'relative', margin: '0 -1rem', width: 'calc(100% + 2rem)' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
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
      </div>
    </div>
  );
};

export default SDataTable;
