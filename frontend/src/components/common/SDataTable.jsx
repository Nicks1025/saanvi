import React, { useState, useEffect } from 'react';
import STextField from './STextField';
import './SDataTable.css';

import { GripVertical, Eye, Pencil, Archive, RefreshCw, Trash2 } from 'lucide-react';

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
  headerLeftActions = null,
  topTabs = null,
  disableContainer = false,
  isDraggable = false,
  onReorder = null,
  hidePagination = false,
  actions = [], // e.g., ['view', 'edit', 'archive', 'restore', 'delete']
  onAction = null, // (actionType, row) => {}
  canExecuteAction = () => true // (actionType, row) => boolean
}) => {
  const { page: propPage, limit: propLimit, total: propTotal, onPageChange, onLimitChange } = pagination;
  const isExternalPagination = Boolean(onPageChange && onLimitChange);

  const [internalSearch, setInternalSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false);
  const [internalPage, setInternalPage] = useState(1);
  const [internalLimit, setInternalLimit] = useState(10);

  const processedColumns = React.useMemo(() => {
    const cols = [...columns];
    if (actions && actions.length > 0) {
      cols.push({
        key: 'sdt_actions',
        label: 'Actions',
        sortable: false,
        render: (row, rowIndex) => (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {actions.includes('view') && canExecuteAction('view', row) && (
              <button
                className="manage-btn"
                onClick={(e) => { e.stopPropagation(); onAction && onAction('view', row); }}
                title="View"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <Eye size={18} />
              </button>
            )}
            {actions.includes('edit') && canExecuteAction('edit', row) && (
              <button
                className="manage-btn"
                onClick={(e) => { e.stopPropagation(); onAction && onAction('edit', row); }}
                title="Edit"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <Pencil size={18} />
              </button>
            )}
            {actions.includes('archive') && canExecuteAction('archive', row) && (
              <button
                className="manage-btn"
                onClick={(e) => { e.stopPropagation(); onAction && onAction('archive', row); }}
                title="Archive"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#f59e0b' }}
              >
                <Archive size={18} />
              </button>
            )}
            {actions.includes('restore') && canExecuteAction('restore', row) && (
              <button
                className="manage-btn"
                onClick={(e) => { e.stopPropagation(); onAction && onAction('restore', row); }}
                title="Restore"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#10b981' }}
              >
                <RefreshCw size={18} />
              </button>
            )}
            {actions.includes('delete') && canExecuteAction('delete', row) && (
              <button
                className="manage-btn"
                onClick={(e) => { e.stopPropagation(); onAction && onAction('delete', row); }}
                title="Delete"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )
      });
    }
    return cols;
  }, [columns, actions, onAction, canExecuteAction]);
  
  const filteredData = React.useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];
    if (serverSideSearch || !internalSearch) {
      return safeData;
    }
    const lowerSearch = internalSearch.toLowerCase();
    return safeData.filter(row => {
      return Object.values(row || {}).some(val =>
        String(val).toLowerCase().includes(lowerSearch)
      );
    });
  }, [data, internalSearch, serverSideSearch]);

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
    if (isExternalPagination || hidePagination) return sortedData;
    const startIndex = (activePage - 1) * activeLimit;
    return sortedData.slice(startIndex, startIndex + activeLimit);
  }, [sortedData, isExternalPagination, activePage, activeLimit, hidePagination]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    if (!isDraggable) return;
    setDraggedIndex(index);
    // Needed for Firefox
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    }
  };

  const handleDragOver = (e, index) => {
    if (!isDraggable) return;
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e, dropIndex) => {
    if (!isDraggable || draggedIndex === null) return;
    e.preventDefault();
    if (draggedIndex !== dropIndex) {
      const newData = [...displayedData];
      const [draggedItem] = newData.splice(draggedIndex, 1);
      newData.splice(dropIndex, 0, draggedItem);
      if (onReorder) {
        onReorder(newData);
      }
    }
    setDraggedIndex(null);
  };

  return (
    <div className={`s-data-table ${disableContainer ? '' : 'page-container'}`} style={{ position: 'relative' }}>
      
      {topTabs && (
        <div style={{ padding: '1rem 1rem 0 1rem' }}>
          {topTabs}
        </div>
      )}

      <div className="sdt-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', gap: '1rem' }}>
        <div>
          {title && <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>{title}</h2>}
        </div>
        <div className="sdt-controls-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
          {headerLeftActions}
          <div className="sdt-search-wrapper" style={{ width: '300px', flexShrink: 1 }}>
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
              {isDraggable && <th style={{ width: '40px', backgroundColor: '#f5f5f5', borderBottom: '1px solid var(--border)' }}></th>}
              {processedColumns.map((col, index) => {
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
                      backgroundColor: 'var(--code-bg)',
                      color: 'var(--text-h)',
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
            <tr 
              key={rowIndex}
              draggable={isDraggable}
              onDragStart={(e) => handleDragStart(e, rowIndex)}
              onDragOver={(e) => handleDragOver(e, rowIndex)}
              onDrop={(e) => handleDrop(e, rowIndex)}
              style={{
                cursor: isDraggable ? 'grab' : 'default',
                opacity: draggedIndex === rowIndex ? 0.5 : 1,
                backgroundColor: 'var(--bg)'
              }}
            >
              {isDraggable && (
                <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <GripVertical size={16} />
                </td>
              )}
              {processedColumns.map((col, colIndex) => {
                const isObject = typeof col === 'object';
                const cellKey = isObject ? col.key : col;
                const cellContent = isObject && col.render ? col.render(row, rowIndex) : row[cellKey];

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
        {!hidePagination && (
        <div className="sdt-pagination-container" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg)'
          }}>
            <div style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
            {activeTotal} Records
            </div>
            
          <div className="sdt-pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="sdt-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text)', fontSize: '0.875rem' }}>Rows per page:</span>
                <div style={{ position: 'relative' }}>
                  <div 
                    onClick={() => setIsLimitDropdownOpen(!isLimitDropdownOpen)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)',
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
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
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
                            backgroundColor: val === activeLimit ? 'var(--code-bg)' : 'transparent',
                            color: 'var(--text)',
                            transition: 'background-color 0.1s'
                          }}
                          onMouseOver={(e) => { if (val !== activeLimit) e.target.style.backgroundColor = 'var(--social-bg)'; }}
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
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    background: activePage <= 1 ? 'var(--code-bg)' : 'var(--bg)',
                    color: activePage <= 1 ? 'var(--text-muted, var(--text))' : 'var(--text-h)',
                    cursor: activePage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span className="sdt-hide-mobile">Prev</span>
                  <span className="sdt-show-mobile">&lt;</span>
                </button>
                <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                  <span className="sdt-hide-mobile">Page </span>
                  {activePage}
                  <span className="sdt-hide-mobile"> of {Math.max(1, Math.ceil(activeTotal / activeLimit))}</span>
                </span>
                <button
                  onClick={() => handlePageChange(activePage + 1)}
                  disabled={activePage >= Math.ceil(activeTotal / activeLimit)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    background: activePage >= Math.ceil(activeTotal / activeLimit) ? 'var(--code-bg)' : 'var(--bg)',
                    color: activePage >= Math.ceil(activeTotal / activeLimit) ? 'var(--text-muted, var(--text))' : 'var(--text-h)',
                    cursor: activePage >= Math.ceil(activeTotal / activeLimit) ? 'not-allowed' : 'pointer'
                }}
                >
                  <span className="sdt-hide-mobile">Next</span>
                  <span className="sdt-show-mobile">&gt;</span>
                </button>
              </div>
              </div>
            </div>
            )}
    </div>
  );
};

export default SDataTable;
