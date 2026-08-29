import React, { useState, useEffect } from 'react';
import STextField from './STextField';
import './SDataTable.css';

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
  const { page: propPage, limit: propLimit, total: propTotal, onPageChange, onLimitChange } = pagination;
  const isExternalPagination = Boolean(onPageChange && onLimitChange);

  const [internalSearch, setInternalSearch] = useState('');
  const [filteredData, setFilteredData] = useState(data);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false);
  const [internalPage, setInternalPage] = useState(1);
  const [internalLimit, setInternalLimit] = useState(10);
  
  const activePage = isExternalPagination ? (propPage || 1) : internalPage;
  const activeLimit = isExternalPagination ? (propLimit || 10) : internalLimit;
  const activeTotal = isExternalPagination ? (propTotal || 0) : filteredData.length;

  const handlePageChange = (newPage) => {
    if (isExternalPagination) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handleLimitChange = (newLimit) => {
    if (isExternalPagination) {
      onLimitChange(newLimit);
    } else {
      setInternalLimit(newLimit);
      setInternalPage(1); // Reset to page 1 on limit change
    }
  };

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

  const displayedData = React.useMemo(() => {
    if (isExternalPagination) return sortedData;
    const startIndex = (activePage - 1) * activeLimit;
    return sortedData.slice(startIndex, startIndex + activeLimit);
  }, [sortedData, isExternalPagination, activePage, activeLimit]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="s-data-table page-container" style={{ position: 'relative' }}>
      
      {topTabs && (
        <div style={{ padding: '1rem 1rem 0 1rem' }}>
          {topTabs}
        </div>
      )}

      <div className="sdt-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', gap: '1rem' }}>
        <div>
          {title && <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>{title}</h2>}
        </div>
        <div className="sdt-controls-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="sdt-search-wrapper" style={{ width: '300px' }}>
            <STextField
              placeholder={searchPlaceholder}
              text={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              marginBottom="0"
            />
          </div>
          {headerActions}
        </div>
      </div>
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        {loading && (
          <div className="sdt-progress-container">
            <div className="sdt-progress-bar"></div>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid var(--border, #e5e5e5)', borderBottom: '1px solid var(--border, #e5e5e5)', minWidth: '480px' }}>
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
            {displayedData.map((row, rowIndex) => (
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
        
        {/* Pagination Footer */}
        <div className="sdt-pagination-container" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderTop: '1px solid var(--border, #e5e5e5)',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.875rem' }}>
            {activeTotal} Records
            </div>
            
          <div className="sdt-pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="sdt-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    {activeLimit} 
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
                            handleLimitChange(val);
                            setIsLimitDropdownOpen(false);
                          }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            backgroundColor: val === activeLimit ? '#f8fafc' : 'transparent',
                            color: 'var(--text, #0f172a)',
                            transition: 'background-color 0.1s'
                          }}
                          onMouseOver={(e) => { if (val !== activeLimit) e.target.style.backgroundColor = '#f1f5f9'; }}
                          onMouseOut={(e) => { if (val !== activeLimit) e.target.style.backgroundColor = 'transparent'; }}
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
                  onClick={() => handlePageChange(activePage - 1)}
                  disabled={activePage <= 1}
                  style={{
                    padding: '0.25rem 0.75rem',
                    border: '1px solid var(--border, #e5e5e5)',
                    borderRadius: '4px',
                    background: activePage <= 1 ? '#f8fafc' : 'white',
                    color: activePage <= 1 ? '#94a3b8' : 'var(--text, #0f172a)',
                    cursor: activePage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span className="sdt-hide-mobile">Prev</span>
                  <span className="sdt-show-mobile">&lt;</span>
                </button>
                <span style={{ fontSize: '0.875rem', color: 'var(--text, #0f172a)' }}>
                  <span className="sdt-hide-mobile">Page </span>
                  {activePage}
                  <span className="sdt-hide-mobile"> of {Math.max(1, Math.ceil(activeTotal / activeLimit))}</span>
                </span>
                <button
                  onClick={() => handlePageChange(activePage + 1)}
                  disabled={activePage >= Math.ceil(activeTotal / activeLimit)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    border: '1px solid var(--border, #e5e5e5)',
                    borderRadius: '4px',
                    background: activePage >= Math.ceil(activeTotal / activeLimit) ? '#f8fafc' : 'white',
                    color: activePage >= Math.ceil(activeTotal / activeLimit) ? '#94a3b8' : 'var(--text, #0f172a)',
                    cursor: activePage >= Math.ceil(activeTotal / activeLimit) ? 'not-allowed' : 'pointer'
                }}
                >
                  <span className="sdt-hide-mobile">Next</span>
                  <span className="sdt-show-mobile">&gt;</span>
                </button>
              </div>
              </div>
            </div>
    </div>
  );
};

export default SDataTable;
