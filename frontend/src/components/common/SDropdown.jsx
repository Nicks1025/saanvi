import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import './s-dropdown.css';

const SDropdown = ({ 
  label, 
  value, 
  options = [], 
  onChange, 
  width = '100%', 
  required = false,
  searchable = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Find the currently selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Filter options based on search term (case-insensitive)
  const filteredOptions = searchable 
    ? options.filter(opt => 
        String(opt.label).toLowerCase().includes(searchTerm.toLowerCase()) || 
        String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 50);
    }
  }, [isOpen, searchable]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="s-dropdown-container" style={{ width }} ref={dropdownRef}>
      {label && (
        <label className="s-dropdown-label">
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      
      <div className="s-dropdown-wrapper">
        <div 
          className={`s-dropdown-select ${isOpen ? 's-dropdown-select-open' : ''} ${disabled ? 's-dropdown-select-disabled' : ''}`}
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
            handleKeyDown(e);
          }}
        >
          <span className="s-dropdown-selected-text">
            {selectedOption ? selectedOption.label : 'Select...'}
          </span>
          <div className={`s-dropdown-icon ${isOpen ? 's-dropdown-icon-open' : ''}`}>
            <ChevronDown size={18} />
          </div>
        </div>

        {isOpen && (
          <div className="s-dropdown-menu">
            {searchable && (
              <div className="s-dropdown-search-wrapper" onClick={(e) => e.stopPropagation()}>
                <Search size={14} className="s-dropdown-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="s-dropdown-search-input"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            )}
            
            <ul className="s-dropdown-list">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <li 
                    key={option.value}
                    className={`s-dropdown-list-item ${option.value === value ? 's-dropdown-list-item-selected' : ''}`}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                  </li>
                ))
              ) : (
                <li className="s-dropdown-no-results">No results found</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SDropdown;
