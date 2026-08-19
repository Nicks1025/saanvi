import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../store/NotificationProvider';
import NotificationDropdown from './NotificationDropdown';
import './notifications.css';

const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="notification-bell-btn"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" size={20} />
        
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default NotificationBell;
